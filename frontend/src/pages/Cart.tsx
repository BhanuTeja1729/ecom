import { useState } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Tag, ArrowRight, Shield, Truck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { cartApi } from '../lib/api';

export function Cart() {
  const { items, removeItem, updateQuantity, subtotal, discount, total, coupon, applyCoupon, removeCoupon, clearCart } = useCart();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await cartApi.applyCoupon(couponCode.trim().toUpperCase(), subtotal);
      const data = res.data;
      applyCoupon(data);
      toast(`Coupon applied! You saved ${data.discountType === 'percentage' ? `${data.discountValue}%` : '₹' + data.discountValue}`, 'success');
      setCouponCode('');
    } catch (err: any) {
      toast(err.message || 'Invalid or expired coupon code', 'error');
    } finally { setCouponLoading(false); }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-2 px-8 py-3.5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-amber-600 transition-colors mx-auto group"
          >
            Start Shopping
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  const shipping = subtotal >= 999 ? 0 : 49;  // INR thresholds
  const tax = Math.round(total * 0.18);  // 18% GST
  const orderTotal = total + shipping + tax;
  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-gray-900">Shopping Cart</h1>
          <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700 font-semibold transition-colors">
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => {
              const images = item.product.images || item.product.product_images || [];
              const image = images.find((i: any) => i.isPrimary || i.is_primary) ?? images[0];
              const priceModifier = item.variant?.priceModifier ?? item.variant?.price_modifier ?? 0;
              const price = item.product.price + priceModifier;

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-5">
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0 cursor-pointer"
                    onClick={() => navigate(`/product/${item.product.slug}`)}
                  >
                    {image && <img src={image.url} alt={item.product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3
                          className="font-bold text-gray-900 hover:text-amber-600 cursor-pointer transition-colors"
                          onClick={() => navigate(`/product/${item.product.slug}`)}
                        >
                          {item.product.name}
                        </h3>
                        {item.variant && (
                          <p className="text-sm text-gray-500 mt-0.5">{item.variant.name}: {item.variant.value}</p>
                        )}
                        <p className="text-amber-600 font-bold mt-1">{fmt(price)}</p>
                      </div>
                      <button
                        onClick={() => { removeItem(item.product.id, item.variant?.id); toast('Item removed', 'info'); }}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.variant?.id, item.quantity - 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.variant?.id, item.quantity + 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-black text-gray-900 text-lg">{fmt(price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Continue shopping */}
            <button
              onClick={() => navigate('/shop')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 transition-colors font-semibold"
            >
              ← Continue Shopping
            </button>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                Promo Code
              </h3>
              {coupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-bold text-emerald-700 text-sm">{coupon.code}</p>
                    <p className="text-xs text-emerald-600">{coupon.description}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-emerald-500 hover:text-red-500 transition-colors text-xs font-semibold">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading}
                    className="px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60"
                  >
                    Apply
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Try: WELCOME10, SAVE20, FLAT50</p>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {coupon && discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount ({coupon.code})</span>
                    <span>-{fmt(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <span className="text-emerald-600 font-semibold">Free</span> : fmt(shipping)}</span>
                </div>
                {subtotal < 999 && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    Add {fmt(999 - subtotal)} more for free shipping!
                  </p>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST (18%)</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span><span>{fmt(tax)}</span>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-lg pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span>{fmt(orderTotal)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full mt-6 py-4 bg-gray-900 text-white font-bold text-lg rounded-2xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 group"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center gap-4 mt-4">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">Secure 256-bit SSL encryption</span>
                <Truck className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
