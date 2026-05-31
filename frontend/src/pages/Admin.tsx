import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, ShoppingBag, Users, DollarSign, Eye, BarChart3, Settings, Check, X, Pencil, AlertTriangle, Trash2, Plus, Truck, Search, Phone, Mail, Calendar, IndianRupee, UserPlus, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../lib/router';
import { adminApi, orderApi, productApi, categoryApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { ProductModal } from '../components/admin/ProductModal';

type Tab = 'overview' | 'orders' | 'products' | 'customers' | 'employees';

interface InventoryEdit {
  productId: string;
  value: string;
  threshold: string;
  saving: boolean;
  error: string | null;
}

function useTableSortAndFilter<T>(data: T[]) {
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleFilter = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));

  const processedData = useMemo(() => {
    let result = [...data];
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        const query = value.toLowerCase();
        result = result.filter((item: any) => {
          const keys = key.split('.');
          let val = item;
          for (const k of keys) val = val?.[k];
          return val != null && String(val).toLowerCase().includes(query);
        });
      }
    });
    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const keys = sortConfig.key.split('.');
        let valA = a, valB = b;
        for (const k of keys) { valA = valA?.[k]; valB = valB?.[k]; }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, sortConfig, filters]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 inline ml-1 text-amber-500" /> : <ArrowDown className="w-3.5 h-3.5 inline ml-1 text-amber-500" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 inline ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
  };

  const FilterHeader = ({ columnKey, title, placeholder }: { columnKey: string, title: string, placeholder?: string }) => {
    const [isSearch, setIsSearch] = useState(!!filters[columnKey]);

    return (
      <div className="flex items-center gap-1 group">
        {isSearch && placeholder ? (
          <input
            autoFocus
            type="text"
            placeholder={placeholder}
            value={filters[columnKey] || ''}
            onClick={e => e.stopPropagation()}
            onChange={e => handleFilter(columnKey, e.target.value)}
            onBlur={() => !filters[columnKey] && setIsSearch(false)}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-normal shadow-sm"
          />
        ) : (
          <span
            onClick={() => placeholder && setIsSearch(true)}
            className={`${placeholder ? 'cursor-pointer hover:text-gray-900 transition-colors' : ''} select-none font-semibold text-gray-500 group-hover:text-gray-700`}
          >
            {title}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleSort(columnKey); }}
          className="flex-shrink-0 cursor-pointer rounded p-0.5 hover:bg-gray-100"
        >
          <SortIcon columnKey={columnKey} />
        </button>
      </div>
    );
  };

  return { processedData, FilterHeader };
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

  // Customers state
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Employees (delivery partners) state
  const [partners, setPartners] = useState<any[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [partnerForm, setPartnerForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [partnerFormError, setPartnerFormError] = useState('');
  const [deletePartnerTarget, setDeletePartnerTarget] = useState<any | null>(null);
  const [deletePartnerLoading, setDeletePartnerLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { processedData: sortedOrders, FilterHeader: OrderHeader } = useTableSortAndFilter(orders);
  const { processedData: sortedProducts, FilterHeader: ProductHeader } = useTableSortAndFilter(products);
  const { processedData: sortedCustomers, FilterHeader: CustomerHeader } = useTableSortAndFilter(customers);
  const { processedData: sortedPartners, FilterHeader: PartnerHeader } = useTableSortAndFilter(partners);
  useEffect(() => { if (!loading && !isAdmin) navigate('/'); }, [isAdmin, loading, navigate]);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setDataLoading(true);
    try {
      const [statsRes, ordersRes, productsRes, catsRes] = await Promise.all([
        adminApi.stats(),
        orderApi.list({ all: 'true' }),
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

  // Load customers when tab switches
  useEffect(() => {
    if (tab !== 'customers' || !isAdmin) return;
    setCustomersLoading(true);
    const params: Record<string, string> = {};
    if (customerSearch) params.search = customerSearch;
    adminApi.customers(params).then(r => setCustomers(r.data ?? [])).catch(() => {}).finally(() => setCustomersLoading(false));
  }, [tab, isAdmin, customerSearch]);

  // Load delivery partners when tab switches
  useEffect(() => {
    if (tab !== 'employees' || !isAdmin) return;
    setPartnersLoading(true);
    adminApi.deliveryPartners().then(r => setPartners(r.data ?? [])).catch(() => {}).finally(() => setPartnersLoading(false));
  }, [tab, isAdmin]);

  // ── Partner CRUD handlers ────────────────────────────────────────────────────
  async function handleSavePartner(e: React.FormEvent) {
    e.preventDefault();
    setPartnerSaving(true);
    setPartnerFormError('');
    try {
      if (editingPartner) {
        const res = await adminApi.updateDeliveryPartner(editingPartner._id, {
          fullName: partnerForm.fullName,
          phone: partnerForm.phone || undefined,
          password: partnerForm.password || undefined,
        });
        setPartners(prev => prev.map(p => p._id === editingPartner._id ? { ...p, ...res.data } : p));
      } else {
        if (!partnerForm.password) { setPartnerFormError('Password is required'); setPartnerSaving(false); return; }
        const res = await adminApi.createDeliveryPartner({
          fullName: partnerForm.fullName,
          email: partnerForm.email,
          phone: partnerForm.phone || undefined,
          password: partnerForm.password,
        });
        setPartners(prev => [{ ...res.data, completedDeliveries: 0, activeDeliveries: 0, totalEarnings: 0 }, ...prev]);
      }
      setShowPartnerForm(false);
      setEditingPartner(null);
      setPartnerForm({ fullName: '', email: '', phone: '', password: '' });
    } catch (err: any) {
      setPartnerFormError(err.message || 'Failed to save');
    } finally { setPartnerSaving(false); }
  }

  async function handleDeletePartner() {
    if (!deletePartnerTarget) return;
    setDeletePartnerLoading(true);
    try {
      await adminApi.deleteDeliveryPartner(deletePartnerTarget._id);
      setPartners(prev => prev.filter(p => p._id !== deletePartnerTarget._id));
      setDeletePartnerTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    } finally { setDeletePartnerLoading(false); }
  }

  async function togglePartnerActive(partner: any) {
    try {
      const res = await adminApi.updateDeliveryPartner(partner._id, { isActive: !partner.isActive });
      setPartners(prev => prev.map(p => p._id === partner._id ? { ...p, ...res.data } : p));
    } catch { /* ignore */ }
  }

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
    { id: 'employees', label: 'Employees', icon: Truck },
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
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-48">
                          <OrderHeader columnKey="orderNumber" title="Order #" placeholder="Search order..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-40">
                          <OrderHeader columnKey="createdAt" title="Date" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Items</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">
                          <OrderHeader columnKey="total" title="Total" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-40">
                          <OrderHeader columnKey="status" title="Status" placeholder="Filter status..." />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sortedOrders.map((o: any) => (
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
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-56">
                          <ProductHeader columnKey="name" title="Product" placeholder="Search name..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">
                          <ProductHeader columnKey="sku" title="SKU" placeholder="Search SKU..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">
                          <ProductHeader columnKey="mrp" title="MRP" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Discount</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">
                          <ProductHeader columnKey="price" title="Selling Price" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">
                          <ProductHeader columnKey="inventory" title="Stock" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Threshold</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">Status</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dataLoading
                        ? [1,2,3,4].map(i => (
                          <tr key={i}>
                            {[1,2,3,4,5,6,7,8,9].map(j => (
                              <td key={j} className="px-4 py-4">
                                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                        : sortedProducts.map((p: any) => {
                          const img = (p.images || [])[0];
                          const isLow = p.inventory >= 0 && p.inventory <= (p.lowStockThreshold ?? 5);
                          const isOOS = p.inventory === 0;
                          const ed = editing[p._id];
                          const hasDiscount = p.comparePrice && p.comparePrice > p.price;

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

                              {/* MRP */}
                              <td className="px-4 py-3 text-xs">
                                {hasDiscount ? (
                                  <span className="text-gray-400 line-through">{fmt(p.comparePrice)}</span>
                                ) : (
                                  <span className="font-bold text-gray-900">{fmt(p.price)}</span>
                                )}
                              </td>

                              {/* Discount */}
                              <td className="px-4 py-3">
                                {hasDiscount ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-100">
                                    {Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)}% off
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>

                              {/* Selling Price */}
                              <td className="px-4 py-3 font-black text-emerald-600 text-xs">{fmt(p.price)}</td>

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
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-black text-gray-900">All Customers</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{stats.totalUsers ?? 0} registered customers</p>
                    </div>

                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-48">
                          <CustomerHeader columnKey="fullName" title="Customer" placeholder="Search name..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-48">
                          <CustomerHeader columnKey="email" title="Email" placeholder="Search email..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-40">
                          <CustomerHeader columnKey="phone" title="Phone" placeholder="Search phone..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">
                          <CustomerHeader columnKey="createdAt" title="Joined" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">
                          <CustomerHeader columnKey="orderCount" title="Orders" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">
                          <CustomerHeader columnKey="totalSpent" title="Total Spent" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Status</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {customersLoading ? (
                          [1,2,3,4].map(i => (
                            <tr key={i}>
                              {[1,2,3,4,5,6,7].map(j => (
                                <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                              ))}
                            </tr>
                          ))
                        ) : sortedCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center">
                              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">{customerSearch ? 'No customers found' : 'No customers yet'}</p>
                            </td>
                          </tr>
                        ) : sortedCustomers.map((c: any) => (
                          <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                                  {(c.fullName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">{c.fullName || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 text-gray-600 text-xs">
                                <Mail className="w-3 h-3 text-gray-400" />{c.email}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 text-gray-600 text-xs">
                                <Phone className="w-3 h-3 text-gray-400" />{c.phone || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                                <Calendar className="w-3 h-3 text-gray-400" />{new Date(c.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                                <Package className="w-3 h-3" />{c.orderCount}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-emerald-600 text-sm flex items-center gap-0.5">
                                <IndianRupee className="w-3 h-3" />{(c.totalSpent ?? 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={c.isActive ? 'success' : 'error'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Employees (Delivery Partners) ── */}
            {tab === 'employees' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-black text-gray-900">Delivery Partners</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{partners.length} delivery partner{partners.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPartner(null);
                        setPartnerForm({ fullName: '', email: '', phone: '', password: '' });
                        setPartnerFormError('');
                        setShowPartnerForm(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" /> Add Partner
                    </button>
                  </div>

                  {/* Partner Stats Summary */}
                  {partners.length > 0 && (
                    <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
                      {[
                        { label: 'Total Partners', value: partners.length, color: 'text-gray-900' },
                        { label: 'Total Deliveries', value: partners.reduce((s, p) => s + (p.completedDeliveries ?? 0), 0), color: 'text-blue-600' },
                        { label: 'Total Earnings Paid', value: `₹${partners.reduce((s, p) => s + (p.totalEarnings ?? 0), 0).toLocaleString('en-IN')}`, color: 'text-emerald-600' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white p-4 text-center">
                          <p className="text-xs text-gray-500 font-semibold mb-1">{label}</p>
                          <p className={`text-xl font-black ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-48">
                          <PartnerHeader columnKey="fullName" title="Partner" placeholder="Search name..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-48">
                          <PartnerHeader columnKey="email" title="Email" placeholder="Search email..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-40">
                          <PartnerHeader columnKey="phone" title="Phone" placeholder="Search phone..." />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">Status</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">
                          <PartnerHeader columnKey="isActive" title="Active" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">
                          <PartnerHeader columnKey="completedDeliveries" title="Completed" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">
                          <PartnerHeader columnKey="totalEarnings" title="Earnings" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Actions</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {partnersLoading ? (
                          [1,2,3].map(i => (
                            <tr key={i}>
                              {[1,2,3,4,5,6,7,8].map(j => (
                                <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                              ))}
                            </tr>
                          ))
                        ) : sortedPartners.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center">
                              <Truck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">No delivery partners found</p>
                            </td>
                          </tr>
                        ) : sortedPartners.map((p: any) => (
                          <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                                  {(p.fullName || 'D').charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">{p.fullName || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{p.email}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{p.phone || '—'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={p.isActive ? 'success' : 'error'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100">
                                <Truck className="w-3 h-3" />{p.activeDeliveries ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                                <Check className="w-3 h-3" />{p.completedDeliveries ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-black text-emerald-600 text-sm">₹{(p.totalEarnings ?? 0).toLocaleString('en-IN')}</span>
                              <p className="text-[10px] text-gray-400">@ ₹75/delivery</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => togglePartnerActive(p)}
                                  title={p.isActive ? 'Deactivate' : 'Activate'}
                                  className={`flex items-center justify-center w-7 h-7 border rounded-lg transition-all ${p.isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'border-gray-300 bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                >
                                  {p.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPartner(p);
                                    setPartnerForm({ fullName: p.fullName || '', email: p.email || '', phone: p.phone || '', password: '' });
                                    setPartnerFormError('');
                                    setShowPartnerForm(true);
                                  }}
                                  title="Edit partner"
                                  className="flex items-center justify-center w-7 h-7 border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-all"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletePartnerTarget(p)}
                                  title="Delete partner"
                                  className="flex items-center justify-center w-7 h-7 border border-gray-200 hover:border-red-400 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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

      {/* ── Partner Create/Edit Modal ── */}
      {showPartnerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-gray-900">{editingPartner ? 'Edit Partner' : 'Add Delivery Partner'}</h3>
              <button onClick={() => { setShowPartnerForm(false); setEditingPartner(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSavePartner} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Full Name <span className="text-red-400">*</span></label>
                <input
                  type="text" required
                  value={partnerForm.fullName}
                  onChange={e => setPartnerForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email <span className="text-red-400">*</span></label>
                <input
                  type="email" required
                  value={partnerForm.email}
                  onChange={e => setPartnerForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="partner@example.com"
                  disabled={!!editingPartner}
                  className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 ${editingPartner ? 'bg-gray-50 text-gray-400' : ''}`}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Phone</label>
                <input
                  type="tel"
                  value={partnerForm.phone}
                  onChange={e => setPartnerForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Password {editingPartner ? <span className="text-gray-400 font-normal text-xs">(leave blank to keep current)</span> : <span className="text-red-400">*</span>}
                </label>
                <input
                  type="password" required={!editingPartner}
                  value={partnerForm.password}
                  onChange={e => setPartnerForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editingPartner ? "••••••••" : "Min 6 characters"}
                  minLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              {partnerFormError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {partnerFormError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={partnerSaving}
                  className="flex-1 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {partnerSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editingPartner ? 'Update Partner' : 'Create Partner'}
                </button>
                <button type="button" onClick={() => { setShowPartnerForm(false); setEditingPartner(null); }}
                  className="px-6 py-3 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Partner Confirmation ── */}
      {deletePartnerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-1">Delete Partner?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <span className="font-semibold text-gray-700">{deletePartnerTarget.fullName}</span> will be permanently removed.
              {(deletePartnerTarget.completedDeliveries ?? 0) > 0 && (
                <span className="block text-xs text-amber-600 mt-1">This partner has {deletePartnerTarget.completedDeliveries} completed delivery(ies).</span>
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletePartnerTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeletePartner} disabled={deletePartnerLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deletePartnerLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
