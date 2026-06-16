import { useRouter } from '../lib/router';
import { ArrowRight, Building2, FileText, MapPin, Calendar } from 'lucide-react';
import { PageFooter } from '../components/layout/PageFooter';

// BLIPZO office coordinates — Dogra Hall, Rehari Mohalla, Jammu
const OFFICE_LOCATION: [number, number] = [30.6667687, 76.8115209];

const TEAM = [
  { name: 'Sanchit Sawhney', role: 'Director', location: 'Jammu & Kashmir' },
  { name: 'Salamat Bhatti', role: 'Director', location: 'Jammu & Kashmir' },
];

const COMPANY_DETAILS = [
  { icon: Building2, label: 'Legal Name', value: 'BLIPZO INNOVATIONS PRIVATE LIMITED' },
  { icon: FileText, label: 'CIN', value: 'U52109JK2026PTC019140' },
  { icon: FileText, label: 'GSTIN', value: '01AAOCB6938R1ZZ' },
  { icon: Calendar, label: 'Date of Incorporation', value: 'April 27, 2026' },
  { icon: MapPin, label: 'Registered Office', value: 'M/S Aligarh Traders, Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, J&K, India – 180005' },
];

export function About() {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden pt-20">
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
              <h2 className="text-4xl font-black text-gray-900 mb-6">Who We Are & What We Do</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                BLIPZO INNOVATIONS PRIVATE LIMITED is a Private Limited Company incorporated on April 27, 2026, registered with the Registrar of Companies (ROC Jammu) in India. Our corporate identification number (CIN) is U52109JK2026PTC019140. We are a customer-centric quick commerce platform bringing everyday convenience and premium quality right to your doorstep.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                We specialize in providing and delivering a wide variety of daily essentials, including fresh fruits & vegetables, dairy products, bakery items, cooking staples (atta, rice, dal), spices, oils, cold beverages, quick snacks, health products, sweets, and household cleaning essentials. Our mission is to combine cutting-edge technology with high-quality inventory to deliver an unparalleled online shopping experience.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                To guarantee lightning-fast fulfillment and maintain absolute freshness, our delivery zone is focused within a <strong>12 km radius</strong> of our main inventory hub in <strong>Jammu, India</strong>.
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

      <PageFooter />
    </div>
  );
}

