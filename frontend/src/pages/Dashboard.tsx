import { useState, useEffect } from 'react';
import { Package, Heart, User, MapPin, Bell, ShoppingBag, ChevronRight, LogOut, Truck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { orderApi, userApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { ProductCard } from '../components/ui/ProductCard';

type Tab = 'overview' | 'orders' | 'wishlist' | 'profile' | 'addresses';

const ORDER_STATUS_BADGE: Record<string, { variant: 'default'|'success'|'warning'|'error'|'dark'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  confirmed: { variant: 'default', label: 'Confirmed' },
  processing: { variant: 'default', label: 'Processing' },
  shipped: { variant: 'dark', label: 'Shipped' },
  delivered: { variant: 'success', label: 'Delivered' },
  cancelled: { variant: 'error', label: 'Cancelled' },
};

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { items: wishlistIds } = useWishlist();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    setProfileForm({ fullName: user.fullName ?? '', phone: user.phone ?? '' });
  }, [user, navigate]);

  useEffect(() => {
    if (!user || (tab !== 'orders' && tab !== 'overview')) return;
    setLoading(true);
    orderApi.list().then(r => setOrders(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, [user, tab]);

  useEffect(() => {
    if (tab !== 'wishlist' || wishlistIds.length === 0) { setWishlistProducts([]); return; }
    userApi.getWishlist().then(r => setWishlistProducts(r.data ?? [])).catch(() => {});
  }, [tab, wishlistIds]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await userApi.updateProfile(profileForm); toast('Profile updated!', 'success'); }
    catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  if (!user) return null;

  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');

  const TABS = [
    { id: 'overview', label: 'Overview', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'wishlist', label: `Wishlist (${wishlistIds.length})`, icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">My Account</h1>
            <p className="text-gray-500 mt-1">{user.email}</p>
          </div>
          <button onClick={() => { signOut(); navigate('/'); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:border-red-300 hover:text-red-500 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-56 shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-200 p-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${tab === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Orders', value: orders.length || '—', icon: Package },
                    { label: 'Wishlist', value: wishlistIds.length, icon: Heart },
                    { label: 'Account Status', value: 'Active', icon: Bell },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-500">{label}</span>
                        <Icon className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-3xl font-black text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Browse Shop', desc: 'Explore our latest collection', action: () => navigate('/shop') },
                      { label: 'Track Order', desc: 'Check your order status', action: () => navigate('/order-tracking') },
                      { label: 'View Wishlist', desc: `${wishlistIds.length} saved items`, action: () => setTab('wishlist') },
                      { label: 'Edit Profile', desc: 'Update your information', action: () => setTab('profile') },
                    ].map(({ label, desc, action }) => (
                      <button key={label} onClick={action} className="flex items-center justify-between p-4 border border-gray-100 hover:border-amber-200 hover:bg-amber-50 rounded-xl transition-all text-left group">
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-amber-700 text-sm">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-gray-900">Order History</h2>
                {loading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}</div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-900 mb-2">No orders yet</p>
                    <button onClick={() => navigate('/shop')} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors">Shop Now</button>
                  </div>
                ) : orders.map((order: any) => {
                  const badge = ORDER_STATUS_BADGE[order.status] ?? ORDER_STATUS_BADGE.pending;
                  // Get first few item images for thumbnails
                  const itemImages = (order.items ?? [])
                    .filter((item: any) => item.image)
                    .slice(0, 3);
                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-amber-200 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => navigate(`/order-tracking?order=${order.orderNumber}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-gray-900">#{order.orderNumber}</p>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-gray-900">{fmt(order.total)}</span>
                          {!['delivered', 'cancelled', 'refunded'].includes(order.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/order-tracking?order=${order.orderNumber}`); }}
                              className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" /> Track
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Product image thumbnails */}
                        {itemImages.length > 0 && (
                          <div className="flex -space-x-2">
                            {itemImages.map((item: any, idx: number) => (
                              <div key={idx} className="w-9 h-9 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                                <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {(order.items?.length ?? 0) > 3 && (
                              <div className="w-9 h-9 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                                +{order.items.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-gray-500">{order.items?.length ?? 0} item(s)</p>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors ml-auto" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'wishlist' && (
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-6">My Wishlist ({wishlistIds.length})</h2>
                {wishlistIds.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-900 mb-2">Your wishlist is empty</p>
                    <button onClick={() => navigate('/shop')} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors">Browse Products</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {wishlistProducts.map((p: any) => <ProductCard key={p._id || p.id} product={p} />)}
                  </div>
                )}
              </div>
            )}

            {tab === 'profile' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-black text-gray-900 mb-6">Profile Information</h2>
                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Full Name</label>
                    <input type="text" value={profileForm.fullName} onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email</label>
                    <input type="email" value={user.email} disabled className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 bg-gray-50" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Phone</label>
                    <input type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500" />
                  </div>
                  <p className="text-xs font-semibold text-amber-600">Role: {user.role ?? 'customer'}</p>
                  <button type="submit" disabled={saving} className="px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'addresses' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-black text-gray-900 mb-6">Saved Addresses</h2>
                <div className="text-center py-10">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-bold text-gray-900 mb-2">No addresses saved</p>
                  <p className="text-gray-500 text-sm">Your addresses will appear here after your first order</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
