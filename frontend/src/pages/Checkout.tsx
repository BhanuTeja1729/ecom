import { useState } from 'react';
import { Check, ChevronRight, Shield, Lock, Truck, Zap } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { orderApi, paymentApi } from '../lib/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Step = 'shipping' | 'review';

interface ShippingForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const EMPTY_SHIPPING: ShippingForm = {
  fullName: '', email: '', phone: '',
  address: '', city: '', state: '', zip: '', country: 'India',
};

export function Checkout() {
  const { items, subtotal, discount, total, coupon, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();

  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const shippingCost = subtotal >= 999 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const orderTotal = total + shippingCost + tax;
  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');

  function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep('review');
  }

  async function handlePayWithRazorpay() {
    if (!user) { navigate('/auth'); return; }
    setSubmitting(true);

    try {
      // Step 1: Create Razorpay order on backend (amount in paise)
      const amountInPaise = Math.round(orderTotal * 100);
      const { data: rzpOrder } = await paymentApi.createOrder(amountInPaise);

      // Step 2: Open Razorpay checkout popup
      const options = {
        key: rzpOrder.keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'BLIPZO Store',
        description: `Order — ${items.length} item${items.length > 1 ? 's' : ''}`,
        order_id: rzpOrder.orderId,
        prefill: {
          name: shipping.fullName,
          email: shipping.email,
          contact: shipping.phone,
        },
        theme: {
          color: '#f59e0b', // amber-500
        },
        handler: async function (response: any) {
          try {
            // Step 3: Verify payment on backend
            await paymentApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Step 4: Create order with verified payment info
            const orderRes = await orderApi.create({
              shippingAddress: {
                fullName: shipping.fullName,
                email: shipping.email,
                phone: shipping.phone,
                addressLine1: shipping.address,
                city: shipping.city,
                state: shipping.state,
                postalCode: shipping.zip,
                country: shipping.country,
              },
              paymentMethod: 'razorpay',
              couponCode: coupon?.code ?? '',
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              items: items.map(item => ({
                productId: item.product._id || item.product.id,
                variantId: item.variant?._id || item.variant?.id,
                quantity: item.quantity,
              })),
            });

            setOrderNumber(orderRes.data.orderNumber);
            clearCart();
            toast('Payment successful! Order placed.', 'success');
          } catch (err: any) {
            toast(err.message || 'Order creation failed after payment.', 'error');
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
            toast('Payment was cancelled.', 'error');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setSubmitting(false);
        toast(`Payment failed: ${response.error.description}`, 'error');
      });
      rzp.open();
    } catch (err: any) {
      setSubmitting(false);
      toast(err.message || 'Failed to initiate payment.', 'error');
    }
  }

  if (items.length === 0 && !orderNumber) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-4">Nothing to checkout</h2>
          <button onClick={() => navigate('/shop')} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (orderNumber) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="max-w-lg w-full mx-4 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">Order Confirmed!</h1>
          <p className="text-gray-500 mb-2">Thank you for your purchase. Payment has been received.</p>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <p className="text-sm text-gray-500 mb-1">Order Number</p>
            <p className="text-2xl font-black text-amber-600">{orderNumber}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
              <Shield className="w-3 h-3" /> Payment Verified
            </div>
            <p className="text-sm text-gray-500 mt-3">A confirmation email will be sent to <strong>{shipping.email}</strong></p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors">
              View Orders
            </button>
            <button onClick={() => navigate('/shop')} className="px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-colors">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'shipping', label: 'Shipping' },
    { id: 'review', label: 'Review & Pay' },
  ];
  const stepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center mb-12">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < stepIndex ? 'bg-emerald-500 text-white' : i === stepIndex ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm font-semibold ${i === stepIndex ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-3 ${i < stepIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            {step === 'shipping' && (
              <form onSubmit={handleShippingSubmit} className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-500" /> Shipping Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'fullName', label: 'Full Name', placeholder: 'John Doe', full: false },
                    { key: 'email', label: 'Email Address', placeholder: 'john@example.com', full: false },
                    { key: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210', full: false },
                    { key: 'address', label: 'Street Address', placeholder: '123 Main St, Apt 4B', full: true },
                    { key: 'city', label: 'City', placeholder: 'Mumbai', full: false },
                    { key: 'state', label: 'State', placeholder: 'Maharashtra', full: false },
                    { key: 'zip', label: 'PIN Code', placeholder: '400001', full: false },
                    { key: 'country', label: 'Country', placeholder: 'India', full: false },
                  ].map(field => (
                    <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
                      <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{field.label}</label>
                      <input
                        type="text"
                        value={shipping[field.key as keyof ShippingForm]}
                        onChange={e => setShipping(s => ({ ...s, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
                <button type="submit" className="mt-6 w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                  Continue to Review <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {step === 'review' && !orderNumber && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-black text-gray-900 mb-6">Review Your Order</h2>
                {/* Shipping summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shipping To</p>
                    <button onClick={() => setStep('shipping')} className="text-xs text-amber-600 font-semibold hover:underline">Edit</button>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{shipping.fullName}</p>
                  <p className="text-sm text-gray-600">{shipping.address}, {shipping.city}, {shipping.state} {shipping.zip}</p>
                  <p className="text-sm text-gray-600">{shipping.email} · {shipping.phone}</p>
                </div>
                {/* Items */}
                <div className="space-y-3 mb-6">
                  {items.map(item => {
                    const images = item.product.images || item.product.product_images || [];
                    const img = images.find((i: any) => i.isPrimary || i.is_primary) ?? images[0];
                    const priceModifier = item.variant?.priceModifier ?? item.variant?.price_modifier ?? 0;
                    const price = item.product.price + priceModifier;
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                          {img && <img src={img.url} alt={item.product.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{item.product.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-bold text-gray-900">{fmt(price * item.quantity)}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Payment info */}
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-bold text-amber-800">Secure Payment via Razorpay</p>
                  </div>
                  <p className="text-xs text-amber-700 ml-6">UPI, Cards, Net Banking, Wallets — all payment methods accepted. Your payment is protected by bank-grade encryption.</p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setStep('shipping')} className="flex-1 py-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handlePayWithRazorpay}
                    disabled={submitting}
                    className="flex-1 py-4 bg-amber-500 text-white font-bold text-lg rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Pay {fmt(orderTotal)}
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500">Payments are processed securely by Razorpay. We never store your card or banking details.</p>
                </div>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map(item => {
                  const images2 = item.product.images || item.product.product_images || [];
                  const img2 = images2.find((i: any) => i.isPrimary || i.is_primary) ?? images2[0];
                  const priceModifier2 = item.variant?.priceModifier ?? item.variant?.price_modifier ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                        {img2 && <img src={img2.url} alt={item.product.name} className="w-full h-full object-cover" />}
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{item.quantity}</span>
                      </div>
                      <p className="text-xs text-gray-700 flex-1 font-medium line-clamp-1">{item.product.name}</p>
                      <p className="text-xs font-bold text-gray-900">{fmt((item.product.price + priceModifier2) * item.quantity)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                 {discount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{fmt(discount)}</span></div>}
                 <div className="flex justify-between text-sm text-gray-600"><span>Shipping</span><span>{shippingCost === 0 ? 'Free' : fmt(shippingCost)}</span></div>
                 <div className="flex justify-between text-sm text-gray-600"><span>GST (18%)</span><span>{fmt(tax)}</span></div>
                 <div className="flex justify-between font-black text-gray-900 text-lg pt-2 border-t border-gray-200"><span>Total</span><span>{fmt(orderTotal)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
