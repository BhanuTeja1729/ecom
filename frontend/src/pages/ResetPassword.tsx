import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { authApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';

export function ResetPassword() {
  const { query, navigate } = useRouter();
  const token = query.get('token');
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordError = password && password.length < 6 ? 'Password must be at least 6 characters' : '';
  const matchError = confirmPassword && password !== confirmPassword ? 'Passwords do not match' : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      toast('Invalid or missing reset token', 'error');
      return;
    }

    if (password.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }

    if (password !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.resetPassword({ token, password });
      toast(res.message || 'Password reset successfully', 'success');
      setSuccess(true);
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (err: any) {
      toast(err.message || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Render missing token state ──
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-3">Invalid Link</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            This password reset link is invalid, expired, or missing its verification token. Please request a new link from the login page.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-4 bg-gray-900 hover:bg-amber-600 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Render success redirection state ──
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-3">Password Reset!</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Your password has been updated successfully. You will be redirected back to the login page shortly to sign in.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-600 animate-pulse">
            Redirecting in a few seconds...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left branding panel (keeps same layout as Auth page) */}
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
            Secure Your Account
          </h2>
          <p className="text-gray-400 leading-relaxed max-w-sm mx-auto">
            Choose a strong, unique password to protect your BLIPZO account and ensure a safe shopping experience.
          </p>
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

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Create new password</h1>
            <p className="text-gray-500">
              Your new password must be different from previously used passwords.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">New Password</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              {passwordError && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordError}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Confirm Password</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all bg-white">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {matchError && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {matchError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !!passwordError || !!matchError}
              className="w-full py-4 bg-gray-900 text-white font-bold text-base rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 group"
            >
              {loading ? 'Please wait...' : (
                <>
                  Reset Password
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Go back to{' '}
            <button
              onClick={() => navigate('/auth')}
              className="text-amber-600 font-bold hover:text-amber-700 transition-colors"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
