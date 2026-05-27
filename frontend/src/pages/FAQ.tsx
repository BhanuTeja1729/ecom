import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useRouter } from '../lib/router';

const FAQS = [
  {
    category: 'Orders & Shipping',
    items: [
      { q: 'How long does shipping take?', a: 'Standard shipping takes 5-7 business days. Express shipping (2-3 days) is available for $14.99. Overnight shipping is available for $29.99 on orders placed before 2pm EST.' },
      { q: 'Do you offer free shipping?', a: 'Yes! We offer free standard shipping on all orders over $75. For orders under $75, standard shipping is $5.99.' },
      { q: 'Can I track my order?', a: 'Absolutely. Once your order ships, you\'ll receive a tracking number via email. You can also track orders directly on our Order Tracking page using your order number.' },
      { q: 'Do you ship internationally?', a: 'We ship to 50+ countries worldwide. International shipping rates are calculated at checkout based on destination and order weight. Delivery typically takes 7-14 business days.' },
      { q: 'Can I change or cancel my order?', a: 'Orders can be modified or cancelled within 1 hour of placement. After this window, orders enter processing and cannot be changed. Please contact our support team immediately if you need assistance.' },
    ]
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'We offer hassle-free 30-day returns on all items in their original condition with tags attached. Simply initiate a return through your account dashboard and we\'ll provide a prepaid shipping label.' },
      { q: 'How long do refunds take?', a: 'Once we receive your return, refunds are processed within 2-3 business days. The amount will appear on your original payment method within 5-10 business days depending on your bank.' },
      { q: 'What items cannot be returned?', a: 'The following items are final sale: digital products, personalized/custom items, intimate apparel, and items marked as "Final Sale". Opened beauty products can only be returned if defective.' },
      { q: 'What if my item arrived damaged?', a: 'We\'re so sorry! Please contact us within 48 hours of delivery with photos of the damage. We\'ll immediately ship a replacement at no charge and arrange collection of the damaged item.' },
    ]
  },
  {
    category: 'Products & Availability',
    items: [
      { q: 'Are your products authentic?', a: 'Yes, absolutely. All products sold on Luxe are 100% authentic and purchased directly from authorized manufacturers or official distributors. We have zero tolerance for counterfeits.' },
      { q: 'Will out-of-stock items come back?', a: 'Many popular items are restocked regularly. Use the "Notify Me" feature on out-of-stock product pages to receive an email when the item becomes available again.' },
      { q: 'Do you offer gift wrapping?', a: 'Yes! Premium gift wrapping is available for $5.99 per item. You can add a personalized message and we\'ll include it with beautiful tissue paper and a ribbon.' },
    ]
  },
  {
    category: 'Account & Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, and Google Pay. All transactions are secured with 256-bit SSL encryption.' },
      { q: 'Is my payment information secure?', a: 'Yes. We use industry-standard SSL encryption and never store your payment details on our servers. All payments are processed through PCI DSS compliant payment gateways.' },
      { q: 'How do I use a discount code?', a: 'Enter your discount code in the "Promo Code" field in your cart before checkout. Codes are case-insensitive and one code can be used per order. Check the expiration date and minimum order requirement.' },
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
            <p className="text-gray-500">No questions match your search. <button onClick={() => navigate('/contact')} className="text-amber-600 font-bold">Contact us instead</button></p>
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
                              <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
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
            onClick={() => navigate('/contact')}
            className="px-8 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
