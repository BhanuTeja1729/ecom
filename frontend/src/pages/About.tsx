import { useRouter } from '../lib/router';
import { ArrowRight, Award, Globe, Leaf, Users } from 'lucide-react';

const TEAM = [
  { name: 'Alexandra Reid', role: 'Founder & CEO', img: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=300' },
  { name: 'Marcus Chen', role: 'Head of Product', img: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=300' },
  { name: 'Sophie Laurent', role: 'Creative Director', img: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300' },
  { name: 'David Okonkwo', role: 'Head of Operations', img: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=300' },
];

const VALUES = [
  { icon: Award, title: 'Uncompromising Quality', desc: 'Every product in our catalog is rigorously tested and meets our exacting standards. We never compromise.' },
  { icon: Leaf, title: 'Sustainability First', desc: 'We partner with brands committed to ethical sourcing, sustainable materials, and reducing environmental impact.' },
  { icon: Globe, title: 'Global Curation', desc: 'Our buyers travel the world to discover the finest products from artisans, innovators, and industry leaders.' },
  { icon: Users, title: 'Community Driven', desc: 'Every decision we make starts with our community. Customer feedback shapes our catalog and policies.' },
];

export function About() {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="relative h-96 flex items-center justify-center overflow-hidden">
        <img
          src="https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="About Luxe"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-950/70" />
        <div className="relative text-center px-4">
          <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">Our Story</p>
          <h1 className="text-5xl font-black text-white mb-4">Built for the Exceptional</h1>
          <p className="text-gray-300 max-w-lg mx-auto">A premium marketplace founded on the belief that extraordinary products deserve an extraordinary home.</p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">Our Mission</p>
              <h2 className="text-4xl font-black text-gray-900 mb-6">Curating the World's Best Products</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Founded in 2020, Luxe was born from a simple frustration: finding truly exceptional products shouldn't require hours of research and hoping for the best.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                We built the marketplace we wished existed — one where every product has been personally vetted by experts who care as much about quality as you do. Our curation team tests hundreds of products monthly, and only the top 5% make it to our shelves.
              </p>
              <button onClick={() => navigate('/shop')} className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors group">
                Shop Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Our team"
                className="w-full h-96 object-cover rounded-3xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-amber-500 rounded-2xl p-6 shadow-xl">
                <p className="text-white font-black text-3xl">50K+</p>
                <p className="text-amber-100 text-sm">Happy Customers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">What We Stand For</p>
            <h2 className="text-4xl font-black text-gray-900">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">The People</p>
            <h2 className="text-4xl font-black text-gray-900">Meet Our Team</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TEAM.map(({ name, role, img }) => (
              <div key={name} className="group text-center">
                <div className="relative mb-4 overflow-hidden rounded-2xl aspect-square">
                  <img src={img} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="font-bold text-gray-900">{name}</h3>
                <p className="text-sm text-amber-600">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '2020', label: 'Founded' },
              { value: '500+', label: 'Products' },
              { value: '50K+', label: 'Customers' },
              { value: '45+', label: 'Countries' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-4xl font-black text-amber-400 mb-1">{value}</p>
                <p className="text-gray-400 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
