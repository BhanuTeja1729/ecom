import { ArrowRight, Play, Shield, Truck, Star } from 'lucide-react';
import { useRouter } from '../../lib/router';

export function Hero() {
  const { navigate } = useRouter();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gray-950">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.pexels.com/photos/3785927/pexels-photo-3785927.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Hero"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/70 to-transparent" />
      </div>

      {/* Floating shapes */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full mb-8">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-amber-400 text-sm font-semibold">Trusted by 50,000+ customers</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Curated for the
            <span className="block text-amber-400">Exceptional</span>
          </h1>

          <p className="text-xl text-gray-300 leading-relaxed mb-10 max-w-xl">
            Premium products engineered for those who demand the best. From cutting-edge tech to timeless style — discover your next obsession.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <button
              onClick={() => navigate('/shop')}
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 text-white font-bold text-lg rounded-2xl hover:bg-amber-400 transition-all hover:gap-3 shadow-2xl shadow-amber-500/30"
            >
              Shop Now
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate('/about')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-all border border-white/20"
            >
              <Play className="w-5 h-5 fill-white" />
              Our Story
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-col sm:flex-row gap-6">
            {[
              { icon: Shield, label: 'Secure Payments', sub: '256-bit SSL encryption' },
              { icon: Truck, label: 'Free Shipping', sub: 'On orders over $75' },
              { icon: Star, label: '4.9 Rating', sub: '50k+ reviews' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-gray-400 text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-gray-500 text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent" />
      </div>
    </section>
  );
}
