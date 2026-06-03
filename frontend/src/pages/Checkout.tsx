import { useState, useMemo, useEffect, useCallback } from 'react';
import { Check, ChevronRight, Shield, Truck, CalendarDays, Clock, MapPin, Home, Building2, Plus, Tag, Banknote, Package } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { orderApi, userApi, cartApi } from '../lib/api';

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
  const { items, subtotal, discount, total, coupon, clearCart, applyCoupon, removeCoupon } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { navigate } = useRouter();

  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingForm>(() => ({
    ...EMPTY_SHIPPING,
    email: user?.email || '',
  }));

  useEffect(() => {
    if (user?.email && !shipping.email) {
      setShipping(s => ({ ...s, email: user.email }));
    }
  }, [user, shipping.email]);

  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Schedule delivery state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const deliveryDays = useMemo(() => getNextDays(7), []);

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('new');
  const [couponCodeDraft, setCouponCodeDraft] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showCouponsList, setShowCouponsList] = useState(false);

  const loadAvailableCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const res = await cartApi.getAvailableCoupons();
      setAvailableCoupons(res.data ?? []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableCoupons();
  }, [loadAvailableCoupons, user]);

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCodeDraft.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await cartApi.applyCoupon(couponCodeDraft.trim(), subtotal);
      applyCoupon(res.data);
      toast('Coupon applied successfully!', 'success');
      setCouponCodeDraft('');
      loadAvailableCoupons();
    } catch (err: any) {
      toast(err.message || 'Invalid coupon code', 'error');
    } finally {
      setApplyingCoupon(false);
    }
  }

  const handleApplyDirectly = async (code: string) => {
    setApplyingCoupon(true);
    try {
      const res = await cartApi.applyCoupon(code, subtotal);
      applyCoupon(res.data);
      toast('Coupon applied successfully!', 'success');
      loadAvailableCoupons();
    } catch (err: any) {
      toast(err.message || 'Invalid coupon code', 'error');
    } finally {
      setApplyingCoupon(false);
    }
  };

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

    // Save new address to user account if checkbox is checked
    if (addressMode === 'new' && user) {
      const saveCheckbox = document.getElementById('saveNewAddress') as HTMLInputElement;
      if (saveCheckbox?.checked) {
        try {
          const res = await userApi.addAddress({
            label: (shipping as any).label || '',
            fullName: shipping.fullName,
            email: user.email,
            phone: shipping.phone,
            doorNo: shipping.doorNo,
            addressLine1: shipping.address,
            landmark: shipping.landmark,
            city: shipping.city,
            state: shipping.state,
            postalCode: shipping.zip,
            country: shipping.country,
          });
          setSavedAddresses(res.data ?? []);
          toast('Address saved!', 'success');
        } catch {
          // Non-blocking
        }
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

  // ── COD Order Placement ─────────────────────────────────────────────────────
  async function handlePlaceCODOrder() {
    if (!user) { navigate('/auth'); return; }

    setSubmitting(true);
    try {
      const orderRes = await orderApi.create({
        shippingAddress: {
          fullName: shipping.fullName,
          email: user.email,
          phone: shipping.phone,
          doorNo: shipping.doorNo,
          addressLine1: shipping.address,
          landmark: shipping.landmark,
          city: shipping.city,
          state: shipping.state,
          postalCode: shipping.zip,
          country: shipping.country,
        },
        paymentMethod: 'cod',
        couponCode: coupon?.code ?? '',
        scheduledDeliveryDate: selectedDate?.toISOString(),
        scheduledDeliverySlot: selectedSlot ? TIME_SLOTS.find(s => s.id === selectedSlot)?.time : undefined,
        deliveryDistance: 0,
        items: items.map(item => ({
          productId: item.product._id || item.product.id,
          variantId: item.variant?._id || item.variant?.id,
          quantity: item.quantity,
        })),
      });
      setOrderNumber(orderRes.data.orderNumber);
      clearCart();
      toast('Order placed successfully! Pay cash on delivery.', 'success');
    } catch (err: any) {
      toast(err.message || 'Order placement failed.', 'error');
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
          <p className="text-gray-500 mb-2">Thank you for your order. Please have the cash ready on delivery.</p>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <p className="text-sm text-gray-500 mb-1">Order Number</p>
            <p className="text-2xl font-black text-amber-600">{orderNumber}</p>

            {/* COD Info Badge */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
              <Banknote className="w-3 h-3" /> Cash on Delivery — Pay {fmt(orderTotal)}
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

            {/* Delivery code note */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-left bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Delivery Verification Code
              </p>
              <p className="text-xs text-blue-700 leading-relaxed">
                A 6-digit verification code will be generated and shown in your order tracking page when your order is out for delivery. Share this code with the delivery agent to confirm receipt.
              </p>
            </div>

            <p className="text-sm text-gray-500 mt-3">A confirmation email will be sent to <strong>{user?.email || shipping.email}</strong></p>
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
        <div className="flex items-center justify-center mb-12 w-full max-w-xl mx-auto px-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex-1 flex items-center relative">
              <div className="flex flex-col items-center gap-1.5 flex-1 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < stepIndex ? 'bg-emerald-500 text-white' : i === stepIndex ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs sm:text-sm font-semibold text-center ${i === stepIndex ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`absolute top-4 left-[calc(50%+1rem)] right-[calc(-50%+1rem)] h-0.5 -translate-y-1/2 z-0 ${i < stepIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
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

                <div>
                  {/* Tabs: Saved / New */}
                  <div className="flex items-center gap-3 mb-4">
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddressMode('saved');
                          setSelectedAddressId(null);
                          setShipping({ ...EMPTY_SHIPPING, email: user?.email || '' });
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-1.5 ${addressMode === 'saved' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        <MapPin className="w-3.5 h-3.5" /> Saved Addresses
                        <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">{savedAddresses.length}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAddressMode('new');
                        setSelectedAddressId(null);
                        setShipping({ ...EMPTY_SHIPPING, email: user?.email || '' });
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all flex items-center gap-1.5 ${addressMode === 'new' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      <Plus className="w-3.5 h-3.5" /> New Address
                    </button>
                  </div>

                  {/* Saved addresses list */}
                  {addressMode === 'saved' && savedAddresses.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {savedAddresses.map((addr: any) => {
                        const isActive = selectedAddressId === addr._id;
                        return (
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
                            className={`w-full text-left p-4 border-2 rounded-xl transition-all ${isActive ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${isActive ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                                {isActive && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {addr.label && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md">
                                      {addr.label === 'Home' ? <Home className="w-3.5 h-3.5" /> : addr.label === 'Work' ? <Building2 className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                                      {addr.label}
                                    </span>
                                  )}
                                  <span className="font-bold text-gray-900 text-sm">{addr.fullName}</span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {addr.doorNo && `${addr.doorNo}, `}{addr.addressLine1}
                                  {addr.addressLine2 && `, ${addr.addressLine2}`}
                                </p>
                                {addr.landmark && <p className="text-xs text-gray-400">Near: {addr.landmark}</p>}
                                <p className="text-xs text-gray-500">{addr.city}, {addr.state} {addr.postalCode}</p>
                                {addr.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {addr.phone}</p>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* New address form */}
                  {addressMode === 'new' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Address Label</label>
                        <div className="flex gap-2">
                          {['Home', 'Work', 'Other'].map(l => (
                            <button key={l} type="button" onClick={() => setShipping(s => ({ ...s, label: l } as any))} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${(shipping as any).label === l ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                              {l === 'Home' ? <Home className="w-3 h-3" /> : l === 'Work' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { key: 'fullName', label: 'Full Name', placeholder: 'John Doe', full: false, required: true },
                          { key: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210', full: false, required: true },
                          { key: 'doorNo', label: 'D.No / Flat No', placeholder: '12-34-56 / Flat 4B', full: false, required: true },
                          { key: 'address', label: 'Street / Area', placeholder: 'MG Road, Banjara Hills', full: true, required: true },
                          { key: 'landmark', label: 'Near Landmark', placeholder: 'Near City Center Mall', full: true, required: false },
                          { key: 'city', label: 'City', placeholder: 'Hyderabad', full: false, required: true },
                          { key: 'state', label: 'State', placeholder: 'Telangana', full: false, required: true },
                          { key: 'zip', label: 'PIN Code', placeholder: '500001', full: false, required: true },
                          { key: 'country', label: 'Country', placeholder: 'India', full: false, required: false },
                        ].map(field => (
                          <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
                            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                              {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                            </label>
                            <input
                              type="text"
                              value={shipping[field.key as keyof ShippingForm] || ''}
                              onChange={e => setShipping(s => ({ ...s, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              required={field.required}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" id="saveNewAddress" defaultChecked className="w-4 h-4 accent-amber-500 rounded" />
                          <span className="text-sm text-gray-600 font-medium">Save this address for future orders</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {addressMode === 'saved' && !selectedAddressId && (
                  <p className="mt-3 text-xs text-amber-600 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Please select a saved address to continue.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={addressMode === 'saved' && !selectedAddressId}
                  className="mt-6 w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Schedule <ChevronRight className="w-4 h-4" />
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
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{shipping.fullName}</p>
                    <p className="text-sm text-gray-600">
                      {shipping.doorNo && `${shipping.doorNo}, `}{shipping.address}
                    </p>
                    {shipping.landmark && <p className="text-xs text-gray-500">Near: {shipping.landmark}</p>}
                    <p className="text-sm text-gray-600">{shipping.city}, {shipping.state} {shipping.zip}</p>
                    {(shipping.phone || user?.email || shipping.email) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {shipping.phone}{shipping.phone && (user?.email || shipping.email) && ' · '}{user?.email || shipping.email}
                      </p>
                    )}
                  </div>
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

                {/* COD Payment info */}
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Banknote className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-amber-800">Cash on Delivery</p>
                      <p className="text-xs text-amber-700">Pay when your order arrives at your door</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <div className="flex items-start gap-2">
                      <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        A 6-digit verification code will be sent to your tracking page once your order is out for delivery. Share it with the delivery agent to confirm receipt.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setStep('schedule')} className="flex-1 py-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handlePlaceCODOrder}
                    disabled={submitting}
                    className="flex-1 py-4 bg-amber-500 text-white font-bold text-lg rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-200 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <Package className="w-5 h-5" />
                        Place Order — {fmt(orderTotal)}
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-3 p-3 bg-gray-50 rounded-xl flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500">No online payment needed. Pay <strong>{fmt(orderTotal)}</strong> in cash when your delivery arrives.</p>
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

              {/* Coupon Code Entry */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                {coupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Coupon Applied</p>
                      <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">{coupon.code}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeCoupon();
                        loadAvailableCoupons();
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase outline-none"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Promo Code"
                        value={couponCodeDraft}
                        onChange={e => setCouponCodeDraft(e.target.value.toUpperCase())}
                        disabled={applyingCoupon}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs uppercase tracking-wider outline-none focus:border-amber-500 bg-white"
                      />
                      <button
                        type="submit"
                        disabled={applyingCoupon || !couponCodeDraft.trim()}
                        className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50"
                      >
                        {applyingCoupon ? '...' : 'Apply'}
                      </button>
                    </form>

                    {/* Available Coupons list */}
                    {availableCoupons.length > 0 && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setShowCouponsList(!showCouponsList)}
                          className="flex items-center justify-between w-full text-left text-xs font-bold text-gray-500 hover:text-amber-600 transition-colors uppercase py-1 outline-none"
                        >
                          <span className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            Available Coupons ({availableCoupons.length})
                          </span>
                          <span className="text-[10px] font-bold">
                            {showCouponsList ? 'Hide' : 'Show'}
                          </span>
                        </button>

                        {showCouponsList && (
                          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1 py-1 scroll-smooth">
                            {availableCoupons.map((couponItem) => {
                              const isEligible = subtotal >= (couponItem.minimumOrderAmount ?? 0);
                              return (
                                <div
                                  key={couponItem._id}
                                  onClick={() => {
                                    if (applyingCoupon) return;
                                    if (!isEligible) {
                                      toast(`Add ₹${couponItem.minimumOrderAmount - subtotal} more to apply this coupon`, 'warning');
                                      return;
                                    }
                                    handleApplyDirectly(couponItem.code);
                                  }}
                                  className={`group relative border border-dashed rounded-xl p-2.5 transition-all flex items-center justify-between ${
                                    isEligible
                                      ? 'border-gray-200 hover:border-amber-400 bg-gray-50/50 hover:bg-amber-50/40 cursor-pointer'
                                      : 'border-gray-100 bg-gray-50/10 opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  <div className="flex-1 pr-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-[11px] text-gray-800 bg-white border border-gray-200 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                                        {couponItem.code}
                                      </span>
                                      <span className={`text-[10px] font-black ${isEligible ? 'text-amber-600' : 'text-gray-500'}`}>
                                        {couponItem.discountType === 'percentage'
                                          ? `${couponItem.discountValue}% OFF`
                                          : `₹${couponItem.discountValue} OFF`}
                                      </span>
                                    </div>
                                    {couponItem.description && (
                                      <p className="text-[10px] text-gray-500 mt-1 font-medium leading-tight">
                                        {couponItem.description}
                                      </p>
                                    )}
                                    {couponItem.minimumOrderAmount > 0 && (
                                      <p className="text-[9px] text-gray-400 mt-0.5 font-medium">
                                        Min order: ₹{couponItem.minimumOrderAmount}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className={`text-[10px] font-black px-2 py-1 rounded-lg transition-all ${
                                      isEligible
                                        ? 'text-amber-600 bg-white border border-amber-200 hover:bg-amber-500 hover:text-white'
                                        : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
                                    }`}
                                  >
                                    Apply
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                 {discount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{fmt(discount)}</span></div>}
                 <div className="flex justify-between text-sm text-gray-600"><span>Shipping</span><span>{shippingCost === 0 ? 'Free' : fmt(shippingCost)}</span></div>
                 <div className="flex justify-between text-sm text-gray-600"><span>GST (18%)</span><span>{fmt(tax)}</span></div>
                 <div className="flex justify-between font-black text-gray-900 text-lg pt-2 border-t border-gray-200"><span>Total</span><span>{fmt(orderTotal)}</span></div>
              </div>

              {/* COD badge in sidebar */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 font-semibold">Cash on Delivery — pay when it arrives!</p>
                </div>
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
