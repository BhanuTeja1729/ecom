import { useState, useEffect, useCallback } from 'react';
import { Truck, Calendar, MapPin, User, DollarSign, CheckCircle2, Clock, Phone, Navigation, ArrowRight, LogOut, PackageOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../lib/router';
import { useToast } from '../contexts/ToastContext';
import { deliveryApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';

type Tab = 'overview' | 'active' | 'available' | 'history' | 'profile';

const ORDER_STATUS_DETAILS: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'dark'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending Payment' },
  confirmed: { variant: 'default', label: 'Confirmed' },
  processing: { variant: 'default', label: 'Preparing Pickup' },
  shipped: { variant: 'dark', label: 'Out for Delivery' },
  delivered: { variant: 'success', label: 'Delivered' },
  cancelled: { variant: 'error', label: 'Cancelled' },
  refunded: { variant: 'error', label: 'Refunded' },
};

export function DeliveryDashboard() {
  const { user, signOut, loading } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>({ completedCount: 0, activeCount: 0, totalEarnings: 0, deliveryRatePerKm: 15 });
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Authentication guard: only delivery_partner and admin roles allowed
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && user.role !== 'delivery_partner' && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const loadStats = useCallback(async () => {
    try {
      const res = await deliveryApi.getStats();
      if (res.success) setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadActiveOrders = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await deliveryApi.getAssignedOrders('active');
      if (res.success) setActiveOrders(res.data ?? []);
    } catch { /* ignore */ } finally { setDataLoading(false); }
  }, []);

  const loadAvailableOrders = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await deliveryApi.getAvailableOrders();
      if (res.success) setAvailableOrders(res.data ?? []);
    } catch { /* ignore */ } finally { setDataLoading(false); }
  }, []);

  const loadHistoryOrders = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await deliveryApi.getAssignedOrders('completed');
      if (res.success) setHistoryOrders(res.data ?? []);
    } catch { /* ignore */ } finally { setDataLoading(false); }
  }, []);

  // Fetch data depending on tab
  useEffect(() => {
    if (!user) return;
    loadStats();
    if (tab === 'overview') {
      loadActiveOrders();
    } else if (tab === 'active') {
      loadActiveOrders();
    } else if (tab === 'available') {
      loadAvailableOrders();
    } else if (tab === 'history') {
      loadHistoryOrders();
    }
  }, [tab, user, loadStats, loadActiveOrders, loadAvailableOrders, loadHistoryOrders]);

  // Action: Claim / Accept Delivery Order
  async function handleClaimOrder(orderId: string, orderNumber: string) {
    setActionLoading(orderId);
    try {
      const res = await deliveryApi.claimOrder(orderId);
      if (res.success) {
        toast(`Order #${orderNumber} claimed successfully!`, 'success');
        setTab('active');
        loadActiveOrders();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to claim order', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // Action: Update Delivery Status (e.g. processing -> shipped -> delivered)
  async function handleUpdateStatus(orderId: string, status: 'shipped' | 'delivered', orderNumber: string) {
    setActionLoading(orderId);
    try {
      const msg = status === 'shipped'
        ? 'Order has been picked up and is out for delivery.'
        : 'Order delivered and verified by delivery agent.';

      const res = await deliveryApi.updateStatus(orderId, status, msg);
      if (res.success) {
        toast(`Order #${orderNumber} updated to ${status === 'shipped' ? 'Out for Delivery' : 'Delivered'}!`, 'success');
        loadStats();
        loadActiveOrders();
        if (status === 'delivered') {
          setTab('history');
        }
      }
    } catch (err: any) {
      toast(err.message || 'Failed to update order status', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');
  const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Truck },
    { id: 'active', label: `My Deliveries (${activeOrders.length})`, icon: Clock },
    { id: 'available', label: `Available Orders (${availableOrders.length})`, icon: PackageOpen },
    { id: 'history', label: 'Delivery History', icon: CheckCircle2 },
    { id: 'profile', label: 'My Profile', icon: User },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-5 h-5 text-amber-500" />
              <span className="text-amber-600 font-semibold text-sm">Delivery Partner Portal</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900">Portal Dashboard</h1>
            <p className="text-gray-500 mt-0.5">Welcome back, {user.fullName}</p>
          </div>
          <button onClick={() => { signOut(); navigate('/'); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:border-red-300 hover:text-red-500 transition-all bg-white shadow-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id as Tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left ${tab === id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{label}</span>
                </button>
              ))}
            </nav>

            {/* Quick Profile Summary Card */}
            <div className="mt-6 bg-gradient-to-br from-gray-900 to-amber-950 rounded-2xl p-5 text-white shadow-lg hidden lg:block">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold truncate text-sm">{user.fullName}</h4>
                  <p className="text-xs text-amber-400 font-semibold">Active Agent</p>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Email:</span>
                  <span className="font-semibold truncate max-w-[130px]">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Phone:</span>
                    <span className="font-semibold">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Area */}
          <main className="flex-1 min-w-0">
            {/* ── Tab: Overview ── */}
            {tab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {[
                    { label: 'Total Earnings', value: fmt(stats.totalEarnings ?? 0), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', desc: `Rate: ₹${stats.deliveryRatePerKm}/km` },
                    { label: 'Active Deliveries', value: stats.activeCount ?? 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', desc: 'In progress shipments' },
                    { label: 'Completed Deliveries', value: stats.completedCount ?? 0, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', desc: 'Successfully delivered' },
                  ].map(({ label, value, icon: Icon, color, bg, border, desc }) => (
                    <div key={label} className={`bg-white rounded-2xl border ${border} p-6 shadow-sm hover:shadow-md transition-all`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-gray-500 font-black uppercase tracking-wider">{label}</span>
                        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                      </div>
                      <p className="text-3xl font-black text-gray-900 mb-1">{value}</p>
                      <p className="text-xs text-gray-400 font-medium">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Main panel - Quick Actions & Map */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm md:col-span-3">
                    <h3 className="text-lg font-black text-gray-900 mb-4">Quick Delivery Console</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button onClick={() => setTab('available')} className="flex flex-col p-4 border border-gray-100 rounded-xl hover:border-amber-400 hover:bg-amber-50 text-left transition-all group">
                        <PackageOpen className="w-8 h-8 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-sm text-gray-900">Claim Shipments</span>
                        <span className="text-xs text-gray-500 mt-1">Claim {availableOrders.length} unassigned order(s) near you</span>
                      </button>
                      <button onClick={() => setTab('active')} className="flex flex-col p-4 border border-gray-100 rounded-xl hover:border-amber-400 hover:bg-amber-50 text-left transition-all group">
                        <Truck className="w-8 h-8 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-sm text-gray-900">My Route Map</span>
                        <span className="text-xs text-gray-500 mt-1">Track details and progress of your {activeOrders.length} active delivery task(s)</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg md:col-span-2 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-lg mb-2">Delivery Partner Guidelines</h4>
                      <p className="text-xs text-amber-50 leading-relaxed">
                        Please confirm your vehicle readiness before starting. Always wear protective masks/helmets, follow safety protocols, and check the customer's preferred delivery time slot before calling.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-bold border-t border-white/20 pt-4">
                      <span>BLIPZO Dispatch Support</span>
                      <a href="tel:+917006464761" className="flex items-center gap-1 hover:underline">
                        <Phone className="w-3.5 h-3.5" /> Call Support
                      </a>
                    </div>
                  </div>
                </div>

                {/* Recent active orders */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-black text-gray-900">Current Task Summary</h3>
                    <button onClick={() => setTab('active')} className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-0.5">
                      Go to Active <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  {activeOrders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      No active deliveries currently. Claim orders in the "Available Orders" tab.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {activeOrders.slice(0, 3).map((order) => (
                        <div key={order._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                              <Badge variant={ORDER_STATUS_DETAILS[order.status]?.variant ?? 'default'}>
                                {ORDER_STATUS_DETAILS[order.status]?.label ?? order.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
                            </p>
                          </div>
                          <div className="text-right">
                            {order.scheduledDeliveryDate && (
                              <p className="text-xs text-gray-900 font-bold mb-1">
                                {fmtDate(order.scheduledDeliveryDate)}
                              </p>
                            )}
                            {order.scheduledDeliverySlot && (
                              <p className="text-[11px] text-amber-600 font-semibold">
                                {order.scheduledDeliverySlot}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Active Deliveries ── */}
            {tab === 'active' && (
              <div className="space-y-6">
                <h2 className="text-xl font-black text-gray-900">My Active Shipments ({activeOrders.length})</h2>
                {dataLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-48 bg-white rounded-2xl border border-gray-200 animate-pulse shadow-sm" />)}
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                    <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-900 mb-2">No active deliveries</p>
                    <p className="text-gray-500 text-sm mb-6">Check the unassigned order board to claim a shipping task.</p>
                    <button onClick={() => setTab('available')} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
                      View Available Orders
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {activeOrders.map((order) => {
                      const statusDetail = ORDER_STATUS_DETAILS[order.status] ?? { variant: 'default', label: order.status };
                      const itemsText = order.items?.map((item: any) => `${item.productName} (x${item.quantity})`).join(', ');

                      return (
                        <div key={order._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:border-amber-200 transition-colors p-6">
                          {/* Order Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-gray-900">#{order.orderNumber}</h3>
                                <Badge variant={statusDetail.variant}>{statusDetail.label}</Badge>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Ordered on {fmtDate(order.createdAt)}</p>
                            </div>
                            <div className="flex flex-col sm:text-right">
                              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Estimated Pay</span>
                              <span className="text-lg font-black text-emerald-600">{fmt(order.deliveryPayout ?? stats.deliveryRatePerKm ?? 50)}</span>
                            </div>
                          </div>

                          {/* Customer & Address Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Customer & Contact</h4>
                              <p className="font-bold text-gray-900 text-sm mb-1">{order.shippingAddress.fullName || order.user?.fullName || 'Guest Customer'}</p>
                              <div className="space-y-1.5 mt-2">
                                {order.shippingAddress.phone && (
                                  <a href={`tel:${order.shippingAddress.phone}`} className="flex items-center gap-2 text-xs font-semibold text-amber-600 hover:underline">
                                    <Phone className="w-3.5 h-3.5 shrink-0" />
                                    {order.shippingAddress.phone}
                                  </a>
                                )}
                                <p className="flex items-center gap-2 text-xs text-gray-500">
                                  <User className="w-3.5 h-3.5 shrink-0" />
                                  {order.shippingAddress.email || order.guestEmail || order.user?.email || 'No email registered'}
                                </p>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Delivery Slot & Destination</h4>
                              <div className="flex items-start gap-2 text-sm text-gray-900 font-bold mb-2">
                                <Calendar className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                  <p>{order.scheduledDeliveryDate ? fmtDate(order.scheduledDeliveryDate) : 'Not Scheduled'}</p>
                                  {order.scheduledDeliverySlot && (
                                    <p className="text-xs text-amber-600 font-semibold mt-0.5">{order.scheduledDeliverySlot}</p>
                                  )}
                                </div>
                              </div>
                              <p className="flex items-start gap-2 text-xs text-gray-500 mt-2">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <span>
                                  {order.shippingAddress.addressLine1}
                                  {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
                                  <br />
                                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Shipment items */}
                          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-xs">
                            <span className="font-bold text-gray-500 uppercase tracking-wider block mb-1">Items ({order.items?.length ?? 0}):</span>
                            <p className="text-gray-700 font-medium leading-relaxed">{itemsText}</p>
                            {order.notes && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <span className="font-bold text-amber-700 block">Customer Note:</span>
                                <p className="text-amber-800 italic mt-0.5">{order.notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Step Tracker Visual */}
                          <div className="mb-6">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Delivery Progress</h4>
                            <div className="flex items-center w-full">
                              {[
                                { statusKey: 'processing', label: 'Assigned' },
                                { statusKey: 'shipped', label: 'Out for Delivery' },
                                { statusKey: 'delivered', label: 'Delivered' }
                              ].map((step, idx) => {
                                const statuses = ['processing', 'shipped', 'delivered'];
                                const currentIdx = statuses.indexOf(order.status);
                                const stepIdx = statuses.indexOf(step.statusKey);
                                const isCompleted = stepIdx <= currentIdx;
                                const isActive = stepIdx === currentIdx;

                                return (
                                  <div key={step.statusKey} className="flex items-center flex-1 last:flex-initial">
                                    <div className="flex flex-col items-center relative">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${isCompleted ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'
                                        } ${isActive ? 'ring-4 ring-amber-100 scale-110' : ''}`}>
                                        {stepIdx < currentIdx ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                      </div>
                                      <span className={`text-[10px] font-bold mt-1.5 absolute top-8 whitespace-nowrap ${isActive ? 'text-amber-600 font-black' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                                        }`}>
                                        {step.label}
                                      </span>
                                    </div>
                                    {idx < 2 && (
                                      <div className={`h-1 flex-1 mx-2 rounded-full transition-all ${stepIdx < currentIdx ? 'bg-amber-500' : 'bg-gray-200'
                                        }`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Actions Console */}
                          <div className="border-t border-gray-100 pt-5 mt-10 flex flex-wrap gap-3 items-center justify-between">
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(`${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-700 bg-white transition-all shadow-sm"
                            >
                              <Navigation className="w-3.5 h-3.5 text-amber-500" />
                              Simulate Route
                            </a>

                            <div className="flex gap-2">
                              {order.status === 'processing' && (
                                <button
                                  onClick={() => handleUpdateStatus(order._id, 'shipped', order.orderNumber)}
                                  disabled={actionLoading === order._id}
                                  className="px-5 py-2.5 bg-gray-900 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                                >
                                  {actionLoading === order._id ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Truck className="w-3.5 h-3.5" />
                                  )}
                                  Pick Up Order (Start Delivery)
                                </button>
                              )}

                              {order.status === 'shipped' && (
                                <button
                                  onClick={() => handleUpdateStatus(order._id, 'delivered', order.orderNumber)}
                                  disabled={actionLoading === order._id}
                                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                                >
                                  {actionLoading === order._id ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  Mark as Delivered
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Available Orders ── */}
            {tab === 'available' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-gray-900">Available Delivery Shipments ({availableOrders.length})</h2>
                  <button onClick={loadAvailableOrders} className="text-xs text-amber-600 font-bold hover:underline">Refresh Board</button>
                </div>

                {dataLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-200 animate-pulse shadow-sm" />)}
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                    <PackageOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-900 mb-2">No unassigned orders</p>
                    <p className="text-gray-500 text-sm">All confirmed orders have been claimed by delivery agents or are pending pickup.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {availableOrders.map((order) => (
                      <div key={order._id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-amber-200 transition-all flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-base">#{order.orderNumber}</span>
                            <Badge variant="default">Unassigned</Badge>
                            <span className="text-xs text-gray-400">Created: {fmtDate(order.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            Region: <span className="font-semibold">{order.shippingAddress.city}, {order.shippingAddress.state} ({order.shippingAddress.postalCode})</span>
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            Slot: <span className="font-semibold text-gray-700">{order.scheduledDeliveryDate ? fmtDate(order.scheduledDeliveryDate) : 'Anytime'} / {order.scheduledDeliverySlot || 'Standard Time'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-0 pt-3 md:pt-0">
                          <div className="text-left md:text-right">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase">Est. Payout</span>
                            <span className="font-black text-emerald-600 text-base">{fmt(order.deliveryPayout ?? stats.deliveryRatePerKm ?? 50)}</span>
                          </div>
                          <button
                            onClick={() => handleClaimOrder(order._id, order.orderNumber)}
                            disabled={actionLoading === order._id}
                            className="px-5 py-2.5 bg-gray-900 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                          >
                            {actionLoading === order._id ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Truck className="w-3.5 h-3.5" />
                            )}
                            Accept Shipment
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: History ── */}
            {tab === 'history' && (
              <div className="space-y-6">
                <h2 className="text-xl font-black text-gray-900">Delivery History ({historyOrders.length})</h2>
                {dataLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-200 animate-pulse shadow-sm" />)}
                  </div>
                ) : historyOrders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                    <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-900 mb-2">No completed deliveries yet</p>
                    <p className="text-gray-500 text-sm">Once you complete assigned deliveries, your history and earnings list will fill up here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {historyOrders.map((order) => (
                      <div key={order._id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-emerald-100 transition-colors flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">#{order.orderNumber}</span>
                            <Badge variant="success">Delivered</Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Customer: <span className="font-semibold text-gray-700">{order.shippingAddress.fullName || 'Guest Customer'}</span>
                          </p>
                          <p className="text-xs text-gray-400">
                            Delivered At: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('en-IN') : fmtDate(order.updatedAt)}
                          </p>
                        </div>
                        <div className="text-left md:text-right shrink-0">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">Earned</span>
                          <span className="font-black text-emerald-600 text-lg">{fmt(order.deliveryPayout ?? stats.deliveryRatePerKm ?? 50)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Profile ── */}
            {tab === 'profile' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 mb-6">Delivery Partner Profile</h2>

                <div className="max-w-lg space-y-6">
                  {/* Avatar and Name */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-md">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 text-lg">{user.fullName}</h3>
                      <p className="text-xs text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                        <Truck className="w-3.5 h-3.5" /> Certified Delivery Agent
                      </p>
                    </div>
                  </div>

                  {/* Profile data fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-gray-100 py-6">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
                      <span className="text-sm font-semibold text-gray-800">{user.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Address</span>
                      <span className="text-sm font-semibold text-gray-800">{user.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Phone Number</span>
                      <span className="text-sm font-semibold text-gray-800">{user.phone || 'Not configured'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Agent Status</span>
                      <Badge variant="success">Active / Online</Badge>
                    </div>
                  </div>

                  {/* Instructions for vehicle */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1.5">Dispatch Information</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Your payout details are linked with your email address ({user.email}). Payouts are calculated as a flat fee per delivery order. Earnings are processed at the end of each week cycle.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
