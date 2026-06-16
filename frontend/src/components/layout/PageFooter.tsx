import { Mail, Phone, MapPin, Zap } from 'lucide-react';
import { Link, useRouter } from '../../lib/router';

const USEFUL_LINKS = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Order Tracking', href: '/order-tracking' },
  { label: 'Returns & Refunds', href: '/faq' },
  { label: 'Shipping Info', href: '/faq' },
  { label: 'About Us', href: '/about' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
];

const FOOTER_CATEGORIES = [
  'Atta, Rice & Dal',
  'Bakery Biscuits',
  'Cleaning Essentials',
  'Cold Drinks & Juices',
  'Dairy, Bread & Eggs',
  'Fruits & Vegetables',
  'Masala, Oil & More',
  'Pharma & Wellness',
  'Sauces & Spreads',
  'Snacks & Munchies',
  'Sweet Tooth',
  'Tea, Coffee & Health Drink',
];

export function PageFooter() {
  const { navigate } = useRouter();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand + Contact */}
          <div>
            <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="text-lg font-black text-gray-900">BLIPZO</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-xs">
              Premium products curated for the discerning customer. Quality, style, and innovation delivered to your door.
            </p>
            <div className="space-y-2">
              <a href="mailto:2804blipzoinnovationptv@gmail.com" className="flex items-center gap-2 text-xs text-gray-500 hover:text-amber-600 transition-colors">
                <Mail className="w-3.5 h-3.5 shrink-0" /> 2804blipzoinnovationptv@gmail.com
              </a>
              <a href="tel:+917006464761" className="flex items-center gap-2 text-xs text-gray-500 hover:text-amber-600 transition-colors">
                <Phone className="w-3.5 h-3.5 shrink-0" /> +91 7006464761, +91 8899590378
              </a>
              <span className="flex items-start gap-2 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, J&K – 180005
              </span>
            </div>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Useful Links</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {USEFUL_LINKS.map(link => (
                <Link
                  key={link.href + link.label}
                  to={link.href}
                  className="text-sm text-gray-500 hover:text-amber-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Categories</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {FOOTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => navigate('/')}
                  className="text-sm text-gray-500 hover:text-amber-600 transition-colors text-left"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} BLIPZO Innovations Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link to="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-600 transition-colors">Terms & Conditions</Link>
            <Link to="/contact" className="hover:text-gray-600 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
