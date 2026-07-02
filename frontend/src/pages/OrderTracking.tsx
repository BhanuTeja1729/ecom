import { useState, useEffect } from 'react';
import { Package, Search, Truck, CheckCircle, Clock, MapPin, CalendarDays, Shield, CreditCard, ChevronRight, RefreshCw, Copy, Check, ArrowLeft, Phone, Mail, ShoppingBag, XCircle, AlertTriangle, KeyRound, Banknote } from 'lucide-react';
import { orderApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../lib/router';
import { Badge } from '../components/ui/Badge';



const STEPS = [
  { status: 'pending', label: 'Placed', icon: Clock, desc: 'Your order has been received and is awaiting confirmation' },
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle, desc: 'Payment verified and order confirmed' },
  { status: 'processing', label: 'Processing', icon: Package, desc: 'Your order is being prepared for delivery' },
  { status: 'shipped', label: 'Shipped', icon: Truck, desc: 'Out for delivery to your address' },
  { status: 'delivered', label: 'Delivered', icon: MapPin, desc: 'Successfully delivered to you' },
];

const ORDER_STATUS_BADGE: Record<string, 'default'|'success'|'warning'|'error'|'dark'> = {
  pending: 'warning', confirmed: 'default', processing: 'default',
  shipped: 'dark', delivered: 'success', cancelled: 'error', refunded: 'error',
};

