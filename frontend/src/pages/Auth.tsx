import { useState, useEffect } from 'react';
import { Eye, EyeOff, Zap, ArrowRight, Lock, Mail, User, Truck } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { authApi } from '../lib/api';

export function Auth() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [role, setRole] = useState<'customer' | 'delivery_partner'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);

  const { isLoading: auth0Loading } = useAuth0();
  const { signIn, sendOtp, verifyOtp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();


  async function handleGoogleLogin() {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast(err.message || 'Google sign-in failed', 'error');
    }
  }

  // ── Email / Password form ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === 'forgot-password') {
      try {
        const res = await authApi.forgotPassword(email);
        toast(res.message || 'Password reset link sent to your email', 'success');
        setMode('login');
      } catch (err: any) {
        toast(err.message || 'Failed to send password reset email', 'error');
      }
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const { error } = await signIn(email, password, role);
      if (error) {
        toast(error, 'error');
      } else {
        toast('Welcome back!', 'success');
        navigate(role === 'delivery_partner' ? '/delivery' : '/shop');
      }
    } else {
      // mode === 'register'
      if (password.length < 6) {
        toast('Password must be at least 6 characters', 'error');
        setLoading(false);
        return;
      }

      const { error } = await sendOtp(email, fullName, password, role);
      if (error) {
        toast(error, 'error');
      } else {
        toast('OTP sent to your email', 'success');
        setOtpSent(true);
        startResendCooldown();
      }
    }
    setLoading(false);
  }

  function startResendCooldown() {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      toast('Please enter the 6-digit code', 'error');
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(email, otpCode, fullName, password, role);
    if (error) {
      toast(error, 'error');
      setLoading(false);
    } else {
      toast('Account created! Welcome to BLIPZO.', 'success');
      navigate(role === 'delivery_partner' ? '/delivery' : '/shop');
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setLoading(true);
    const { error } = await sendOtp(email, fullName, password, role);
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast('OTP resent to your email', 'success');
      startResendCooldown();
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Auto-advance
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        prevInput?.focus();
        const newOtp = [...otpValues];
        newOtp[index - 1] = '';
        setOtpValues(newOtp);
      } else {
        const newOtp = [...otpValues];
        newOtp[index] = '';
        setOtpValues(newOtp);
      }
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtpValues(digits);
      const lastInput = document.getElementById('otp-input-5');
      lastInput?.focus();
    }
  }

  useEffect(() => {
    setOtpSent(false);
    setOtpValues(Array(6).fill(''));
  }, [mode]);

  useEffect(() => {
    if (otpSent) {
      setTimeout(() => {
        const firstInput = document.getElementById('otp-input-0');
        firstInput?.focus();
      }, 100);
    }
  }, [otpSent]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=1000"
            alt="BLIPZO"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900/80 to-amber-900/20" />
        </div>
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-3xl font-black text-white tracking-tight">BLIPZO</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Premium Shopping,<br />Reimagined
          </h2>
          <p className="text-gray-400 leading-relaxed max-w-sm">
            Join 600+ members enjoying exclusive deals, early access to new products, and a world-class shopping experience.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-10">
            {[
              { value: '600+', label: 'Members' },
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
            <span className="text-xl font-black text-gray-900">BLIPZO</span>
          </div>

          {mode === 'register' && otpSent ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpValues(Array(6).fill(''));
                  }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                  Step 2 of 2
                </span>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-3xl font-black text-gray-900 mb-2">Verify email</h1>
                <p className="text-sm text-gray-500">
                  We've sent a 6-digit code to <span className="font-semibold text-gray-800">{email}</span>. Please enter it below.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex justify-between gap-2.5 my-8">
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={idx === 0 ? handleOtpPaste : undefined}
                      className="w-12 h-14 text-center text-xl font-bold border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl outline-none bg-white transition-all shadow-sm"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otpValues.join('').length < 6}
                  className="w-full py-4 bg-gray-900 text-white font-bold text-base rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 group shadow-lg shadow-gray-900/10 hover:shadow-amber-600/20"
                >
                  {loading ? 'Verifying...' : (
                    <>
                      Verify &amp; Create Account
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="text-center mt-6">
                  <p className="text-sm text-gray-500">
                    Didn't receive the code?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || loading}
                      className="text-amber-600 font-bold hover:text-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </p>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 mb-2">
                  {mode === 'forgot-password' ? 'Reset your password' : mode === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p className="text-gray-500">
                  {mode === 'forgot-password'
                    ? "Enter your email address and we'll send you a link to reset your password"
                    : mode === 'login'
                      ? 'Sign in to your account to continue'
                      : 'Join us for exclusive access and deals'}
                </p>
              </div>

              {/* ── Google Sign-In (hidden for delivery partners) ── */}
              {role === 'customer' && mode !== 'forgot-password' && (
                <>
                  <button
                    id="google-signin-btn"
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={auth0Loading}
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all font-semibold text-gray-700 text-sm shadow-sm disabled:opacity-60 mb-5"
                  >
                    {auth0Loading ? (
                      <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Continue with Google
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">or continue with email</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </>
              )}

              {/* Role tabs */}
              {mode !== 'forgot-password' && (
                <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
                  <button
                    onClick={() => setRole('customer')}
                    type="button"
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${role === 'customer' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <User className="w-4 h-4" />
                    Customer
                  </button>
                  <button
                    onClick={() => setRole('delivery_partner')}
                    type="button"
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${role === 'delivery_partner' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Truck className="w-4 h-4" />
                    Delivery Partner
                  </button>
                </div>
              )}

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

                {mode !== 'forgot-password' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-sm font-semibold text-gray-700 block">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot-password')}
                          className="text-xs text-amber-600 font-bold hover:text-amber-700 transition-colors"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all bg-white">
                      <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
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
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gray-900 text-white font-bold text-base rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 group"
                >
                  {loading ? 'Please wait...' : (
                    <>
                      {mode === 'forgot-password' ? 'Send Reset Link' : mode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {mode === 'forgot-password' ? (
                <p className="text-center text-sm text-gray-500 mt-6">
                  Remember your password?{' '}
                  <button onClick={() => setMode('login')} className="text-amber-600 font-bold hover:text-amber-700 transition-colors">
                    Sign in
                  </button>
                </p>
              ) : mode === 'login' ? (
                <p className="text-center text-sm text-gray-500 mt-6">
                  Don't have an account?{' '}
                  <button onClick={() => setMode('register')} className="text-amber-600 font-bold hover:text-amber-700 transition-colors">
                    Sign up free
                  </button>
                </p>
              ) : (
                <>
                  <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account?{' '}
                    <button onClick={() => setMode('login')} className="text-amber-600 font-bold hover:text-amber-700 transition-colors">
                      Sign in
                    </button>
                  </p>
                  <p className="text-center text-xs text-gray-400 mt-3">
                    By creating an account, you agree to our{' '}
                    <button onClick={() => navigate('/terms')} className="text-amber-600 hover:underline">Terms</button>
                    {' '}and{' '}
                    <button onClick={() => navigate('/privacy')} className="text-amber-600 hover:underline">Privacy Policy</button>
                  </p>
                </>
              )}
            </>
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
