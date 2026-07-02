import { useState, useEffect } from 'react';
import { Package, Heart, User, MapPin, Bell, ShoppingBag, ChevronRight, LogOut, Truck, Plus, Pencil, Trash2, Home, Building2, X, HelpCircle, Search, ChevronDown, Navigation, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { orderApi, userApi, authApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { ProductCard } from '../components/ui/ProductCard';
import { useLocation } from '../contexts/LocationContext';
import { LocationPickerMap } from '../components/LocationPickerMap';

import { FAQS } from './FAQ';

type Tab = 'overview' | 'orders' | 'wishlist' | 'profile' | 'addresses' | 'faq';

const ORDER_STATUS_BADGE: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'dark'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  confirmed: { variant: 'default', label: 'Confirmed' },
  processing: { variant: 'default', label: 'Processing' },
  shipped: { variant: 'dark', label: 'Shipped' },
  delivered: { variant: 'success', label: 'Delivered' },
  cancelled: { variant: 'error', label: 'Cancelled' },
};

export function Dashboard() {
  const { user, signOut, refreshUser } = useAuth();
  const { items: wishlistIds } = useWishlist();
  const { navigate } = useRouter();
  const { toast } = useToast();

  const { checkDeliveryDistance, inventoryCoords } = useLocation();
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const [orders, setOrders] = useState<any[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: '', fullName: '', email: '', phone: '',
    doorNo: '', addressLine1: '', addressLine2: '', landmark: '',
    city: '', state: '', postalCode: '', country: 'India',
    latitude: null as number | null, longitude: null as number | null,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleLocationPicked = (coords: { lat: number; lng: number }, addressDetails?: any) => {
    setAddressForm(f => ({
      ...f,
      latitude: coords.lat,
      longitude: coords.lng,
      addressLine1: addressDetails?.road || addressDetails?.suburb || addressDetails?.neighbourhood || f.addressLine1 || '',
      city: addressDetails?.city || addressDetails?.town || addressDetails?.village || f.city || '',
      state: addressDetails?.state || f.state || '',
      postalCode: addressDetails?.postcode || f.postalCode || '',
      country: addressDetails?.country || 'India'
    }));
  };

  const handleGetCurrentLocation = () => {

    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setAddressForm(f => ({ ...f, latitude, longitude }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          if (!res.ok) throw new Error('Geocoding failed');
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const street = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || '';
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const postalCode = addr.postcode || '';
            const country = addr.country || 'India';
            setAddressForm(f => ({
              ...f,
              addressLine1: street || f.addressLine1,
              city: city || f.city,
              state: state || f.state,
              postalCode: postalCode || f.postalCode,
              country: country || f.country,
            }));
            toast('Location and address details captured!', 'success');
          } else {
            toast('Location coordinates captured, but street address could not be resolved', 'warning');
          }
        } catch (err) {
          toast('Coordinates captured. Fill in other details manually.', 'info');
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        let msg = 'Failed to get current location';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please enable location access in browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        toast(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqItems, setOpenFaqItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    setProfileForm({ fullName: user.fullName ?? '', phone: user.phone ?? '' });
  }, [user, navigate]);

  useEffect(() => {
    if (!user || (tab !== 'orders' && tab !== 'overview')) return;
    setLoading(true);
    orderApi.list().then(r => setOrders(r.data ?? [])).catch(() => { }).finally(() => setLoading(false));
  }, [user, tab]);

  useEffect(() => {
    if (tab !== 'wishlist' || wishlistIds.length === 0) { setWishlistProducts([]); return; }
    userApi.getWishlist().then(r => setWishlistProducts(r.data ?? [])).catch(() => { });
  }, [tab, wishlistIds]);

  useEffect(() => {
    if (!user || tab !== 'addresses') return;
    setLoadingAddresses(true);
    userApi.getAddresses().then(r => setAddresses(r.data ?? [])).catch(() => { }).finally(() => setLoadingAddresses(false));
  }, [user, tab]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await userApi.updateProfile(profileForm);
      await refreshUser();
      toast('Profile updated!', 'success');
    }
    catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast('New password must be at least 6 characters', 'error');
      return;
    }
    setUpdatingPassword(true);
    try {
      await authApi.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast('Password updated successfully!', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast(err.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  }

  if (!user) return null;

  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');

  const TABS = [
    { id: 'overview', label: 'Overview', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'wishlist', label: `Wishlist (${wishlistIds.length})`, icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ] as const;

  const filteredFaqs = FAQS.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !faqSearch || item.q.toLowerCase().includes(faqSearch.toLowerCase()) || item.a.toLowerCase().includes(faqSearch.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

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
                  <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}</div>
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
              <div className="space-y-6">
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

                {!user.auth0Id && !user.googleId && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h2 className="text-xl font-black text-gray-900 mb-6">Update Password</h2>
                    <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Current Password</label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                          required
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">New Password</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                          required
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                          required
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500"
                        />
                      </div>
                      <button type="submit" disabled={updatingPassword} className="px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60">
                        {updatingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {tab === 'addresses' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-900">Saved Addresses</h2>
                  {!showAddressForm && (
                    <button
                      onClick={() => { setShowAddressForm(true); setEditingAddressId(null); setAddressForm({ label: '', fullName: '', email: '', phone: '', doorNo: '', addressLine1: '', addressLine2: '', landmark: '', city: '', state: '', postalCode: '', country: 'India', latitude: null, longitude: null }); }}
                      className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Address
                    </button>
                  )}
                </div>

                {/* Address Form */}
                {showAddressForm && (
                  <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-gray-900">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
                      <button onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!addressForm.latitude || !addressForm.longitude) {
                        toast('Selecting Geolocation is mandatory. Please use Device GPS or edit details on map.', 'error');
                        return;
                      }
                      const distance = checkDeliveryDistance(addressForm.latitude, addressForm.longitude);
                      if (distance > 25) {
                        toast(`Delivery is only available within 25 km of our store. Distance to your address: ${distance.toFixed(1)} km.`, 'error');
                        return;
                      }
                      setSavingAddress(true);

                      try {
                        let res;
                        if (editingAddressId) {
                          res = await userApi.updateAddress(editingAddressId, addressForm);
                        } else {
                          res = await userApi.addAddress(addressForm);
                        }
                        setAddresses(res.data ?? []);
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                        toast(editingAddressId ? 'Address updated!' : 'Address added!', 'success');
                      } catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
                      finally { setSavingAddress(false); }
                    }} className="space-y-4">
                      {/* Label */}
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Label</label>
                        <div className="flex gap-2">
                          {['Home', 'Work', 'Other'].map(l => (
                            <button key={l} type="button" onClick={() => setAddressForm(f => ({ ...f, label: l }))} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all flex items-center gap-1.5 ${addressForm.label === l ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                              {l === 'Home' ? <Home className="w-3.5 h-3.5" /> : l === 'Work' ? <Building2 className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Location Auto-Fill Options */}
                      <div className="flex flex-col gap-4 p-4 bg-amber-50/50 rounded-2xl border-2 border-amber-200/50">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                              <Navigation className="w-4 h-4 text-amber-600" /> Geolocation & Maps
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">Use GPS or point on map to auto-fill address</p>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              disabled={locating}
                              onClick={handleGetCurrentLocation}
                              className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl hover:bg-amber-600 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                            >
                              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                              {locating ? 'Locating...' : 'Use Device GPS'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowMapPicker(!showMapPicker)}
                              className={`px-4 py-2 font-bold text-xs rounded-xl border transition-all flex items-center gap-2 shadow-sm ${
                                showMapPicker
                                  ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                                  : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50'
                              }`}
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              {showMapPicker ? 'Close Map Picker' : 'Add Location on Map'}
                            </button>
                          </div>
                        </div>

                        {/* Interactive Location Picker Map */}
                        {showMapPicker && (
                          <LocationPickerMap
                            onLocationSelected={handleLocationPicked}
                            warehouseCoords={{ lat: inventoryCoords.lat, lng: inventoryCoords.lng }}
                            maxDistanceKm={25}
                            initialCoords={addressForm.latitude && addressForm.longitude ? { lat: addressForm.latitude, lng: addressForm.longitude } : null}
                          />
                        )}

                        {addressForm.latitude && addressForm.longitude && (
                          <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 mt-1 bg-emerald-50 border border-emerald-200/40 px-2.5 py-1.5 rounded-xl w-fit animate-in">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Location pinned successfully!
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { key: 'fullName', label: 'Full Name', placeholder: 'John Doe', required: true },
                          { key: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210', required: true },
                          { key: 'email', label: 'Email', placeholder: 'john@example.com', required: false },
                          { key: 'doorNo', label: 'D.No / Flat No', placeholder: '12-34-56 / Flat 4B', required: true },
                          { key: 'addressLine1', label: 'Street / Area', placeholder: 'MG Road, Banjara Hills', required: true, full: true },
                          { key: 'addressLine2', label: 'Address Line 2 (optional)', placeholder: 'Apartment, building, floor', required: false, full: true },
                          { key: 'landmark', label: 'Near Landmark', placeholder: 'Near City Center Mall', required: false, full: true },
                          { key: 'city', label: 'City', placeholder: 'Hyderabad', required: true },
                          { key: 'state', label: 'State', placeholder: 'Telangana', required: true },
                          { key: 'postalCode', label: 'PIN Code', placeholder: '500001', required: true },
                          { key: 'country', label: 'Country', placeholder: 'India', required: false },
                        ].map(field => (
                          <div key={field.key} className={(field as any).full ? 'sm:col-span-2' : ''}>
                            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                            <input
                              type="text"
                              value={(addressForm as any)[field.key]}
                              onChange={e => setAddressForm(f => ({ ...f, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              required={field.required}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button type="submit" disabled={savingAddress} className="px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60">
                          {savingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                        </button>
                        <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); }} className="px-6 py-3 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Address List */}
                {loadingAddresses ? (
                  <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-200 animate-pulse" />)}</div>
                ) : addresses.length === 0 && !showAddressForm ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-900 mb-2">No addresses saved</p>
                    <p className="text-gray-500 text-sm mb-4">Save your delivery addresses for faster checkout</p>
                    <button onClick={() => { setShowAddressForm(true); setEditingAddressId(null); setAddressForm({ label: '', fullName: '', email: '', phone: '', doorNo: '', addressLine1: '', addressLine2: '', landmark: '', city: '', state: '', postalCode: '', country: 'India', latitude: null, longitude: null }); }} className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors">Add Your First Address</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr: any) => (
                      <div key={addr._id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-amber-200 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              {addr.label && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">
                                  {addr.label === 'Home' ? <Home className="w-3 h-3" /> : addr.label === 'Work' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                  {addr.label}
                                </span>
                              )}
                              <p className="font-bold text-gray-900 text-sm">{addr.fullName}</p>
                            </div>
                            <p className="text-sm text-gray-600">
                              {addr.doorNo && `${addr.doorNo}, `}{addr.addressLine1}
                              {addr.addressLine2 && `, ${addr.addressLine2}`}
                            </p>
                            {addr.landmark && <p className="text-xs text-gray-500 mt-0.5">Near: {addr.landmark}</p>}
                            <p className="text-sm text-gray-600">{addr.city}, {addr.state} {addr.postalCode}</p>
                            {addr.phone && <p className="text-xs text-gray-500 mt-1">📞 {addr.phone}</p>}
                            {addr.latitude && addr.longitude && (
                              <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-md w-fit mt-1.5 flex items-center gap-1 font-semibold">
                                <MapPin className="w-2.5 h-2.5 text-emerald-500" /> Location Pinned
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setEditingAddressId(addr._id);
                                setAddressForm({
                                  label: addr.label || '', fullName: addr.fullName || '', email: addr.email || '', phone: addr.phone || '',
                                  doorNo: addr.doorNo || '', addressLine1: addr.addressLine1 || '', addressLine2: addr.addressLine2 || '', landmark: addr.landmark || '',
                                  city: addr.city || '', state: addr.state || '', postalCode: addr.postalCode || '', country: addr.country || 'India',
                                  latitude: addr.latitude || null, longitude: addr.longitude || null,
                                });
                                setShowAddressForm(true);
                              }}
                              className="p-2 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-all"
                              title="Edit address"
                            >
                              <Pencil className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this address?')) return;
                                try {
                                  const res = await userApi.deleteAddress(addr._id);
                                  setAddresses(res.data ?? []);
                                  toast('Address deleted', 'success');
                                } catch { toast('Failed to delete', 'error'); }
                              }}
                              className="p-2 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all"
                              title="Delete address"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'faq' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-black text-gray-900">Frequently Asked Questions</h2>
                  <div className="w-full sm:w-64 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search FAQ..."
                      value={faqSearch}
                      onChange={e => setFaqSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
                    />
                  </div>
                </div>

                {filteredFaqs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
                    No matching questions found.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredFaqs.map(cat => (
                      <div key={cat.category} className="space-y-3">
                        <h3 className="font-bold text-gray-950 border-b border-gray-100 pb-2 text-sm uppercase tracking-wider">{cat.category}</h3>
                        <div className="space-y-2">
                          {cat.items.map((item, i) => {
                            const key = `${cat.category}-${i}`;
                            const isOpen = openFaqItems.has(key);
                            return (
                              <div key={key} className={`bg-white rounded-xl border transition-all ${isOpen ? 'border-amber-200 shadow-sm' : 'border-gray-200'}`}>
                                <button
                                  onClick={() => {
                                    setOpenFaqItems(prev => {
                                      const next = new Set(prev);
                                      if (next.has(key)) next.delete(key);
                                      else next.add(key);
                                      return next;
                                    });
                                  }}
                                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-gray-900 text-sm"
                                >
                                  <span>{item.q}</span>
                                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                  <div className="px-5 pb-4">
                                    <div className="border-t border-gray-100 pt-3 text-sm text-gray-600 leading-relaxed">
                                      {item.a}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
