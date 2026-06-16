import { Instagram, Twitter, Facebook, Youtube, Mail, Phone, MapPin, Zap } from 'lucide-react';
import { Link } from '../../lib/router';

const LINKS = {
  Support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact Us', href: '/about#contact' },
    { label: 'Order Tracking', href: '/order-tracking' },
    { label: 'Returns & Refunds', href: '/faq' },
    { label: 'Shipping Info', href: '/faq' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms & Conditions', href: '/terms' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">BLIPZO</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-xs">
              BLIPZO Innovations Pvt. Ltd. — Premium products curated for the discerning customer. Quality, style, and innovation delivered to your door.
            </p>
            <div className="flex flex-col gap-3">
              <a href="mailto:2804blipzoinnovationptv@gmail.com" className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-amber-400 transition-colors">
                <Mail className="w-4 h-4" />
                2804blipzoinnovationptv@gmail.com
              </a>
              <a href="tel:+917006464761" className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-amber-400 transition-colors">
                <Phone className="w-4 h-4" />
                +91 7006464761, +91 8899590378
              </a>
              <span className="flex items-center gap-2.5 text-sm text-gray-400">
                <MapPin className="w-4 h-4 shrink-0" />
                Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, J&K – 180005
              </span>
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">{title}</h4>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={`${link.href}-${link.label}`}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-400 hover:text-amber-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} BLIPZO Innovations Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
