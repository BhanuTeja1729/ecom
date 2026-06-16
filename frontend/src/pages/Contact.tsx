import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PageFooter } from '../components/layout/PageFooter';
import { contactApi } from '../lib/api';

// Custom marker icon (amber/gold themed)
const customIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const OFFICE_LOCATION: [number, number] = [32.7304691, 74.8194695];

const CONTACT_INFO = [
  { icon: Mail, title: 'Email', value: '2804blipzoinnovationptv@gmail.com', sub: 'We reply within 24 hours' },
  { icon: Phone, title: 'Phone', value: '+91 7006464761, +91 8899590378', sub: 'Mon-Sat, 10am-6pm IST' },
  { icon: MapPin, title: 'Registered Address', value: 'M/S Aligarh Traders, Shop No. 11, Dogra Hall, Rehari Mohalla, Jammu, J&K – 180005', sub: 'Headquarters' },
];

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg(null);
    try {
      await contactApi.submit(form);
      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setStatus('idle');
      setErrorMsg(err.message || 'Failed to send message. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden pt-16">

      {/* Hero */}
      <div className="bg-gray-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">Get In Touch</p>
          <h1 className="text-5xl font-black text-white mb-4">Contact BLIPZO</h1>
          <p className="text-gray-400 max-w-md mx-auto">Have questions or need assistance? Our team is here to help. Reach out to us anytime.</p>
        </div>
      </div>

      {/* Content */}
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

            {/* Map */}
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
                  {errorMsg && (
                    <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-semibold mb-4 border border-red-100">
                      {errorMsg}
                    </div>
                  )}
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

      <PageFooter />
    </div>
  );
}
