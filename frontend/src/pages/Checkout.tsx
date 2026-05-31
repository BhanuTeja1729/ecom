import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronRight, Shield, Lock, Truck, Zap, CalendarDays, Clock, MapPin, AlertTriangle, Navigation, Home, Building2, Plus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { useLocation } from '../contexts/LocationContext';
import { orderApi, paymentApi, userApi } from '../lib/api';
import { DeliveryBanner } from '../components/ui/DeliveryBanner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Step = 'shipping' | 'schedule' | 'review';

interface ShippingForm {
  fullName: string;
  email: string;
  phone: string;
  doorNo: string;
  address: string;
  landmark: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const EMPTY_SHIPPING: ShippingForm = {
  fullName: '', email: '', phone: '',
  doorNo: '', address: '', landmark: '',
  city: '', state: '', zip: '', country: 'India',
};

const TIME_SLOTS = [
  { id: 'morning',   label: 'Morning',    time: '8:00 AM – 11:00 AM',  icon: '🌅', startHour: 8 },
  { id: 'midday',    label: 'Midday',     time: '11:00 AM – 2:00 PM',  icon: '☀️', startHour: 11 },
  { id: 'afternoon', label: 'Afternoon',  time: '2:00 PM – 5:00 PM',   icon: '🌤️', startHour: 14 },
  { id: 'evening',   label: 'Evening',    time: '5:00 PM – 8:00 PM',   icon: '🌇', startHour: 17 },
];

function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  // Start from today (i = 0) for same-day delivery
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateFull(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function isTomorrow(d: Date): boolean {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function getDayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

export function Checkout() {
  const { items, subtotal, discount, total, coupon, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const { userCoords, isDeliveryAvailable, distanceFromInventory, geocodeAndCheckDistance, locationStatus, requestLocation } = useLocation();

  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Schedule delivery state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const deliveryDays = useMemo(() => getNextDays(7), []);

  // Delivery location check state
  const [deliverToSameLocation, setDeliverToSameLocation] = useState<boolean | null>(null);
  const [shippingAddressDistance, setShippingAddressDistance] = useState<number | null>(null);
  const [shippingAddressAvailable, setShippingAddressAvailable] = useState<boolean | null>(null);
  const [checkingAddress, setCheckingAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('new');

  // Load saved addresses
  useEffect(() => {
    if (user) {
      userApi.getAddresses()
        .then(r => {
          const addrs = r.data ?? [];
          setSavedAddresses(addrs);
          if (addrs.length > 0) setAddressMode('saved');
        })
        .catch(() => {});
    }
  }, [user]);

  const shippingCost = subtotal >= 999 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const orderTotal = total + shippingCost + tax;
  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');

  async function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If user chose "deliver to different address", geocode the shipping address
    if (deliverToSameLocation === false) {
      setCheckingAddress(true);
      const fullAddress = `${shipping.doorNo ? shipping.doorNo + ', ' : ''}${shipping.address}, ${shipping.city}, ${shipping.state}, ${shipping.zip}, ${shipping.country}`;
      const result = await geocodeAndCheckDistance(fullAddress);
      setShippingAddressDistance(result.distance);
      setShippingAddressAvailable(result.available);
      setCheckingAddress(false);

      if (result.available === false) {
        toast('Delivery is not available to this address. It is beyond our 25 km delivery range.', 'error');
        return;
      }
      if (result.available === null) {
        // Could not geocode — warn but let them continue
        toast('Could not verify delivery availability for this address. You may proceed at your own risk.', 'warning');
      }
    }

    setStep('schedule');
  }

  function handleScheduleSubmit() {
    if (!selectedDate || !selectedSlot) {
      toast('Please select a delivery date and time slot', 'error');
      return;
    }
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
                doorNo: shipping.doorNo,
                addressLine1: shipping.address,
                landmark: shipping.landmark,
                city: shipping.city,
                state: shipping.state,
                postalCode: shipping.zip,
                country: shipping.country,
              },
              paymentMethod: 'razorpay',
              couponCode: coupon?.code ?? '',
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              scheduledDeliveryDate: selectedDate?.toISOString(),
              scheduledDeliverySlot: selectedSlot ? TIME_SLOTS.find(s => s.id === selectedSlot)?.time : undefined,
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

  // ── TEST BYPASS: Skip Razorpay, create order directly ──────────────────────
  async function handleTestBypass() {
    if (!user) { navigate('/auth'); return; }
    setSubmitting(true);
    try {
      const orderRes = await orderApi.create({
        shippingAddress: {
          fullName: shipping.fullName,
          email: shipping.email,
          phone: shipping.phone,
          doorNo: shipping.doorNo,
          addressLine1: shipping.address,
          landmark: shipping.landmark,
          city: shipping.city,
          state: shipping.state,
          postalCode: shipping.zip,
          country: shipping.country,
        },
        paymentMethod: 'test_bypass',
        couponCode: coupon?.code ?? '',
        scheduledDeliveryDate: selectedDate?.toISOString(),
        scheduledDeliverySlot: selectedSlot ? TIME_SLOTS.find(s => s.id === selectedSlot)?.time : undefined,
        items: items.map(item => ({
          productId: item.product._id || item.product.id,
          variantId: item.variant?._id || item.variant?.id,
          quantity: item.quantity,
        })),
      });
      setOrderNumber(orderRes.data.orderNumber);
      clearCart();
      toast('Test order placed successfully! (Payment bypassed)', 'success');
    } catch (err: any) {
      toast(err.message || 'Test order creation failed.', 'error');
    } finally {
      setSubmitting(false);
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
            {selectedDate && selectedSlot && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                  <CalendarDays className="w-3 h-3" /> Scheduled Delivery
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-2">{formatDateFull(selectedDate)}</p>
                <p className="text-sm text-gray-600">{TIME_SLOTS.find(s => s.id === selectedSlot)?.time}</p>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-3">A confirmation email will be sent to <strong>{shipping.email}</strong></p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate(`/order-tracking?order=${orderNumber}`)} className="px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
              <Truck className="w-4 h-4" /> Track Order
            </button>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
              View All Orders
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
    { id: 'schedule', label: 'Schedule' },
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

                {/* Delivery location check */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-bold text-blue-800">Delivery Location Check</p>
                  </div>
                  <p className="text-xs text-blue-700 mb-4">Is this order being delivered to your current location?</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDeliverToSameLocation(true);
                        setShippingAddressDistance(null);
                        setShippingAddressAvailable(null);
                      }}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                        deliverToSameLocation === true
                          ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        deliverToSameLocation === true ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {deliverToSameLocation === true && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Yes, same location</p>
                        <p className="text-xs text-gray-500">Deliver to my current place</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeliverToSameLocation(false);
                        setShippingAddressDistance(null);
                        setShippingAddressAvailable(null);
                      }}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                        deliverToSameLocation === false
                          ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        deliverToSameLocation === false ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {deliverToSameLocation === false && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">No, different address</p>
                        <p className="text-xs text-gray-500">I'll enter the delivery address</p>
                      </div>
                    </button>
                  </div>

                  {/* Show current-location delivery status */}
                  {deliverToSameLocation === true && (
                    <div className="mt-4">
                      <DeliveryBanner compact />
                      {isDeliveryAvailable === false && (
                        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          <p className="text-xs text-red-700 font-medium">
                            Your current location is outside our delivery zone. You can still place the order, but delivery may not be available.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show shipping address check result */}
                  {deliverToSameLocation === false && shippingAddressAvailable !== null && (
                    <div className="mt-4">
                      <DeliveryBanner
                        compact
                        overrideDistance={shippingAddressDistance}
                        overrideAvailable={shippingAddressAvailable}
                      />
                    </div>
                  )}

                  {deliverToSameLocation === false && checkingAddress && (
                    <div className="mt-4">
                      <DeliveryBanner compact checking />
                    </div>
                  )}
                </div>

                {/* Saved address picker */}
                {savedAddresses.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setAddressMode('saved')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${addressMode === 'saved' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        <MapPin className="w-3.5 h-3.5 inline mr-1.5" /> Saved Addresses
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddressMode('new'); setSelectedAddressId(null); setShipping(EMPTY_SHIPPING); }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${addressMode === 'new' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1.5" /> New Address
                      </button>
                    </div>

                    {addressMode === 'saved' && (
                      <div className="space-y-2">
                        {savedAddresses.map((addr: any) => (
                          <button
                            key={addr._id}
                            type="button"
                            onClick={() => {
                              setSelectedAddressId(addr._id);
                              setShipping({
                                fullName: addr.fullName || '',
                                email: addr.email || user?.email || '',
                                phone: addr.phone || '',
                                doorNo: addr.doorNo || '',
                                address: addr.addressLine1 || '',
                                landmark: addr.landmark || '',
                                city: addr.city || '',
                                state: addr.state || '',
                                zip: addr.postalCode || '',
                                country: addr.country || 'India',
                              });
                            }}
                            className={`w-full text-left p-4 border-2 rounded-xl transition-all ${selectedAddressId === addr._id ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedAddressId === addr._id ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                                {selectedAddressId === addr._id && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {addr.label && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md">
                                      {addr.label === 'Home' ? <Home className="w-3 h-3" /> : addr.label === 'Work' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                      {addr.label}
                                    </span>
                                  )}
                                  <span className="font-bold text-gray-900 text-sm">{addr.fullName}</span>
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  {addr.doorNo && `${addr.doorNo}, `}{addr.addressLine1}
                                </p>
                                {addr.landmark && <p className="text-xs text-gray-400">Near: {addr.landmark}</p>}
                                <p className="text-xs text-gray-500">{addr.city}, {addr.state} {addr.postalCode}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Show form fields when adding new address or no saved addresses */}
                {(addressMode === 'new' || savedAddresses.length === 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'fullName', label: 'Full Name', placeholder: 'John Doe', full: false },
                    { key: 'email', label: 'Email Address', placeholder: 'john@example.com', full: false },
                    { key: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210', full: false },
                    { key: 'doorNo', label: 'D.No / Flat No', placeholder: '12-34-56 / Flat 4B', full: false },
                    { key: 'address', label: 'Street / Area', placeholder: 'MG Road, Banjara Hills', full: true },
                    { key: 'landmark', label: 'Near Landmark', placeholder: 'Near City Center Mall', full: true },
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
                )}

                {deliverToSameLocation === null && (
                  <p className="mt-4 text-xs text-amber-600 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Please select a delivery location option above to continue.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={deliverToSameLocation === null || checkingAddress}
                  className="mt-6 w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingAddress ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Checking availability…</>
                  ) : (
                    <>Continue to Schedule <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            )}

            {step === 'schedule' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-500" /> Schedule Delivery
                </h2>
                <p className="text-sm text-gray-500 mb-6">Choose your preferred delivery date and time slot</p>

                {/* Date selector */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-gray-400" /> Select Date
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {deliveryDays.map((day) => {
                      const isSelected = selectedDate?.toDateString() === day.toDateString();
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => {
                            setSelectedDate(day);
                            // Clear slot if switching to today and the slot is now past
                            if (isToday(day) && selectedSlot) {
                              const slot = TIME_SLOTS.find(s => s.id === selectedSlot);
                              if (slot && new Date().getHours() >= slot.startHour) {
                                setSelectedSlot(null);
                              }
                            }
                          }}
                          className={`relative flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-100'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                          }`}
                        >
                          <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isSelected ? 'text-amber-600' : 'text-gray-400'}`}>
                            {getDayLabel(day)}
                          </span>
                          <span className={`text-lg font-black ${isSelected ? 'text-amber-700' : 'text-gray-800'}`}>
                            {day.getDate()}
                          </span>
                          <span className={`text-[10px] font-medium ${isSelected ? 'text-amber-500' : 'text-gray-400'}`}>
                            {day.toLocaleDateString('en-IN', { month: 'short' })}
                          </span>
                          {isSelected && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slot selector */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" /> Select Time Slot
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = selectedSlot === slot.id;
                      const isSelectedToday = selectedDate && isToday(selectedDate);
                      const currentHour = new Date().getHours();
                      // Slot is past if today is selected and the slot's start hour has already passed
                      const isPast = !!(isSelectedToday && currentHour >= slot.startHour);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isPast}
                          onClick={() => !isPast && setSelectedSlot(slot.id)}
                          className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                            isPast
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-100'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                          }`}
                        >
                          <span className="text-2xl">{slot.icon}</span>
                          <div className="flex-1">
                            <p className={`text-sm font-bold ${isPast ? 'text-gray-400' : isSelected ? 'text-amber-700' : 'text-gray-800'}`}>
                              {slot.label}
                            </p>
                            <p className={`text-xs ${isPast ? 'text-gray-400' : isSelected ? 'text-amber-500' : 'text-gray-400'}`}>
                              {slot.time}
                            </p>
                          </div>
                          {isPast ? (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Past</span>
                          ) : (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected summary */}
                {selectedDate && selectedSlot && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-bold text-amber-800">Scheduled Delivery</p>
                    </div>
                    <p className="text-sm text-amber-700 ml-6">
                      {formatDateFull(selectedDate)} · {TIME_SLOTS.find(s => s.id === selectedSlot)?.time}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('shipping')}
                    className="flex-1 py-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleScheduleSubmit}
                    className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Continue to Review <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 'review' && !orderNumber && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-black text-gray-900 mb-6">Review Your Order</h2>
                {/* Shipping summary */}
                <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shipping To</p>
                    <button onClick={() => setStep('shipping')} className="text-xs text-amber-600 font-semibold hover:underline">Edit</button>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{shipping.fullName}</p>
                  <p className="text-sm text-gray-600">{shipping.address}, {shipping.city}, {shipping.state} {shipping.zip}</p>
                  <p className="text-sm text-gray-600">{shipping.email} · {shipping.phone}</p>
                </div>

                {/* Delivery schedule summary */}
                {selectedDate && selectedSlot && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /> Scheduled Delivery
                      </p>
                      <button onClick={() => setStep('schedule')} className="text-xs text-amber-600 font-semibold hover:underline">Edit</button>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatDateFull(selectedDate)}</p>
                    <p className="text-sm text-gray-600">
                      {TIME_SLOTS.find(s => s.id === selectedSlot)?.icon}{' '}
                      {TIME_SLOTS.find(s => s.id === selectedSlot)?.label} — {TIME_SLOTS.find(s => s.id === selectedSlot)?.time}
                    </p>
                  </div>
                )}

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
                  <button type="button" onClick={() => setStep('schedule')} className="flex-1 py-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-colors">
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

                {/* ── TEST BYPASS BUTTON ─────────────────────────────── */}
                <div className="mt-4 p-4 bg-orange-50 border-2 border-dashed border-orange-300 rounded-xl">
                  <p className="text-xs font-bold text-orange-700 mb-2 uppercase tracking-wider">🧪 Testing Mode</p>
                  <p className="text-xs text-orange-600 mb-3">Skip Razorpay payment to test order tracking flow.</p>
                  <button
                    onClick={handleTestBypass}
                    disabled={submitting}
                    className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>🧪 Place Test Order (Skip Payment)</>
                    )}
                  </button>
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

              {/* Delivery schedule in sidebar */}
              {selectedDate && selectedSlot && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs font-bold text-blue-600">Scheduled Delivery</p>
                  </div>
                  <p className="text-xs text-gray-700 font-medium">{formatDateShort(selectedDate)}</p>
                  <p className="text-xs text-gray-500">{TIME_SLOTS.find(s => s.id === selectedSlot)?.time}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
