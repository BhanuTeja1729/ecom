import { useState } from 'react';
import { Eye, EyeOff, Zap, ArrowRight, Lock, Mail, User } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';

export function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();

  // ── Google OAuth flow ──────────────────────────────────────────────────────
  // Uses the implicit token flow: Google opens its account-picker popup,
  // the user picks an account (no password typed), Google returns an id_token
  // which we verify server-side and exchange for our own JWT.
  const loginWithGoogle = useGoogleLogin({
    flow: 'implicit',           // returns id_token directly in the browser
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        // Fetch the user's profile using the access token so we can get the id_token
        const profileRes = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo`,
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );
        const profile = await profileRes.json();

        // Send access_token + profile to our backend — backend verifies with Google
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/auth/google`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              credential: tokenResponse.access_token,
              profile,            // pass profile so backend can upsert without a 2nd call
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Google sign-in failed');

        const { error } = await signInWithGoogle(data.data.accessToken);
        if (error) {
          toast(error, 'error');
        } else {
          toast(`Welcome, ${profile.name || 'there'}! Signed in with Google.`, 'success');
          navigate('/dashboard');
        }
      } catch (err: any) {
        toast(err.message || 'Google sign-in failed', 'error');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => toast('Google sign-in was cancelled or failed', 'error'),
  });

  // ── Email / Password form ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        toast(error, 'error');
      } else {
        toast('Welcome back!', 'success');
        navigate('/dashboard');
      }
    } else {
      if (password.length < 6) {
        toast('Password must be at least 6 characters', 'error');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast(error, 'error');
      } else {
        toast('Account created! Welcome to Luxe.', 'success');
        navigate('/dashboard');
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=1000"
            alt="Luxe"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900/80 to-amber-900/20" />
        </div>
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-3xl font-black text-white tracking-tight">LUXE</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Premium Shopping,<br />Reimagined
          </h2>
          <p className="text-gray-400 leading-relaxed max-w-sm">
            Join 50,000+ members enjoying exclusive deals, early access to new products, and a world-class shopping experience.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { value: '50K+', label: 'Members' },
              { value: '4.9★', label: 'Rating' },
              { value: '500+', label: 'Products' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/10 rounded-2xl p-4">
                <p className="text-white font-black text-xl">{value}</p>
                <p className="text-gray-400 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Logo (mobile only) */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-black text-gray-900">LUXE</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-gray-500">
              {mode === 'login'
                ? 'Sign in to your account to continue'
                : 'Join us for exclusive access and deals'}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Create Account
            </button>
          </div>

          {/* ── Continue with Google ── */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold text-gray-700 text-sm shadow-sm disabled:opacity-60 mb-5"
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              /* Official Google 'G' logo colours */
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Connecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Full Name</label>
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all bg-white">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email Address</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all bg-white">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Password</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-white font-bold text-base rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 group"
            >
              {loading ? 'Please wait...' : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <button onClick={() => setMode('register')} className="text-amber-600 font-bold hover:text-amber-700 transition-colors">
                Sign up free
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p className="text-center text-xs text-gray-400 mt-6">
              By creating an account, you agree to our{' '}
              <button onClick={() => navigate('/terms')} className="text-amber-600 hover:underline">Terms</button>
              {' '}and{' '}
              <button onClick={() => navigate('/privacy')} className="text-amber-600 hover:underline">Privacy Policy</button>
            </p>
          )}

          <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <p className="text-xs text-amber-700 text-center">
              <span className="font-bold">New members get 10% off</span> their first order with code WELCOME10
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
