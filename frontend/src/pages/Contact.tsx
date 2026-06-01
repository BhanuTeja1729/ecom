import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, Zap } from 'lucide-react';
import { useRouter } from '../lib/router';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icon (amber/gold themed)
const customIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// BLIPZO office coordinates — Dogra Hall, Rehari Mohalla, Jammu
const OFFICE_LOCATION: [number, number] = [32.7304691, 74.8194695];

export function Contact() {
  const { navigate } = useRouter();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready for Leaflet
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setTimeout(() => { setStatus('success'); setForm({ name: '', email: '', subject: '', message: '' }); }, 1500);
  }

  const CONTACT_INFO = [
    { icon: Mail, title: 'Email', value: '2804blipzoinnovationptv@gmail.com', sub: 'We reply within 24 hours' },
    { icon: Phone, title: 'Phone', value: '+91 7006464761, 8899590378', sub: 'Mon-Sat, 10am-6pm IST' },
    { icon: MapPin, title: 'Registered Address', value: 'M/S Aligarh Traders, Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, J&K – 180005', sub: 'Headquarters' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
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
            <div className="flex items-center gap-6 mr-2">
              <button
                onClick={() => navigate('/about')}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                About
              </button>
              {/* <button
                onClick={() => navigate('/contact')}
                className="text-sm font-semibold text-amber-600 transition-colors"
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

      {/* Hero */}
      <div className="bg-gray-950 py-16 pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">Get In Touch</p>
          <h1 className="text-5xl font-black text-white mb-4">Contact BLIPZO</h1>
          <p className="text-gray-400 max-w-md mx-auto">Have questions or need assistance? Our team is here to help. Reach out to us anytime.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact info + Map */}
          <div className="space-y-5">
            {CONTACT_INFO.map(({ icon: Icon, title, value, sub }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5 flex gap-4">
                <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{title}</p>
                  <p className="text-gray-700 text-sm mt-0.5">{value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
                </div>
              </div>
            ))}

            {/* Leaflet Map */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="font-bold text-gray-900 text-sm mb-3">📍 Our Location</p>
              <div className="rounded-xl overflow-hidden h-64 relative" style={{ zIndex: 0 }}>
                {mapReady && (
                  <MapContainer
                    center={OFFICE_LOCATION}
                    zoom={15}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
                    attributionControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={OFFICE_LOCATION} icon={customIcon}>
                      <Popup>
                        <div style={{ textAlign: 'center', minWidth: 180 }}>
                          <strong style={{ fontSize: 14, color: '#111' }}>BLIPZO Innovations</strong>
                          <br />
                          <span style={{ fontSize: 12, color: '#666' }}>
                            Shop No. 11, Dogra Hall<br />
                            Rehari Mohalla, Jammu<br />
                            J&K, India – 180005
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">Jammu, Jammu & Kashmir, India</p>
                <a
                  href={`https://www.google.com/maps?q=${OFFICE_LOCATION[0]},${OFFICE_LOCATION[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-600 font-semibold hover:text-amber-700 transition-colors"
                >
                  Open in Google Maps →
                </a>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              {status === 'success' ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500">We'll get back to you within 24 hours.</p>
                  <button onClick={() => setStatus('idle')} className="mt-6 px-6 py-2.5 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-black text-gray-900 mb-6">Send us a message</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Full Name</label>
                        <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your Name" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email Address</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Subject</label>
                      <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none">
                        <option value="">Select a subject...</option>
                        <option>Order Issue</option>
                        <option>Product Question</option>
                        <option>Return / Refund</option>
                        <option>Shipping</option>
                        <option>Account Help</option>
                        <option>Partnership / Wholesale</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Message</label>
                      <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="How can we help you?" required rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none" />
                    </div>
                    <button type="submit" disabled={status === 'loading'} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />
                      {status === 'loading' ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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
