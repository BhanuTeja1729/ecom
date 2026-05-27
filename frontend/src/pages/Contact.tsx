import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react';

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setTimeout(() => { setStatus('success'); setForm({ name: '', email: '', subject: '', message: '' }); }, 1500);
  }

  const CONTACT_INFO = [
    { icon: Mail, title: 'Email', value: 'hello@luxestore.com', sub: 'We reply within 2 hours' },
    { icon: Phone, title: 'Phone', value: '+1 (800) 555-1234', sub: 'Mon-Fri, 9am-6pm EST' },
    { icon: MapPin, title: 'Address', value: '123 Commerce St, New York, NY 10001', sub: 'Headquarters' },
    { icon: Clock, title: 'Hours', value: 'Mon-Fri: 9am-6pm EST', sub: 'Sat: 10am-4pm EST' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero */}
      <div className="bg-gray-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">Get In Touch</p>
          <h1 className="text-5xl font-black text-white mb-4">Contact Us</h1>
          <p className="text-gray-400 max-w-md mx-auto">Our world-class support team is here to help. Expect a response within 2 hours.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact info */}
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
                  <p className="text-gray-500">We'll get back to you within 2 hours.</p>
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
                        <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email Address</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none" />
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
    </div>
  );
}
