import { useState } from 'react';
import { Package, Search, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { orderApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';

const STEPS = [
  { status: 'pending', label: 'Order Placed', icon: Clock, desc: 'Your order has been received' },
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle, desc: 'Payment confirmed' },
  { status: 'processing', label: 'Processing', icon: Package, desc: 'Being prepared for shipment' },
  { status: 'shipped', label: 'Shipped', icon: Truck, desc: 'On its way to you' },
  { status: 'delivered', label: 'Delivered', icon: MapPin, desc: 'Package delivered' },
];

const ORDER_STATUS_BADGE: Record<string, 'default'|'success'|'warning'|'error'|'dark'> = {
  pending: 'warning', confirmed: 'default', processing: 'default',
  shipped: 'dark', delivered: 'success', cancelled: 'error',
};

export function OrderTracking() {
  const [orderNum, setOrderNum] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNum.trim()) return;
    setLoading(true); setError(''); setOrder(null);
    try {
      const res = await orderApi.get(orderNum.trim().toUpperCase());
      setOrder(res.data);
    } catch {
      setError('Order not found. Please check your order number and try again.');
    } finally { setLoading(false); }
  }

  const currentStepIndex = order ? STEPS.findIndex(s => s.status === order.status) : -1;
  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-3">Track Your Order</h1>
          <p className="text-gray-500">Enter your order number to get real-time updates</p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={orderNum}
                onChange={e => setOrderNum(e.target.value)}
                placeholder="Enter order number (e.g. ORD-ABC123)"
                className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
              />
            </div>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60">
              {loading ? 'Searching...' : 'Track'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </form>

        {order && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="text-xl font-black text-amber-600">{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Placed on</p>
                  <p className="font-semibold text-gray-900">{new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <Badge variant={ORDER_STATUS_BADGE[order.status] ?? 'default'} size="md">
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                {order.trackingNumber && (
                  <span className="text-sm text-gray-600">Tracking: <span className="font-bold">{order.trackingNumber}</span></span>
                )}
              </div>

              {order.status !== 'cancelled' && order.status !== 'refunded' && (
                <div className="relative">
                  <div className="flex justify-between mb-2">
                    {STEPS.map((step, i) => {
                      const isCompleted = i <= currentStepIndex;
                      const isCurrent = i === currentStepIndex;
                      const Icon = step.icon;
                      return (
                        <div key={step.status} className="flex flex-col items-center flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10 relative ${isCompleted ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-gray-200 text-gray-400'} ${isCurrent ? 'ring-4 ring-amber-100' : ''}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className={`text-xs font-semibold mt-2 text-center ${isCompleted ? 'text-amber-600' : 'text-gray-400'}`}>{step.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-0">
                    <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${currentStepIndex >= 0 ? (currentStepIndex / (STEPS.length - 1)) * 100 : 0}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Order Details</h3>
              <div className="space-y-2 mb-4">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                      {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-gray-900">{fmt(item.total)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                {order.discountAmount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{fmt(order.discountAmount)}</span></div>}
                <div className="flex justify-between text-sm text-gray-600"><span>Shipping</span><span>{fmt(order.shippingAmount)}</span></div>
                <div className="flex justify-between font-black text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>{fmt(order.total)}</span></div>
              </div>
            </div>

            {order.shippingAddress && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-500" /> Shipping Address</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-900">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Can't find your order?{' '}
            <a href="/about#contact" className="text-amber-600 font-semibold hover:text-amber-700 transition-colors">Contact our support team</a>
          </p>
        </div>
      </div>
    </div>
  );
}
