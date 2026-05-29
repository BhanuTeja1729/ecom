import { useState } from 'react';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      await api.post('/email/newsletter', { email: email.trim() });
      setStatus('success');
      setEmail('');
    } catch {
      // Already subscribed or server error — show success anyway for UX
      setStatus('success');
      setEmail('');
    }
  }

  return (
    <section className="py-24 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-10 lg:p-16">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />

          <div className="relative flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full mb-6">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 text-sm font-semibold">Get 10% Off Your First Order</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-4">
                Join the BLIPZO Community
              </h2>
              <p className="text-gray-400 leading-relaxed max-w-md">
                Subscribe for exclusive early access, member-only deals, curated picks, and insider content delivered to your inbox.
              </p>
            </div>

            <div className="w-full lg:w-auto lg:min-w-[420px]">
              {status === 'success' ? (
                <div className="flex flex-col items-center gap-3 p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                  <p className="text-white font-bold text-lg">You're in!</p>
                  <p className="text-gray-400 text-sm text-center">Check your email for your exclusive 10% discount code.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 focus-within:border-amber-500/50 transition-colors">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="flex-1 py-3.5 bg-transparent text-white placeholder-gray-400 text-sm outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60 shrink-0 group"
                  >
                    {status === 'loading' ? 'Subscribing...' : (
                      <>
                        Subscribe
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}
              {status === 'error' && (
                <p className="text-red-400 text-xs mt-2">Something went wrong. Please try again.</p>
              )}
              <p className="text-gray-500 text-xs mt-3 text-center lg:text-left">
                No spam, ever. Unsubscribe anytime. By subscribing you agree to our Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
