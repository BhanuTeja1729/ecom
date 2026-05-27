import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, setAccessToken, getAccessToken, type UserData } from '../lib/api';

interface AuthContextValue {
  user: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (credential: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const res = await authApi.me();
      const userData = res.data;
      setUser({ ...userData, id: userData._id || userData.id });
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    // Restore session from stored token
    const token = getAccessToken();
    if (token) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const res = await authApi.login({ email, password });
      setAccessToken(res.data.accessToken);
      const userData = res.data.user;
      setUser({ ...userData, id: (userData as any)._id || userData.id });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      const res = await authApi.register({ email, password, fullName });
      setAccessToken(res.data.accessToken);
      const userData = res.data.user;
      setUser({ ...userData, id: (userData as any)._id || userData.id });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  }

  async function signInWithGoogle(accessToken: string) {
    try {
      setAccessToken(accessToken);
      // Fetch the user profile using our own /me endpoint
      const res = await authApi.me();
      const userData = res.data;
      setUser({ ...userData, id: userData._id || userData.id });
      return { error: null };
    } catch (err: any) {
      setAccessToken(null);
      return { error: err.message || 'Google sign-in failed' };
    }
  }

  async function signOut() {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  }

  async function refreshUser() {
    await fetchMe();
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
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