const PAYMENT_STATUS_BADGE: Record<string, 'default'|'success'|'warning'|'error'|'dark'> = {
  pending: 'warning', paid: 'success', failed: 'error', refunded: 'error',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function OrderTracking() {
  const { user } = useAuth();
  const { query, navigate } = useRouter();


  const [orderNum, setOrderNum] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('Defective Item');
  const [returnDescription, setReturnDescription] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  async function handleRequestReturn() {
    if (!order) return;
    setSubmittingReturn(true);
    try {
      const res = await orderApi.requestReturn(order.orderNumber, returnReason, returnDescription || undefined);
      setOrder(res.data);
      setShowReturnModal(false);
      setReturnReason('Defective Item');
      setReturnDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to request return.');
    } finally {
      setSubmittingReturn(false);
    }
  }

  // Auto-load order from query param
  useEffect(() => {
    const orderFromQuery = query.get('order');
    if (orderFromQuery) {
      setOrderNum(orderFromQuery);
      loadOrder(orderFromQuery);
    }
  }, [query]);

  // Load recent orders for logged-in users
  useEffect(() => {
    if (user && !order) {
      setLoadingRecent(true);
      orderApi.list()
        .then(r => setRecentOrders((r.data ?? []).slice(0, 5)))
        .catch(() => {})
        .finally(() => setLoadingRecent(false));
    }
  }, [user, order]);

  async function loadOrder(num: string) {
    if (!num.trim()) return;
    setLoading(true); setError(''); setOrder(null);
    try {
      const res = await orderApi.get(num.trim().toUpperCase());
      setOrder(res.data);
    } catch {
      setError('Order not found. Please check your order number and try again.');
    } finally { setLoading(false); }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await loadOrder(orderNum);
  }

  async function handleRefresh() {
    if (!order) return;
    setRefreshing(true);
    try {
      const res = await orderApi.get(order.orderNumber);
      setOrder(res.data);
    } catch { /* ignore */ }
    finally { setRefreshing(false); }
  }

  function handleCopyOrderNumber() {
    if (!order) return;
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSelectRecentOrder(orderNumber: string) {
    setOrderNum(orderNumber);
    loadOrder(orderNumber);
  }

  async function handleCancelOrder() {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await orderApi.cancel(order.orderNumber, cancelReason || undefined);
      setOrder(res.data);
      setShowCancelConfirm(false);
      setCancelReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = order && ['pending', 'confirmed'].includes(order.status) && !order.assignedDeliveryPartner;

  const currentStepIndex = order ? STEPS.findIndex(s => s.status === order.status) : -1;
  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');
  const isReturnRequested = order?.status === 'return_requested';
  const isReturnedRefund = order?.status === 'refunded' && !!order?.returnReason;
  const isCancelled = (order?.status === 'cancelled' || order?.status === 'refunded') && !isReturnedRefund;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Truck className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-gray-500">Enter your order number to get real-time delivery updates</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-200 p-5 mb-8 shadow-sm">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={orderNum}
                onChange={e => setOrderNum(e.target.value)}
                placeholder="Enter order number (e.g. ORD-ABC123)"
                className="flex-1 text-sm text-gray-900 outline-none placeholder-gray-400"
              />
            </div>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center gap-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Searching...</>
              ) : 'Track'}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-red-500 text-xs font-bold">!</span>
              </div>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </form>

        {/* Recent orders for logged-in users (when no order is selected) */}
        {!order && !loading && user && recentOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" /> Your Recent Orders
            </h3>
            <div className="space-y-2">
              {recentOrders.map((ro: any) => {
                const badge = ORDER_STATUS_BADGE[ro.status] ?? 'default';
                return (
                  <button
                    key={ro._id}
                    onClick={() => handleSelectRecentOrder(ro.orderNumber)}
                    className="w-full flex items-center justify-between p-3.5 border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 rounded-xl transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{ro.orderNumber}</p>
                        <p className="text-xs text-gray-500">{ro.items?.length ?? 0} item(s) · {fmt(ro.total)} · {timeAgo(ro.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={badge} size="sm">
                        {ro.status.charAt(0).toUpperCase() + ro.status.slice(1)}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-100 rounded w-48 mb-4" />
              <div className="h-16 bg-gray-100 rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-32 mb-3" />
              <div className="h-24 bg-gray-100 rounded-xl" />
            </div>
          </div>
        )}

        {/* Order details */}
        {order && (
          <div className="space-y-5">
            {/* Back button */}
            <button
              onClick={() => { setOrder(null); setOrderNum(''); setError(''); }}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-amber-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Search another order
            </button>

            {/* Order header card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Order Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black text-amber-600">{order.orderNumber}</p>
                    <button
                      onClick={handleCopyOrderNumber}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy order number"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 border border-gray-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all disabled:opacity-50"
                    title="Refresh status"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Placed on</p>
                    <p className="font-semibold text-gray-900 text-sm">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Status badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <Badge variant={ORDER_STATUS_BADGE[order.status] ?? 'default'} size="md">
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                <Badge variant={PAYMENT_STATUS_BADGE[order.paymentStatus] ?? 'default'} size="md">
                  <CreditCard className="w-3 h-3 mr-1 inline" />
                  {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus?.charAt(0).toUpperCase() + (order.paymentStatus?.slice(1) ?? '')}
                </Badge>
                {order.trackingNumber && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                    <Truck className="w-3 h-3" /> {order.trackingNumber}
                  </span>
                )}
                {/* Cancel button — only for cancellable orders */}
                {canCancel && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-3 h-3" /> Cancel Order
                  </button>
                )}
                {/* Return button — only for delivered orders that haven't been returned/refunded */}
                {order.status === 'delivered' && order.paymentStatus !== 'refunded' && (
                  <button
                    onClick={() => setShowReturnModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-200 hover:bg-amber-150 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Return / Refund (Defect)
                  </button>
                )}
              </div>

              {/* Return Modal */}
              {showReturnModal && (
                <div className="mb-4 p-5 bg-amber-50/50 border-2 border-amber-200 rounded-2xl animate-in space-y-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                    <p className="font-black text-amber-900 text-base">Request Return & Refund for Defective Order</p>
                  </div>
                  <p className="text-xs text-amber-700 font-medium">
                    If your order has a defect, you can request a refund. We will assign a delivery partner to collect the package from you. Please select the reason and describe the defect.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Reason for Return</label>
                      <select
                        value={returnReason}
                        onChange={e => setReturnReason(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:border-amber-500 outline-none font-semibold text-gray-850"
                      >
                        <option value="Defective Item">Defective Item / Functional Failure</option>
                        <option value="Item Damaged on Arrival">Package / Item Damaged on Arrival</option>
                        <option value="Incorrect Item Received">Wrong / Incorrect Item Received</option>
                        <option value="Poor Quality">Quality not as expected</option>
                        <option value="Other">Other Reason</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 block">Describe the defect / issue (optional)</label>
                      <textarea
                        value={returnDescription}
                        onChange={e => setReturnDescription(e.target.value)}
                        placeholder="Provide details about the defect in the product..."
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:border-amber-500 outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={handleRequestReturn}
                      disabled={submittingReturn}
                      className="px-5 py-2.5 bg-gray-900 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
                    >
                      {submittingReturn ? (
                        <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                      ) : (
                        <><Check className="w-3.5 h-3.5" /> Submit Return Request</>
                      )}
                    </button>
                    <button
                      onClick={() => { setShowReturnModal(false); setReturnReason('Defective Item'); setReturnDescription(''); }}
                      className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-55 transition-colors bg-white shadow-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel confirmation dialog */}
              {showCancelConfirm && (
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-in">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <p className="font-bold text-red-800 text-sm">Are you sure you want to cancel this order?</p>
                  </div>
                  <p className="text-xs text-red-600 mb-3 ml-7">This action cannot be undone. Your payment will be refunded if applicable.</p>
                  <div className="ml-7 mb-3">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Reason (optional)</label>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="e.g. Changed my mind, ordered by mistake..."
                      className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 bg-white"
                    />
                  </div>
                  <div className="ml-7 flex gap-2">
                    <button
                      onClick={handleCancelOrder}
                      disabled={cancelling}
                      className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {cancelling ? (
                        <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Cancelling...</>
                      ) : (
                        <><XCircle className="w-3.5 h-3.5" /> Yes, Cancel Order</>
                      )}
                    </button>
                    <button
                      onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }}
                      className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Keep Order
                    </button>
                  </div>
                </div>
              )}

              {/* Progress tracker */}
              {!isCancelled && !isReturnRequested && !isReturnedRefund && (
                <div className="relative pt-2 pb-4">
                  {/* Progress bar background */}
                  <div className="absolute top-7 left-0 right-0 h-1 bg-gray-100 rounded-full mx-8" />
                  {/* Active progress bar */}
                  <div
                    className="absolute top-7 left-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full mx-8 transition-all duration-1000 ease-out"
                    style={{ width: `calc(${currentStepIndex >= 0 ? (currentStepIndex / (STEPS.length - 1)) * 100 : 0}% - 4rem)` }}
                  />

                  <div className="relative flex justify-between">
                    {STEPS.map((step, i) => {
                      const isCompleted = i <= currentStepIndex;
                      const isCurrent = i === currentStepIndex;
                      const Icon = step.icon;
                      return (
                        <div key={step.status} className="flex flex-col items-center flex-1 group">
                          <div className={`
                            w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 relative z-10
                            ${isCompleted
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-400 text-white shadow-lg shadow-amber-200/50'
                              : 'bg-white border-gray-200 text-gray-300'
                            }
                            ${isCurrent ? 'ring-4 ring-amber-100 scale-110' : ''}
                          `}>
                            {isCompleted && !isCurrent ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                            {isCurrent && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
                            )}
                          </div>
                          <p className={`text-xs font-bold mt-2.5 text-center transition-colors ${isCompleted ? 'text-amber-600' : 'text-gray-300'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-[10px] text-amber-500 mt-0.5 text-center hidden sm:block max-w-[100px]">
                              {step.desc}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Return Tracking UI */}
              {isReturnRequested && (
                <div className="border-t border-gray-100 pt-6 mt-6 space-y-6">
                  {/* Return status description banner */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce-slow" />
                    <div>
                      <p className="font-bold text-amber-800 text-sm">Return & Refund Request Active</p>
                      <p className="text-xs text-amber-750 mt-1 font-medium leading-relaxed">
                        You requested a return for this order due to: <span className="font-bold text-amber-900">"{order.returnReason}"</span>.
                        {order.returnDescription && <span> Description: "{order.returnDescription}"</span>}
                      </p>
                    </div>
                  </div>

                  {/* Return code banner */}
                  {order.returnCode && (
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-lg text-white">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <KeyRound className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-black text-lg">Return Verification Code</p>
                          <p className="text-indigo-255 text-xs">Share this code with the delivery partner when they pick up your return package</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 my-4">
                        {order.returnCode.split('').map((digit: string, i: number) => (
                          <div
                            key={i}
                            className="w-12 h-14 bg-white/20 backdrop-blur border-2 border-white/30 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-inner"
                          >
                            {digit}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-4 p-3 bg-white/10 rounded-xl">
                        <Shield className="w-4 h-4 text-indigo-200 shrink-0" />
                        <p className="text-xs text-indigo-100">
                          <strong>Verify Package Collection:</strong> Share this code only after handing over the defective item(s) to the delivery agent. The agent will enter it to verify pickup, and your refund will be completed automatically.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Return Progress Timeline */}
                  <div className="relative pt-2 pb-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 text-center sm:text-left">Return Progress</h4>
                    {/* Progress bar background */}
                    <div className="absolute top-11 left-0 right-0 h-1 bg-gray-100 rounded-full mx-8 hidden sm:block" />
                    
                    {/* Active progress bar */}
                    <div
                      className="absolute top-11 left-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full mx-8 transition-all duration-1000 ease-out hidden sm:block"
                      style={{ width: order.assignedDeliveryPartner ? '50%' : '0%' }}
                    />

                    <div className="relative flex flex-col sm:flex-row justify-between gap-6 sm:gap-0">
                      {[
                        { label: 'Return Requested', active: true, desc: 'Return initiated for defective item' },
                        { label: 'Agent Assigned', active: !!order.assignedDeliveryPartner, desc: order.assignedDeliveryPartner ? 'A pickup agent has claimed your return pickup task' : 'Awaiting assignment of a pickup agent' },
                        { label: 'Refund Completed', active: false, desc: 'Will be completed once agent collects package' }
                      ].map((step, idx) => {
                        return (
                          <div key={idx} className="flex flex-row sm:flex-col items-center sm:flex-1 gap-3 sm:gap-0 group">
                            <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 relative z-10 shrink-0
                              ${step.active
                                ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-400 text-white shadow-md'
                                : 'bg-white border-gray-200 text-gray-300'
                              }
                            `}>
                              {step.active ? <Check className="w-4 h-4" /> : <span>{idx + 1}</span>}
                            </div>
                            <div className="sm:text-center mt-0 sm:mt-2.5">
                              <p className={`text-xs font-bold transition-colors ${step.active ? 'text-amber-600 font-black' : 'text-gray-400'}`}>
                                {step.label}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5 max-w-[150px]">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Cancelled/Refunded status */}
              {isCancelled && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="font-bold text-red-700 text-sm">
                    This order has been {order.status}.
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    A refund has been initiated to your original payment method. If you have questions, please contact our support team.
                  </p>
                </div>
              )}

              {/* Returned & Refunded status */}
              {isReturnedRefund && (
                <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex gap-3 items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 animate-pulse" />
                  <div>
                    <p className="font-black text-emerald-800 text-sm">Return Completed & Refunded</p>
                    <p className="text-xs text-emerald-700 mt-0.5 font-medium leading-relaxed">
                      Your return package has been collected and verified by our delivery partner. A refund of <strong>{fmt(order.total)}</strong> has been processed to your original payment method.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Scheduled delivery info */}
            {(order.scheduledDeliveryDate || order.scheduledDeliverySlot) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-800">Scheduled Delivery</p>
                    <p className="text-xs text-blue-600">Your delivery is scheduled for:</p>
                  </div>
                </div>
                <div className="ml-10 space-y-1">
                  {order.scheduledDeliveryDate && (
                    <p className="font-bold text-gray-900">
                      {formatDate(order.scheduledDeliveryDate)}
                    </p>
                  )}
                  {order.scheduledDeliverySlot && (
                    <p className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      {order.scheduledDeliverySlot}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Verification Code — shown when order is out for delivery */}
            {order.status === 'shipped' && order.deliveryCode && (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-lg text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-lg">Delivery Verification Code</p>
                    <p className="text-indigo-200 text-xs">Share this code with your delivery agent to confirm receipt</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 my-4">
                  {order.deliveryCode.split('').map((digit: string, i: number) => (
                    <div
                      key={i}
                      className="w-12 h-14 bg-white/20 backdrop-blur border-2 border-white/30 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-inner"
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-4 p-3 bg-white/10 rounded-xl">
                  <Shield className="w-4 h-4 text-indigo-200 shrink-0" />
                  <p className="text-xs text-indigo-100">
                    <strong>Do not share</strong> this code until the delivery agent is at your door and you have received your items. This code is required to complete the delivery.
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Code Pending info — when shipped but code not yet visible */}
            {order.status === 'shipped' && !order.deliveryCode && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-800">Delivery Code Generating...</p>
                    <p className="text-xs text-indigo-600">Your 6-digit delivery code will appear here once the delivery partner picks up your order.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status history timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Status Timeline
                </h3>
                <div className="relative ml-4">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-100" />

                  <div className="space-y-5">
                    {[...order.statusHistory].reverse().map((event: any, i: number) => {
                      const isLatest = i === 0;
                      return (
                        <div key={i} className="flex items-start gap-4 relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
                            isLatest
                              ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200/50'
                              : 'bg-white border-gray-200 text-gray-400'
                          }`}>
                            {isLatest ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-bold ${isLatest ? 'text-gray-900' : 'text-gray-600'}`}>
                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                              </p>
                              <span className="text-xs text-gray-400">
                                {timeAgo(event.timestamp)}
                              </span>
                            </div>
                            {event.message && (
                              <p className="text-xs text-gray-500 mt-0.5">{event.message}</p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {formatDateTime(event.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Order items */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Items ({order.items?.length ?? 0})
              </h3>
              <div className="space-y-3 mb-5">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="w-14 h-14 bg-gray-200 rounded-xl overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-xs text-gray-500">{item.variantName}</p>
                      )}
                      <p className="text-xs text-gray-400">Qty: {item.quantity} × {fmt(item.price)}</p>
                    </div>
                    <p className="font-bold text-gray-900 shrink-0">{fmt(item.total)}</p>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount {order.couponCode && <span className="text-xs bg-emerald-100 px-1.5 py-0.5 rounded font-bold ml-1">{order.couponCode}</span>}</span>
                    <span>-{fmt(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Shipping</span><span>{order.shippingAmount === 0 ? <span className="text-emerald-600 font-bold">Free</span> : fmt(order.shippingAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Handling Fee</span>
                  <span>{order.taxAmount === 0 ? <span className="text-emerald-600 font-semibold">Free</span> : fmt(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-lg pt-3 border-t border-gray-200">
                  <span>Total</span><span>{fmt(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Shipping address & Payment info side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Shipping address */}
              {order.shippingAddress && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-amber-500" /> Delivery Address
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1.5">
                    <p className="font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.doorNo && `${order.shippingAddress.doorNo}, `}{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                    {order.shippingAddress.landmark && <p className="text-xs text-gray-500">Near: {order.shippingAddress.landmark}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                    {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                  </div>
                  {(order.shippingAddress.phone || order.shippingAddress.email) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      {order.shippingAddress.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> {order.shippingAddress.phone}
                        </p>
                      )}
                      {order.shippingAddress.email && (
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Mail className="w-3 h-3" /> {order.shippingAddress.email}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment info */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-amber-500" /> Payment Details
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Method</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : order.paymentMethod ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Status</span>
                    <Badge variant={PAYMENT_STATUS_BADGE[order.paymentStatus] ?? 'default'} size="sm">
                      {order.paymentStatus?.charAt(0).toUpperCase() + (order.paymentStatus?.slice(1) ?? '')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Amount</span>
                    <span className="text-sm font-black text-gray-900">{fmt(order.total)}</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Need help */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-600 mb-2">
                Need help with your order?
              </p>
              <a
                href="/about#contact"
                onClick={e => { e.preventDefault(); navigate('/about#contact'); }}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors"
              >
                Contact our support team <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Empty state when no order and no recent orders */}
        {!order && !loading && (!user || recentOrders.length === 0) && !error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">
              Enter your order number above to track your delivery
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
