import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { authApi, setAccessToken, getAccessToken, type UserData } from '../lib/api';

interface AuthContextValue {
  user: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string, loginRole?: 'customer' | 'delivery_partner') => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: 'customer' | 'delivery_partner') => Promise<{ error: string | null }>;
  signInWithAuth0: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const { isAuthenticated, user: auth0User, isLoading: auth0Loading, getAccessTokenSilently, loginWithRedirect, logout: auth0Logout } = useAuth0();

  // Combined effect to restore session and handle Auth0 token exchange
  useEffect(() => {
    // 1. If Auth0 is still loading its state, keep loading = true
    if (auth0Loading) {
      return;
    }

    async function initializeAuth() {
      try {
        // 2. If Auth0 has authenticated the user, exchange it for our local backend JWT
        if (isAuthenticated && auth0User) {
          if (!user || user.email !== auth0User.email) {
            setLoading(true);
            const token = await getAccessTokenSilently();
            const res = await authApi.auth0Auth(token);
            setAccessToken(res.data.accessToken);
            const userData = res.data.user;
            setUser({ ...userData, id: userData._id || userData.id });
          }
          return;
        }

        // 3. Otherwise, check if we have a local token already stored
        const token = getAccessToken();
        if (token) {
          try {
            const res = await authApi.me();
            const userData = res.data;
            setUser({ ...userData, id: userData._id || userData.id });
          } catch {
            setAccessToken(null);
            setUser(null);
          }
        } else {
          // If we had an auth0Id but now are no longer authenticated in Auth0, clear it
          if (user && user.auth0Id) {
            setAccessToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Authentication initialization failed:', err);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();
  }, [isAuthenticated, auth0User, auth0Loading]);

  async function signIn(email: string, password: string, loginRole?: 'customer' | 'delivery_partner') {
    try {
      const res = await authApi.login({ email, password, loginRole });
      setAccessToken(res.data.accessToken);
      const userData = res.data.user;
      setUser({ ...userData, id: (userData as any)._id || userData.id });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  }

  async function signUp(email: string, password: string, fullName: string, role?: 'customer' | 'delivery_partner') {
    try {
      const res = await authApi.register({ email, password, fullName, role });
      setAccessToken(res.data.accessToken);
      const userData = res.data.user;
      setUser({ ...userData, id: (userData as any)._id || userData.id });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  }

  async function signInWithAuth0() {
    await loginWithRedirect();
  }

  async function signInWithGoogle() {
    await loginWithRedirect({
      authorizationParams: { connection: 'google-oauth2' },
    });
  }

  async function signOut() {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    // Clear localStorage token immediately
    localStorage.removeItem('accessToken');
    if (isAuthenticated) {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    } else {
      // Hard redirect BEFORE clearing React state — prevents ProtectedRoute
      // from seeing user===null and flashing /auth before the redirect completes
      window.location.replace('/');
    }
  }

  async function refreshUser() {
    try {
      const res = await authApi.me();
      const userData = res.data;
      setUser({ ...userData, id: userData._id || userData.id });
    } catch {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signInWithAuth0,
      signInWithGoogle,
      signOut,
      isAdmin: user?.role === 'admin',
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
