import { useState, useEffect, useCallback } from 'react';
import { Package, ShoppingBag, Users, DollarSign, Eye, BarChart3, Settings, Check, X, Pencil, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../lib/router';
import { adminApi, orderApi, productApi, categoryApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { ProductModal } from '../components/admin/ProductModal';

type Tab = 'overview' | 'orders' | 'products' | 'customers';

interface InventoryEdit {
  productId: string;
  value: string;
  threshold: string;
  saving: boolean;
  error: string | null;
}

export function Admin() {
  const { isAdmin, loading } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>({ totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalUsers: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, InventoryEdit>>({});
  // Product CRUD modal
  const [modalProduct, setModalProduct] = useState<any | null | 'new'>(undefined); // undefined=closed
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { if (!loading && !isAdmin) navigate('/'); }, [isAdmin, loading, navigate]);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setDataLoading(true);
    try {
      const [statsRes, ordersRes, productsRes, catsRes] = await Promise.all([
        adminApi.stats(),
        orderApi.list(),
        productApi.list({ limit: '50', sort: 'createdAt', order: 'desc' }),
        categoryApi.list(),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data ?? []);
      setProducts(productsRes.data ?? []);
      setCategories(catsRes.data ?? []);
    } catch { /* ignore */ } finally { setDataLoading(false); }
  }, [isAdmin]);

  // ── Product CRUD handlers ───────────────────────────────────────────────────
  async function handleSaveProduct(data: any) {
    if (modalProduct === 'new') {
      const res = await productApi.create(data);
      setProducts(prev => [res.data, ...prev]);
    } else {
      const res = await productApi.update(modalProduct._id, data);
      setProducts(prev => prev.map(p => p._id === modalProduct._id ? res.data : p));
    }
    setModalProduct(undefined);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await productApi.remove(deleteTarget._id);
      setProducts(prev => prev.filter(p => p._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch { /* ignore */ } finally { setDeleteLoading(false); }
  }

  useEffect(() => { loadData(); }, [loadData]);

  // ── Inventory edit helpers ───────────────────────────────────────────────
  function startEdit(p: any) {
    setEditing(prev => ({
      ...prev,
      [p._id]: {
        productId: p._id,
        value: String(p.inventory ?? 0),
        threshold: String(p.lowStockThreshold ?? 5),
        saving: false,
        error: null,
      },
    }));
  }

  function cancelEdit(id: string) {
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function saveInventory(id: string) {
    const e = editing[id];
    if (!e) return;
    const inv = parseInt(e.value);
    const thr = parseInt(e.threshold);
    if (isNaN(inv) || inv < 0) {
      setEditing(prev => ({ ...prev, [id]: { ...prev[id], error: 'Must be ≥ 0' } }));
      return;
    }
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], saving: true, error: null } }));
    try {
      const res = await productApi.updateInventory(id, inv, isNaN(thr) ? undefined : thr);
      // Update the product list in-place with the returned data
      setProducts(prev => prev.map(p => p._id === id ? { ...p, ...res.data } : p));
      cancelEdit(id);
    } catch (err: any) {
      setEditing(prev => ({ ...prev, [id]: { ...prev[id], saving: false, error: err.message || 'Save failed' } }));
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAdmin) return null;

  const STATUS_BADGE: Record<string, any> = {
    pending: 'warning', confirmed: 'default', processing: 'default',
    shipped: 'dark', delivered: 'success', cancelled: 'error',
  };

  const fmt = (p: number) => '₹' + p.toLocaleString('en-IN');

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'orders', label: `Orders (${stats.totalOrders ?? 0})`, icon: Package },
    { id: 'products', label: 'Inventory', icon: ShoppingBag },
    { id: 'customers', label: 'Customers', icon: Users },
  ] as const;

  // Low-stock summary for overview
  const lowStockProducts = products.filter(p =>
    p.inventory >= 0 && p.inventory <= (p.lowStockThreshold ?? 5)
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-amber-500" />
              <span className="text-amber-600 font-semibold text-sm">Admin Panel</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900">Dashboard</h1>
          </div>
          {tab === 'products' && (
            <button
              onClick={() => setModalProduct('new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-56 shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-200 p-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${tab === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4" />{label}
                  {id === 'products' && lowStockProducts.length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {lowStockProducts.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            {/* ── Overview ── */}
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Revenue', value: fmt(stats.totalRevenue ?? 0), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Total Orders', value: stats.totalOrders ?? 0, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Customers', value: stats.totalUsers ?? 0, icon: Users, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Products', value: stats.totalProducts ?? 0, icon: ShoppingBag, color: 'text-gray-700', bg: 'bg-gray-100' },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{label}</span>
                        <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Low stock alert */}
                {lowStockProducts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-amber-800 text-sm">{lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} low on stock</h3>
                      <button onClick={() => setTab('products')} className="ml-auto text-xs text-amber-600 font-semibold hover:underline">
                        Manage →
                      </button>
                    </div>
                    <div className="space-y-2">
                      {lowStockProducts.slice(0, 4).map((p: any) => (
                        <div key={p._id} className="flex items-center justify-between text-sm">
                          <span className="text-amber-900 font-medium truncate max-w-[60%]">{p.name}</span>
                          <span className={`font-bold ${p.inventory === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                            {p.inventory === 0 ? 'Out of stock' : `${p.inventory} left`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-4">Recent Orders</h3>
                  {dataLoading ? (
                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {['Order', 'Date', 'Status', 'Total'].map(h => (
                              <th key={h} className={`py-2 text-xs text-gray-500 font-semibold ${h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(stats.recentOrders ?? orders).slice(0, 8).map((o: any) => (
                            <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 font-semibold text-gray-900">#{o.orderNumber}</td>
                              <td className="py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                              <td className="py-3"><Badge variant={STATUS_BADGE[o.status] ?? 'default'}>{o.status}</Badge></td>
                              <td className="py-3 text-right font-bold text-gray-900">{fmt(o.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Orders ── */}
            {tab === 'orders' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-black text-gray-900">All Orders</h2>
                  <span className="text-sm text-gray-500">{orders.length} orders</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Order #', 'Date', 'Items', 'Total', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map((o: any) => (
                        <tr key={o._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-bold text-gray-900">#{o.orderNumber}</td>
                          <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-gray-600">{o.items?.length ?? 0}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{fmt(o.total)}</td>
                          <td className="px-4 py-3"><Badge variant={STATUS_BADGE[o.status] ?? 'default'}>{o.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Inventory / Products ── */}
            {tab === 'products' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-gray-900">Inventory Management</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Click the pencil icon to edit stock levels inline</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {lowStockProducts.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        {lowStockProducts.length} low stock
                      </span>
                    )}
                    <span className="text-sm text-gray-500">{products.length} products</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Product', 'SKU', 'Price', 'Stock', 'Threshold', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dataLoading
                        ? [1,2,3,4].map(i => (
                          <tr key={i}>
                            {[1,2,3,4,5,6,7].map(j => (
                              <td key={j} className="px-4 py-4">
                                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                        : products.map((p: any) => {
                          const img = (p.images || [])[0];
                          const isLow = p.inventory >= 0 && p.inventory <= (p.lowStockThreshold ?? 5);
                          const isOOS = p.inventory === 0;
                          const ed = editing[p._id];

                          return (
                            <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${isOOS ? 'bg-red-50/40' : isLow ? 'bg-amber-50/40' : ''}`}>
                              {/* Product */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                    {img && <img src={img.url} alt={p.name} className="w-full h-full object-cover" />}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900 text-xs leading-tight max-w-[160px] truncate">{p.name}</p>
                                    <button onClick={() => navigate(`/product/${p.slug}`)} className="text-[11px] text-amber-600 flex items-center gap-0.5 hover:underline mt-0.5">
                                      <Eye className="w-2.5 h-2.5" /> View
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* SKU */}
                              <td className="px-4 py-3 text-gray-400 text-xs font-mono">{p.sku || '—'}</td>

                              {/* Price */}
                              <td className="px-4 py-3 font-bold text-gray-900 text-xs">{fmt(p.price)}</td>

                              {/* Stock — editable */}
                              <td className="px-4 py-3">
                                {ed ? (
                                  <input
                                    id={`inv-${p._id}`}
                                    type="number"
                                    min={0}
                                    value={ed.value}
                                    onChange={e => setEditing(prev => ({ ...prev, [p._id]: { ...prev[p._id], value: e.target.value, error: null } }))}
                                    className="w-20 border border-amber-300 rounded-lg px-2 py-1 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                  />
                                ) : (
                                  <span className={`font-bold text-sm ${isOOS ? 'text-red-600' : isLow ? 'text-amber-500' : 'text-emerald-600'}`}>
                                    {isOOS ? '⚠ 0' : p.inventory}
                                  </span>
                                )}
                              </td>

                              {/* Low stock threshold — editable */}
                              <td className="px-4 py-3">
                                {ed ? (
                                  <input
                                    id={`thr-${p._id}`}
                                    type="number"
                                    min={0}
                                    value={ed.threshold}
                                    onChange={e => setEditing(prev => ({ ...prev, [p._id]: { ...prev[p._id], threshold: e.target.value } }))}
                                    className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                  />
                                ) : (
                                  <span className="text-gray-400 text-xs">{p.lowStockThreshold ?? 5}</span>
                                )}
                              </td>

                              {/* Active status */}
                              <td className="px-4 py-3">
                                <Badge variant={p.isActive ? 'success' : 'error'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                              </td>

                        {/* Actions */}
                              <td className="px-4 py-3">
                                {ed ? (
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => saveInventory(p._id)} disabled={ed.saving} title="Save"
                                      className="flex items-center justify-center w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50">
                                      {ed.saving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={() => cancelEdit(p._id)} disabled={ed.saving} title="Cancel"
                                      className="flex items-center justify-center w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg transition-colors">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                    {ed.error && <span className="text-xs text-red-500">{ed.error}</span>}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => startEdit(p)} title="Edit inventory"
                                      className="flex items-center justify-center w-7 h-7 border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-all">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setModalProduct(p)} title="Edit product"
                                      className="flex items-center justify-center w-7 h-7 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all">
                                      <ShoppingBag className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setDeleteTarget(p)} title="Delete product"
                                      className="flex items-center justify-center w-7 h-7 border border-gray-200 hover:border-red-400 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Customers ── */}
            {tab === 'customers' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center py-16">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-bold text-gray-900 mb-2">Customer Management</p>
                <p className="text-gray-500 text-sm">{stats.totalUsers ?? 0} registered customers</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Product Create/Edit Modal ── */}
      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct === 'new' ? null : modalProduct}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setModalProduct(undefined)}
        />
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-1">Delete Product?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <span className="font-semibold text-gray-700">{deleteTarget.name}</span> will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
