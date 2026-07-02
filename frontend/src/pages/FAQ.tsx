
import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useRouter } from '../lib/router';

export const FAQS = [
  {
    category: 'Orders & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'We operate on a scheduled delivery model. During checkout, you can select your preferred delivery date and time slot, and our riders will ensure your order is delivered within that scheduled window.' },
      { q: 'Do you offer free delivery?', a: 'We offer free delivery on all orders over ₹999. For orders under ₹999, a nominal delivery fee of ₹49 applies depending on your location.' },
      { q: 'Can I track my order?', a: 'Yes! You can track your order in real-time. Once your order is placed, you can view the live status of the delivery partner on a map under the Orders tab in your dashboard.' },
      { q: 'Where do you deliver?', a: 'We deliver within a 12 km radius of our store location in Zirakpur, Punjab. Enter your delivery address at checkout or in your address panel to verify availability in your exact area.' },
      { q: 'Can I change or cancel my order?', a: "Right now we don't accept cancellations." },
    ]
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'If you receive a defective, damaged, or incorrect item, you can request a return from your dashboard under "Order History". Once requested, our delivery partner will visit your location to pick up the item and verify the 6-digit return code shown in your panel. Upon verification, the return is accepted and the refund is initiated.' },
      { q: 'How long do refunds take?', a: 'Refunds are initiated automatically via Cashfree Payments to your original payment method or UPI as soon as the return package is picked up and verified by our delivery partner. The refund typically reflects in your account within 2-3 business days.' },
      { q: 'What items cannot be returned?', a: 'For hygiene and safety reasons, once opened, personal care products, baby care essentials, and items marked as "Non-Returnable" cannot be returned unless they are damaged or defective on arrival.' },
    ]
  },
  {
    category: 'Products & Freshness',
    items: [
      { q: 'How do you ensure the freshness of groceries?', a: 'Our items are stored in temperature-controlled dark stores. Fresh fruits, vegetables, and dairy are sourced daily and quality checked before dispatch by our team.' },
      { q: 'Are products authentic?', a: 'Yes! All grocery and household items are sourced directly from verified national brands, local authorized distributors, and direct farms.' },
      { q: 'Do you offer options for organic or premium products?', a: 'Yes! We offer a dedicated organic and premium selection including fresh organic produce, gourmet cheese, imported snacks, and health-focused grocery essentials.' },
    ]
  },
  {
    category: 'Account & Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept online payments processed securely via Cashfree Payments, which supports all major UPI apps (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and popular Wallets. We also support Cash on Delivery (COD).' },
      { q: 'Is my payment transaction secure?', a: 'Yes, absolutely. All online transactions are processed through Cashfree Payments, which is PCI-DSS compliant. Your sensitive card and banking details are encrypted and never stored on our servers.' },
      { q: 'Is cash on delivery (COD) available?', a: 'Yes, Cash on Delivery (COD) is available in select locations for orders up to ₹2,000. You can pay our delivery partner in cash when your order arrives.' },
      { q: 'How do I use a discount or coupon code?', a: 'You can apply coupon codes (like WELCOME10) directly during checkout under the "Coupons" section in your cart for instant savings.' },
      { q: 'Can I use multiple discount codes?', a: 'Only one discount code can be applied per order. If you have multiple codes, use the one that offers the highest savings for your current order.' },
    ]
  },
];

export function FAQ() {
  const { navigate } = useRouter();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  function toggleItem(key: string) {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filteredFaqs = FAQS.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero */}
      <div className="bg-gray-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider mb-3">Help Center</p>
          <h1 className="text-5xl font-black text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-400 mb-8">Find answers to the most common questions</p>
          <div className="max-w-lg mx-auto flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-3">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No questions match your search. <button onClick={() => navigate('/about#contact')} className="text-amber-600 font-bold">Contact us instead</button></p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredFaqs.map(cat => (
              <div key={cat.category}>
                <h2 className="text-xl font-black text-gray-900 mb-4 pb-3 border-b border-gray-200">{cat.category}</h2>
                <div className="space-y-3">
                  {cat.items.map((item, i) => {
                    const key = `${cat.category}-${i}`;
                    const isOpen = openItems.has(key);
                    return (
                      <div key={key} className={`bg-white rounded-2xl border transition-all ${isOpen ? 'border-amber-200 shadow-sm' : 'border-gray-200'}`}>
                        <button
                          onClick={() => toggleItem(key)}
                          className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                        >
                          <span className="font-semibold text-gray-900 text-sm">{item.q}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-5">
                            <div className="border-t border-gray-100 pt-4">
                              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.a}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Still need help */}
        <div className="mt-16 bg-gray-950 rounded-3xl p-10 text-center">
          <h3 className="text-2xl font-black text-white mb-3">Still have questions?</h3>
          <p className="text-gray-400 mb-6">Our support team is available 7 days a week and typically responds within 2 hours.</p>
          <button
            onClick={() => navigate('/about#contact')}
            className="px-8 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
