import { ArrowRight, Shield, Truck, RotateCcw, Star, Zap, ShoppingBag, Package, Users } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { Footer } from '../components/layout/Footer';

const FEATURES = [
  {
    icon: Shield,
    title: 'Secure & Trusted',
    desc: '256-bit SSL encryption on every transaction. Your data is always safe.',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    icon: Truck,
    title: 'Free Shipping',
    desc: 'Complimentary delivery on all orders over ₹999. Fast & reliable.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  {
    icon: RotateCcw,
    title: '7-Day Returns',
    desc: 'Not happy? Return anything within 7 days, no questions asked.',
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
  },
  {
    icon: Star,
    title: 'Premium Quality',
    desc: 'Every product is handpicked and quality-checked by our expert team.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
];

const STATS = [
  { icon: Users, value: '50K+', label: 'Happy Customers' },
  { icon: Package, value: '500+', label: 'Premium Products' },
  { icon: Star, value: '4.9★', label: 'Average Rating' },
  { icon: ShoppingBag, value: '99%', label: 'Satisfaction Rate' },
];

const TESTIMONIALS = [
  { name: 'Priya M.', text: 'Absolutely love the quality! Orders arrive fast throughout Jammu and everything looks premium.', rating: 5, avatar: 'PM' },
  { name: 'Rahul S.', text: 'Best shopping experience I\'ve had online. The product range is incredible.', rating: 5, avatar: 'RS' },
  { name: 'Ananya K.', text: 'Customer support is fantastic. Returns are so easy. Highly recommend!', rating: 5, avatar: 'AK' },
  { name: 'Vishal K.', text: 'Excellent quality and timely delivery. Since starting in 2026, Blipzo has become my go-to for premium products.', rating: 5, avatar: 'VK' },
  { name: 'Sanchit S.', text: 'Premium products and fast delivery. The customer service is top-notch!', rating: 5, avatar: 'SS' },
  { name: 'Saksham M.', text: 'Great collection of premium products with excellent customer service. Highly recommended!', rating: 5, avatar: 'SM' },
];

export function Landing() {
  const { navigate } = useRouter();
  const { user, loading } = useAuth();


  // Wait until auth finishes loading, then redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/shop');
    }
  }, [user, loading]);

  // Show a spinner while Auth0 is processing the callback
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-4">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm font-medium">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">BLIPZO</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-6 mr-2">
              <button
                onClick={() => navigate('/about')}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                About
              </button>
              {/* <button
                onClick={() => navigate('/about#contact')}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Contact
              </button> */}
            </div>
            <div className="flex items-center gap-3">
              {/* <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign In
              </button> */}
              <button
                onClick={() => navigate('/auth')}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950" />
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, rgba(245,158,11,0.3) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(99,102,241,0.2) 0%, transparent 50%)`
          }}
        />
        {/* Floating orbs */}
        <div className="absolute top-32 right-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-amber-400 text-sm font-semibold">Premium Shopping Experience</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
              Shop the
              <span className="block bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Future of
              </span>
              Luxury
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-lg">
              Discover 500+ curated premium products. From cutting-edge electronics to exclusive lifestyle items — all in one place, just for you.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                id="hero-cta-primary"
                onClick={() => navigate('/auth')}
                className="group flex items-center gap-2 px-8 py-4 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/30 text-lg"
              >
                Start Shopping
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2 px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-all text-lg backdrop-blur-sm"
              >
                Sign In
              </button>
            </div>
            {/* Social proof */}
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {['PM', 'RS', 'AK', 'VT'].map((a) => (
                  <div key={a} className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-gray-900 flex items-center justify-center text-xs font-bold text-white">
                    {a}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex text-amber-400 text-sm">★★★★★</div>
                <p className="text-gray-400 text-xs mt-0.5">Loved by 50,000+ customers</p>
              </div>
            </div>
          </div>

          {/* Right — visual card stack */}
          <div className="hidden lg:block relative">
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Card 1 */}
              <div className="absolute top-0 right-8 w-64 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl rotate-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-4">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <p className="text-white font-bold mb-1">New Order</p>
                <p className="text-gray-400 text-sm">Premium Headphones</p>
                <p className="text-amber-400 font-black text-xl mt-2">₹4,999</p>
              </div>
              {/* Card 2 */}
              <div className="absolute bottom-8 left-0 w-72 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl -rotate-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Order Delivered!</p>
                    <p className="text-gray-400 text-xs">2 hours ago</p>
                  </div>
                </div>
                <div className="flex text-amber-400">★★★★★</div>
                <p className="text-gray-300 text-sm mt-2">"Absolutely love it!"</p>
              </div>
              {/* Center badge */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex flex-col items-center justify-center shadow-2xl shadow-amber-500/40">
                  <ShoppingBag className="w-10 h-10 text-white mb-2" />
                  <p className="text-white font-black text-lg">500+</p>
                  <p className="text-amber-100 text-xs">Products</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-10 bg-amber-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <Icon className="w-6 h-6 text-white/80" />
                <p className="text-3xl font-black text-white">{value}</p>
                <p className="text-amber-100 text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Why Choose BLIPZO?</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">We've built the shopping experience you deserve — premium, secure, and effortless.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, bg, text }) => (
              <div key={title} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all group">
                <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 ${text}`} />
                </div>
                <h3 className="font-black text-gray-900 mb-2 text-lg">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <style>{`
          @keyframes marquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-100%);
            }
          }
          .animate-marquee {
            display: flex;
            flex-shrink: 0;
            gap: 1.5rem;
            padding-right: 1.5rem;
            animation: marquee 35s linear infinite;
          }
          .marquee-container:hover .animate-marquee {
            animation-play-state: paused;
          }
        `}</style>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-gray-500 text-lg">Real reviews from real shoppers.</p>
          </div>

          <div className="relative w-full overflow-hidden flex marquee-container py-4">
            <div className="animate-marquee">
              {TESTIMONIALS.map(({ name, text, avatar }) => (
                <div
                  key={name}
                  className="w-[300px] sm:w-[380px] flex-shrink-0 bg-gradient-to-tr from-gray-50 to-white rounded-3xl p-8 border border-gray-100 hover:border-amber-200/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex text-amber-400 mb-4">★★★★★</div>
                    <p className="text-gray-700 leading-relaxed mb-6 text-sm italic">"{text}"</p>
                  </div>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-black shadow-md shadow-amber-500/25">
                      {avatar}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{name}</p>
                      <p className="text-gray-400 text-xs font-medium">Verified Buyer</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="animate-marquee" aria-hidden="true">
              {TESTIMONIALS.map(({ name, text, avatar }, index) => (
                <div
                  key={`${name}-dup-${index}`}
                  className="w-[300px] sm:w-[380px] flex-shrink-0 bg-gradient-to-tr from-gray-50 to-white rounded-3xl p-8 border border-gray-100 hover:border-amber-200/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex text-amber-400 mb-4">★★★★★</div>
                    <p className="text-gray-700 leading-relaxed mb-6 text-sm italic">"{text}"</p>
                  </div>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-black shadow-md shadow-amber-500/25">
                      {avatar}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{name}</p>
                      <p className="text-gray-400 text-xs font-medium">Verified Buyer</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-semibold">Limited Time Offer</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Get 10% Off Your First Order
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Sign up today and use code <span className="text-amber-400 font-bold">WELCOME10</span> at checkout.
          </p>
          <button
            id="cta-signup-btn"
            onClick={() => navigate('/auth')}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-amber-500 text-white font-black rounded-2xl text-lg hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/30"
          >
            Create Account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-gray-500 text-sm mt-4">No credit card required. Join 50,000+ happy customers.</p>
        </div>
      </section>

      <Footer />

    </div>
  );
}
