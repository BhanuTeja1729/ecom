import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    role: 'Creative Director',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: 'The ProAir headphones are absolutely incredible. The sound quality is unmatched, and the noise cancellation lets me focus completely. Easily worth every penny.',
    product: 'ProAir Wireless Headphones',
  },
  {
    name: 'James Chen',
    role: 'Software Engineer',
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: 'The LightBook Air is exactly what I needed. Blazing fast, incredibly light, and the OLED screen is stunning. My productivity has doubled since switching.',
    product: 'LightBook Air 15',
  },
  {
    name: 'Priya Sharma',
    role: 'Fitness Coach',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: 'The Apex Runner Pro is a game changer. I knocked 4 minutes off my marathon time in my first race wearing them. The carbon plate really makes a difference.',
    product: 'Apex Runner Pro',
  },
  {
    name: 'Marcus Thompson',
    role: 'Entrepreneur',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: 'Ordered the Nomad Backpack and it arrived beautifully packaged. The leather quality is exceptional. I get compliments everywhere I go. Worth every cent.',
    product: 'Nomad Leather Backpack',
  },
  {
    name: 'Emma Wilson',
    role: 'Beauty Editor',
    avatar: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: 'The Vita Glow Serum transformed my skin in just 4 weeks. Dark spots are visibly reduced and my skin has never looked more radiant. A staple in my routine.',
    product: 'Vita Glow Serum',
  },
  {
    name: 'David Park',
    role: 'Product Designer',
    avatar: 'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=150',
    rating: 5,
    text: 'The marble desk set is stunning. The quality exceeds the price point. Customer service was exceptional when I had a question about shipping. 10/10.',
    product: 'Marble Executive Desk Set',
  },
];

export function Testimonials() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-2">Social Proof</p>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">What Our Customers Say</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Over 600+ satisfied customers and counting. Here's what they have to say about their BLIPZO experience.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className="w-5 h-5 text-amber-400 fill-amber-400" />
            ))}
            <span className="ml-2 font-bold text-gray-900">4.9/5</span>
            <span className="text-gray-500 text-sm">from 1000+ reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <Quote className="w-8 h-8 text-amber-400 fill-amber-400/20" />
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 group-hover:bg-amber-100 transition-colors">
                  Verified
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">Purchased: {t.product}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
