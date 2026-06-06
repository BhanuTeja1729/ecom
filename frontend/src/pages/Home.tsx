import { Shield, Truck, RotateCcw, Phone, Flame, TrendingUp, ArrowRight } from 'lucide-react';
import { Hero } from '../components/home/Hero';
import { Categories } from '../components/home/Categories';
import { FeaturedProducts } from '../components/home/FeaturedProducts';
import { Testimonials } from '../components/home/Testimonials';
import { Newsletter } from '../components/home/Newsletter';
import { useRouter } from '../lib/router';

const TRUST_FEATURES = [
  { icon: Shield, title: 'Secure Checkout', desc: '256-bit SSL encryption on all transactions' },
  { icon: Truck, title: 'Free Shipping', desc: 'Complimentary shipping on orders over $75' },
  { icon: RotateCcw, title: '7-Day Returns', desc: 'Hassle-free returns, no questions asked' },
  { icon: Phone, title: '24/7 Support', desc: 'World-class customer support always available' },
];

const STATS = [
  { value: '600+', label: 'Happy Customers' },
  { value: '4.9', label: 'Average Rating' },
  { value: '500+', label: 'Premium Products' },
  { value: '99%', label: 'Satisfaction Rate' },
];

export function Home() {
  const { navigate } = useRouter();

  return (
    <main>
      <Hero />

      {/* Stats bar */}
      <section className="py-8 bg-amber-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black text-white">{value}</div>
                <div className="text-amber-100 text-sm font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Categories />
      <FeaturedProducts />

      {/* Promo Banner */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flash Sale */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-orange-500 p-8 lg:p-10">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -right-5 top-20 w-20 h-20 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-white" />
                  <span className="text-white font-bold text-sm uppercase tracking-wider">Flash Sale</span>
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Up to 40% Off</h3>
                <p className="text-white/80 mb-6">Limited time deals on premium electronics and accessories. Don't miss out.</p>
                <button
                  onClick={() => navigate('/shop')}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors group"
                >
                  Shop Sale
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* New Arrivals */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-700 p-8 lg:p-10 border border-gray-600">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">New Arrivals</span>
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Just Dropped</h3>
                <p className="text-gray-400 mb-6">The latest additions to our curated collection. Be the first to explore.</p>
                <button
                  onClick={() => navigate('/shop')}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-colors group"
                >
                  Explore Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust features */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {TRUST_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />
      <Newsletter />
    </main>
  );
}
