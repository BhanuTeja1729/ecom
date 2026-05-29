import { useRouter } from '../lib/router';
import { ArrowRight, Award, Globe, Leaf, Users, Zap, Building2, FileText, MapPin, Calendar } from 'lucide-react';

const TEAM = [
  { name: 'Sanchit Sawhney', role: 'Director', location: 'Jammu & Kashmir' },
  { name: 'Salamat Bhatti', role: 'Director', location: 'Jammu & Kashmir' },
];

const VALUES = [
  { icon: Award, title: 'Uncompromising Quality', desc: 'Every product in our catalog is rigorously tested and meets our exacting standards. We never compromise.' },
  { icon: Leaf, title: 'Sustainability First', desc: 'We partner with brands committed to ethical sourcing, sustainable materials, and reducing environmental impact.' },
  { icon: Globe, title: 'Global Curation', desc: 'Our buyers discover the finest products from artisans, innovators, and industry leaders worldwide.' },
  { icon: Users, title: 'Community Driven', desc: 'Every decision we make starts with our community. Customer feedback shapes our catalog and policies.' },
];

const COMPANY_DETAILS = [
  { icon: Building2, label: 'Legal Name', value: 'BLIPZO INNOVATIONS PRIVATE LIMITED' },
  { icon: FileText, label: 'CIN', value: 'U52109JK2026PTC019140' },
  { icon: Calendar, label: 'Date of Incorporation', value: 'April 27, 2026' },
  { icon: MapPin, label: 'Registered Address', value: 'M/S Aligarh Traders, Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, J&K, India – 180005' },
];

export function About() {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">BLIPZO</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-6 mr-2">
              <button
                onClick={() => navigate('/about')}
                className="text-sm font-semibold text-amber-600 transition-colors"
              >
                About
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Contact
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-96 flex items-center justify-center overflow-hidden pt-16">
        <img
          src="https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="About BLIPZO"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-950/70" />
        <div className="relative text-center px-4">
          <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">Our Story</p>
          <h1 className="text-5xl font-black text-white mb-4">BLIPZO Innovations</h1>
          <p className="text-gray-300 max-w-lg mx-auto">A Private Limited Company incorporated in India, bringing innovation and quality to e-commerce.</p>
        </div>
      </section>

      {/* About Company */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">About Us</p>
              <h2 className="text-4xl font-black text-gray-900 mb-6">Who We Are</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                BLIPZO INNOVATIONS PRIVATE LIMITED is a Private Limited Company incorporated on April 27, 2026 in India. It is registered at the Registrar of Companies, ROC Jammu. Our corporate identification number (CIN) is U52109JK2026PTC019140 and our current status is <span className="text-emerald-600 font-semibold">Active</span>.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our registered address is M/S Aligarh Traders, Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, Jammu & Kashmir, India, 180005. We are a company built on innovation, trust, and the belief that exceptional products deserve an exceptional marketplace.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                BLIPZO INNOVATIONS PRIVATE LIMITED has an authorised share capital of ₹15,00,000 and a paid-up capital of ₹1,00,000. The company is led by directors Sanchit Sawhney and Salamat Bhatti.
              </p>
              <button onClick={() => navigate('/shop')} className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors group">
                Shop Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div>
              {/* Company Details Card */}
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 mb-6">Company Details</h3>
                <div className="space-y-5">
                  {COMPANY_DETAILS.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex gap-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</p>
                      <p className="text-sm font-semibold text-emerald-600 mt-0.5">Active</p>
                    </div>
                  </div>
                </div>
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

      {/* Team / Directors */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">Leadership</p>
            <h2 className="text-4xl font-black text-gray-900">Board of Directors</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {TEAM.map(({ name, role, location }) => (
              <div key={name} className="group text-center bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:border-amber-200 transition-colors">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <span className="text-2xl font-black text-white">{name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{name}</h3>
                <p className="text-sm text-amber-600 font-semibold mt-1">{role}</p>
                <p className="text-xs text-gray-400 mt-1">📍 {location}</p>
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
              { value: '2026', label: 'Founded' },
              { value: 'Active', label: 'Company Status' },
              { value: 'ROC Jammu', label: 'Registrar' },
              { value: 'India', label: 'Headquarters' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-4xl font-black text-amber-400 mb-1">{value}</p>
                <p className="text-gray-400 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-white font-black tracking-tight">BLIPZO</span>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} BLIPZO Innovations Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-300 transition-colors">Privacy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-gray-300 transition-colors">Terms</button>
            <button onClick={() => navigate('/contact')} className="hover:text-gray-300 transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
