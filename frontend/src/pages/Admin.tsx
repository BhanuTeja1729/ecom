import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, ShoppingBag, Users, DollarSign, Eye, BarChart3, Settings, Check, X, Pencil, AlertTriangle, Trash2, Plus, Truck, Phone, Mail, Calendar, IndianRupee, UserPlus, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, FolderOpen, Loader, Upload, Tag, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../lib/router';
import { useToast } from '../contexts/ToastContext';
import { adminApi, orderApi, productApi, categoryApi, mediaApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { ProductModal } from '../components/admin/ProductModal';

type Tab = 'overview' | 'orders' | 'products' | 'categories' | 'customers' | 'employees' | 'coupons';

interface InventoryEdit {
  productId: string;
  value: string;
  threshold: string;
  saving: boolean;
  error: string | null;
}

// ── Pagination hook ──────────────────────────────────────────────────────────
function usePagination<T>(data: T[], defaultPageSize = 8) {
  const PAGE_SIZE_OPTIONS = [5, 8, 10, 15, 20, 25];
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when data changes
  useEffect(() => { setCurrentPage(1); }, [data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, data.length);
  const pageData = data.slice(start, end);

  const PaginationBar = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Show rows per page</span>
        <select
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white text-gray-700 font-semibold cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium">
          {data.length === 0 ? '0 of 0' : `${start + 1}–${end} of ${data.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return { pageData, PaginationBar, setCurrentPage };
}

// ── Sort & Filter hook ───────────────────────────────────────────────────────
function useTableSortAndFilter<T>(data: T[]) {
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleFilter = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));

  // Popover open state (one at a time) and date range draft state
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [dateRangeDraft, setDateRangeDraft] = useState<Record<string, { from: string; to: string }>>({});

  // Close any open popover when clicking outside
  useEffect(() => {
    if (!openPopover) return;
    const close = () => setOpenPopover(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openPopover]);

  const processedData = useMemo(() => {
    let result = [...data];
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;

      // Date range filter — value looks like "__daterange__:2024-01-01|2024-12-31"
      if (value.startsWith('__daterange__:')) {
        const [fromStr, toStr] = value.replace('__daterange__:', '').split('|');
        result = result.filter((item: any) => {
          const keys = key.split('.');
          let val = item;
          for (const k of keys) val = val?.[k];
          if (!val) return false;
          const date = new Date(val);
          if (fromStr && date < new Date(fromStr)) return false;
          if (toStr && date > new Date(toStr + 'T23:59:59')) return false;
          return true;
        });
        return;
      }

      // Boolean filter — value looks like "__bool__:true" or "__bool__:false"
      if (value.startsWith('__bool__:')) {
        const boolVal = value.replace('__bool__:', '') === 'true';
        result = result.filter((item: any) => {
          const keys = key.split('.');
          let val = item;
          for (const k of keys) val = val?.[k];
          return Boolean(val) === boolVal;
        });
        return;
      }

      // Default: case-insensitive string includes
      const query = value.toLowerCase();
      result = result.filter((item: any) => {
        const keys = key.split('.');
        let val = item;
        for (const k of keys) val = val?.[k];
        return val != null && String(val).toLowerCase().includes(query);
      });
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

  // ── DropdownHeader: looks like regular header, opens popover on click ──────
  const DropdownHeader = ({
    columnKey, title, options,
  }: {
    columnKey: string;
    title: string;
    options: { label: string; value: string }[];
  }) => {
    const isOpen = openPopover === columnKey;
    const active = !!filters[columnKey];
    const activeLabel = active ? options.find(o => o.value === filters[columnKey])?.label : null;
    return (
      <div className="relative flex items-center gap-1 group">
        <button
          onClick={e => { e.stopPropagation(); setOpenPopover(isOpen ? null : columnKey); }}
          className={`flex items-center gap-1 select-none font-semibold text-xs transition-colors cursor-pointer ${
            active ? 'text-amber-600' : 'text-gray-500 group-hover:text-gray-700'
          }`}
        >
          {activeLabel ?? title}
          {active && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
          )}
          <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${active ? 'text-amber-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={e => { e.stopPropagation(); handleSort(columnKey); }}
          className="flex-shrink-0 cursor-pointer rounded p-0.5 hover:bg-gray-100"
        >
          <SortIcon columnKey={columnKey} />
        </button>
        {isOpen && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[150px] animate-in"
            style={{ animation: 'fadeSlideIn 0.12s ease-out' }}
          >
            <button
              onClick={() => { handleFilter(columnKey, ''); setOpenPopover(null); }}
              className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                !filters[columnKey] ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              {!filters[columnKey] && <Check className="w-3 h-3" />}
              <span className={!filters[columnKey] ? '' : 'pl-5'}>All</span>
            </button>
            <div className="border-t border-gray-100 my-1" />
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => { handleFilter(columnKey, o.value); setOpenPopover(null); }}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                  filters[columnKey] === o.value ? 'text-amber-600 bg-amber-50/60' : 'text-gray-700'
                }`}
              >
                {filters[columnKey] === o.value
                  ? <Check className="w-3 h-3 flex-shrink-0" />
                  : <span className="w-3 h-3 flex-shrink-0" />}
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── DateRangeHeader: header click opens a from/to date-picker popover ──────
  const DateRangeHeader = ({ columnKey, title }: { columnKey: string; title: string }) => {
    const isOpen = openPopover === columnKey;
    const filterVal = filters[columnKey] || '';
    const active = filterVal.startsWith('__daterange__:');
    const draft = dateRangeDraft[columnKey] || { from: '', to: '' };

    // Derive label when active
    let activeLabel = title;
    if (active) {
      const [f, t] = filterVal.replace('__daterange__:', '').split('|');
      if (f && t) activeLabel = `${f} → ${t}`;
      else if (f) activeLabel = `From ${f}`;
      else if (t) activeLabel = `To ${t}`;
    }

    const openPicker = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Seed draft from current filter
      if (active) {
        const [f, t] = filterVal.replace('__daterange__:', '').split('|');
        setDateRangeDraft(d => ({ ...d, [columnKey]: { from: f || '', to: t || '' } }));
      } else {
        setDateRangeDraft(d => ({ ...d, [columnKey]: { from: '', to: '' } }));
      }
      setOpenPopover(isOpen ? null : columnKey);
    };

    const apply = () => {
      const { from, to } = draft;
      if (from || to) handleFilter(columnKey, `__daterange__:${from}|${to}`);
      else handleFilter(columnKey, '');
      setOpenPopover(null);
    };

    const clear = () => {
      setDateRangeDraft(d => ({ ...d, [columnKey]: { from: '', to: '' } }));
      handleFilter(columnKey, '');
      setOpenPopover(null);
    };

    const today = new Date().toISOString().split('T')[0];

    return (
      <div className="relative flex items-center gap-1 group">
        <button
          onClick={openPicker}
          className={`flex items-center gap-1 select-none font-semibold text-xs transition-colors cursor-pointer ${
            active ? 'text-amber-600' : 'text-gray-500 group-hover:text-gray-700'
          }`}
        >
          <Calendar className={`w-3 h-3 flex-shrink-0 ${active ? 'text-amber-500' : 'text-gray-400'}`} />
          <span className="truncate max-w-[90px]">{activeLabel}</span>
          {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); handleSort(columnKey); }}
          className="flex-shrink-0 cursor-pointer rounded p-0.5 hover:bg-gray-100"
        >
          <SortIcon columnKey={columnKey} />
        </button>
        {isOpen && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-64"
            style={{ animation: 'fadeSlideIn 0.12s ease-out' }}
          >
            <p className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" /> Filter by {title}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">From</label>
                <input
                  type="date"
                  value={draft.from}
                  max={draft.to || today}
                  onChange={e => setDateRangeDraft(d => ({ ...d, [columnKey]: { ...draft, from: e.target.value } }))}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 text-gray-700"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">To</label>
                <input
                  type="date"
                  value={draft.to}
                  min={draft.from || undefined}
                  max={today}
                  onChange={e => setDateRangeDraft(d => ({ ...d, [columnKey]: { ...draft, to: e.target.value } }))}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 text-gray-700"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={apply}
                disabled={!draft.from && !draft.to}
                className="flex-1 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
              <button
                onClick={clear}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return { processedData, FilterHeader, DropdownHeader, DateRangeHeader };
}

export function Admin() {
  const { isAdmin, loading } = useAuth();
  const { navigate } = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [deliveryRate, setDeliveryRate] = useState<number>(15);
  const [savingDeliveryRate, setSavingDeliveryRate] = useState<boolean>(false);
  const [stats, setStats] = useState<any>({ totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalUsers: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, InventoryEdit>>({});
  const [modalProduct, setModalProduct] = useState<any | null | 'new'>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Category CRUD states
  const [modalCategory, setModalCategory] = useState<any | null | 'new'>(undefined);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<any | null>(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', imageUrl: '', parent: '', sortOrder: 0, isActive: true });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState('');
  const [categoryImageUploading, setCategoryImageUploading] = useState(false);

  const handleCategoryImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!categoryForm.name.trim()) {
      alert('Please enter the category name before uploading an image.');
      return;
    }

    setCategoryImageUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'category');
    formData.append('categoryName', categoryForm.name.trim());

    try {
      const res = await mediaApi.upload(formData);
      if (res.success && res.data.url) {
        setCategoryForm(f => ({ ...f, imageUrl: res.data.url }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload category image.');
    } finally {
      setCategoryImageUploading(false);
    }
  };

  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

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

  // Coupon states
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [modalCoupon, setModalCoupon] = useState<any | null | 'new'>(undefined);
  const [deleteCouponTarget, setDeleteCouponTarget] = useState<any | null>(null);
  const [deleteCouponLoading, setDeleteCouponLoading] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    minimumOrderAmount: 0,
    maximumDiscountAmount: undefined as number | undefined,
    usageLimit: undefined as number | undefined,
    expiresAt: '',
  });
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponFormError, setCouponFormError] = useState('');

  const { processedData: sortedOrders, FilterHeader: OrderHeader, DropdownHeader: OrderDropdown, DateRangeHeader: OrderDateRange } = useTableSortAndFilter(orders);
  const { processedData: sortedProducts, FilterHeader: ProductHeader, DropdownHeader: ProductDropdown } = useTableSortAndFilter(products);
  const { processedData: sortedCustomers, FilterHeader: CustomerHeader, DropdownHeader: CustomerDropdown, DateRangeHeader: CustomerDateRange } = useTableSortAndFilter(customers);
  const { processedData: sortedPartners, FilterHeader: PartnerHeader, DropdownHeader: PartnerDropdown } = useTableSortAndFilter(partners);
  const { processedData: sortedCategories, FilterHeader: CategoryHeader, DropdownHeader: CategoryDropdown } = useTableSortAndFilter(categories);
  const { processedData: sortedCoupons, FilterHeader: CouponHeader, DropdownHeader: CouponDropdown } = useTableSortAndFilter(coupons);

  // Pagination for each table
  const { pageData: ordersPage, PaginationBar: OrdersPagination } = usePagination(sortedOrders, 8);
  const { pageData: productsPage, PaginationBar: ProductsPagination } = usePagination(sortedProducts, 8);
  const { pageData: customersPage, PaginationBar: CustomersPagination } = usePagination(sortedCustomers, 8);
  const { pageData: partnersPage, PaginationBar: PartnersPagination } = usePagination(sortedPartners, 8);
  const { pageData: categoriesPage, PaginationBar: CategoriesPagination } = usePagination(sortedCategories, 8);
  const { pageData: couponsPage, PaginationBar: CouponsPagination } = usePagination(sortedCoupons, 8);

  useEffect(() => { if (!loading && !isAdmin) navigate('/'); }, [isAdmin, loading, navigate]);

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setDataLoading(true);
    try {
      const [statsRes, ordersRes, productsRes, catsRes] = await Promise.all([
        adminApi.stats(),
        orderApi.list({ all: 'true' }),
        productApi.list({ limit: '50', sort: 'createdAt', order: 'desc' }),
        categoryApi.list({ all: 'true' }),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data ?? []);
      setProducts(productsRes.data ?? []);
      setCategories(catsRes.data ?? []);
    } catch { /* ignore */ } finally { setDataLoading(false); }
  }, [isAdmin]);

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

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setCategoryFormError('Category name is required.');
      return;
    }
    setCategorySaving(true);
    setCategoryFormError('');
    try {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
        imageUrl: categoryForm.imageUrl.trim() || undefined,
        parent: categoryForm.parent || undefined,
        sortOrder: Number(categoryForm.sortOrder) || 0,
        isActive: categoryForm.isActive,
      };

      if (modalCategory === 'new') {
        const res = await categoryApi.create(payload);
        setCategories(prev => [...prev, { ...res.data, productCount: 0 }]);
      } else {
        const res = await categoryApi.update(modalCategory._id, payload);
        let updatedCat = res.data;
        if (updatedCat.parent) {
          const parentObj = categories.find(c => c._id === updatedCat.parent);
          if (parentObj) {
            updatedCat.parent = { _id: parentObj._id, name: parentObj.name };
          }
        }
        setCategories(prev => prev.map(c => c._id === modalCategory._id ? { ...updatedCat, productCount: c.productCount ?? 0 } : c));
      }
      setModalCategory(undefined);
    } catch (err: any) {
      setCategoryFormError(err.message || 'Failed to save category');
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteCategory() {
    if (!deleteCategoryTarget) return;
    setDeleteCategoryLoading(true);
    try {
      await categoryApi.remove(deleteCategoryTarget._id);
      setCategories(prev => prev.filter(c => c._id !== deleteCategoryTarget._id));
      setDeleteCategoryTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    } finally {
      setDeleteCategoryLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (tab !== 'customers' || !isAdmin) return;
    setCustomersLoading(true);
    const params: Record<string, string> = {};
    if (customerSearch) params.search = customerSearch;
    adminApi.customers(params).then(r => setCustomers(r.data ?? [])).catch(() => {}).finally(() => setCustomersLoading(false));
  }, [tab, isAdmin, customerSearch]);

  useEffect(() => {
    if (tab !== 'employees' || !isAdmin) return;
    setPartnersLoading(true);
    adminApi.deliveryPartners().then(r => setPartners(r.data ?? [])).catch(() => {}).finally(() => setPartnersLoading(false));
    adminApi.getDeliveryRate()
      .then(r => {
        if (r.success) setDeliveryRate(r.data);
      })
      .catch(() => {});
  }, [tab, isAdmin]);

  useEffect(() => {
    if (tab !== 'coupons' || !isAdmin) return;
    setCouponsLoading(true);
    adminApi.listCoupons()
      .then(r => setCoupons(r.data ?? []))
      .catch(() => {})
      .finally(() => setCouponsLoading(false));
  }, [tab, isAdmin]);

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

  async function handleSaveCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      setCouponFormError('Coupon code is required.');
      return;
    }
    setCouponSaving(true);
    setCouponFormError('');
    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description.trim() || undefined,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        minimumOrderAmount: Number(couponForm.minimumOrderAmount) || 0,
        maximumDiscountAmount: couponForm.maximumDiscountAmount ? Number(couponForm.maximumDiscountAmount) : undefined,
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : undefined,
        expiresAt: couponForm.expiresAt || null,
      };

      const res = await adminApi.createCoupon(payload);
      setCoupons(prev => [res.data, ...prev]);
      setModalCoupon(undefined);
    } catch (err: any) {
      setCouponFormError(err.message || 'Failed to save coupon');
    } finally {
      setCouponSaving(false);
    }
  }

  async function handleDeleteCoupon() {
    if (!deleteCouponTarget) return;
    setDeleteCouponLoading(true);
    try {
      await adminApi.deleteCoupon(deleteCouponTarget._id);
      setCoupons(prev => prev.filter(c => c._id !== deleteCouponTarget._id));
      setDeleteCouponTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    } finally {
      setDeleteCouponLoading(false);
    }
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

  async function handleSaveDeliveryRate() {
    setSavingDeliveryRate(true);
    try {
      const res = await adminApi.updateDeliveryRate(deliveryRate);
      if (res.success) {
        toast('Delivery rate updated successfully!', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to update delivery rate', 'error');
    } finally {
      setSavingDeliveryRate(false);
    }
  }

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
    { id: 'orders', label: `Orders`, icon: Package },
    { id: 'products', label: 'Inventory', icon: ShoppingBag },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'employees', label: 'Employees', icon: Truck },
    { id: 'coupons', label: 'Coupons', icon: Tag },
  ] as const;

  const lowStockProducts = products.filter(p =>
    p.inventory >= 0 && p.inventory <= (p.lowStockThreshold ?? 5)
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-amber-500" />
            <span className="text-amber-600 font-semibold text-sm">Admin Panel</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        </div>

        {/* ── Tab Navigation Bar (like image) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 mb-6 gap-3 pb-2 sm:pb-0">
          <style>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          <nav className="flex items-center gap-0 -mb-px overflow-x-auto no-scrollbar w-full sm:w-auto scroll-smooth">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id as Tab)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                  tab === id
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {id === 'orders' && (stats.totalOrders ?? 0) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">
                    {stats.totalOrders}
                  </span>
                )}
                {id === 'products' && lowStockProducts.length > 0 && (
                  <span className="ml-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right-side action button */}
          <div className="flex-shrink-0 flex items-center mb-1">
            {tab === 'products' && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
                >
                  <Upload className="w-4 h-4" /> Import Stock
                </button>
                <button
                  onClick={() => setModalProduct('new')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>
            )}
            {tab === 'categories' && (
              <button
                onClick={() => {
                  setModalCategory('new');
                  setCategoryForm({ name: '', description: '', imageUrl: '', parent: '', sortOrder: 0, isActive: true });
                  setCategoryFormError('');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            )}
            {tab === 'employees' && (
              <button
                onClick={() => {
                  setEditingPartner(null);
                  setPartnerForm({ fullName: '', email: '', phone: '', password: '' });
                  setPartnerFormError('');
                  setShowPartnerForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors w-full sm:w-auto justify-center"
              >
                <UserPlus className="w-4 h-4" /> Add Partner
              </button>
            )}
            {tab === 'coupons' && (
              <button
                onClick={() => {
                  setModalCoupon('new');
                  setCouponForm({
                    code: '',
                    description: '',
                    discountType: 'percentage',
                    discountValue: 0,
                    minimumOrderAmount: 0,
                    maximumDiscountAmount: undefined,
                    usageLimit: undefined,
                    expiresAt: '',
                  });
                  setCouponFormError('');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" /> Add Coupon
              </button>
            )}
          </div>
        </div>

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

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Recent Orders</h3>
                <button onClick={() => setTab('orders')} className="text-xs text-amber-600 font-semibold hover:underline">View all →</button>
              </div>
              {dataLoading ? (
                <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Order', 'Date', 'Status', 'Total'].map(h => (
                          <th key={h} className={`px-4 py-3 text-xs text-gray-500 font-semibold ${h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(stats.recentOrders ?? orders).slice(0, 8).map((o: any) => (
                        <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">#{o.orderNumber}</td>
                          <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3"><Badge variant={STATUS_BADGE[o.status] ?? 'default'}>{o.status}</Badge></td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(o.total)}</td>
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
              <div>
                <h2 className="font-black text-gray-900">All Orders</h2>
                <p className="text-xs text-gray-500 mt-0.5">{orders.length} orders total</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-48">
                      <OrderHeader columnKey="orderNumber" title="Order #" placeholder="Search order..." />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-44">
                      <OrderDateRange columnKey="createdAt" title="Date" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Items</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">
                      <OrderHeader columnKey="total" title="Total" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-44">
                      <OrderDropdown columnKey="status" title="Status" options={[
                        { label: 'Pending', value: 'pending' },
                        { label: 'Confirmed', value: 'confirmed' },
                        { label: 'Processing', value: 'processing' },
                        { label: 'Shipped', value: 'shipped' },
                        { label: 'Delivered', value: 'delivered' },
                        { label: 'Cancelled', value: 'cancelled' },
                      ]} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ordersPage.map((o: any) => (
                    <tr key={o._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900">#{o.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-600">{o.items?.length ?? 0}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{fmt(o.total)}</td>
                      <td className="px-4 py-3"><Badge variant={STATUS_BADGE[o.status] ?? 'default'}>{o.status}</Badge></td>
                    </tr>
                  ))}
                  {ordersPage.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">No orders found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <OrdersPagination />
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
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-36">
                      <ProductDropdown columnKey="isActive" title="Status" options={[
                        { label: 'Active', value: '__bool__:true' },
                        { label: 'Inactive', value: '__bool__:false' },
                      ]} />
                    </th>
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
                    : productsPage.map((p: any) => {
                      const img = (p.images || [])[0];
                      const isLow = p.inventory >= 0 && p.inventory <= (p.lowStockThreshold ?? 5);
                      const isOOS = p.inventory === 0;
                      const ed = editing[p._id];
                      const hasDiscount = p.comparePrice && p.comparePrice > p.price;

                      return (
                        <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${isOOS ? 'bg-red-50/40' : isLow ? 'bg-amber-50/40' : ''}`}>
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
                          <td className="px-4 py-3 text-gray-400 text-xs font-mono">{p.sku || '—'}</td>
                          <td className="px-4 py-3 text-xs">
                            {hasDiscount ? (
                              <span className="text-gray-400 line-through">{fmt(p.comparePrice)}</span>
                            ) : (
                              <span className="font-bold text-gray-900">{fmt(p.price)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {hasDiscount ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-100">
                                {Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)}% off
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-black text-emerald-600 text-xs">{fmt(p.price)}</td>
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
                          <td className="px-4 py-3">
                            <Badge variant={p.isActive ? 'success' : 'error'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                          </td>
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
            <ProductsPagination />
          </div>
        )}

        {/* ── Customers ── */}
        {tab === 'customers' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-gray-900">All Customers</h2>
                <p className="text-xs text-gray-500 mt-0.5">{stats.totalUsers ?? 0} registered customers</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
                />
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
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-44">
                      <CustomerDateRange columnKey="createdAt" title="Joined" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">
                      <CustomerHeader columnKey="orderCount" title="Orders" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">
                      <CustomerHeader columnKey="totalSpent" title="Total Spent" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-36">
                      <CustomerDropdown columnKey="isActive" title="Status" options={[
                        { label: 'Active', value: '__bool__:true' },
                        { label: 'Inactive', value: '__bool__:false' },
                      ]} />
                    </th>
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
                  ) : customersPage.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">{customerSearch ? 'No customers found' : 'No customers yet'}</p>
                      </td>
                    </tr>
                  ) : customersPage.map((c: any) => (
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
            <CustomersPagination />
          </div>
        )}

        {/* ── Employees (Delivery Partners) ── */}
        {tab === 'employees' && (
          <div className="space-y-6">
            {/* Delivery settings per-km rate config card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-amber-500" /> Delivery Payout Settings
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Configure the payout rate per kilometer for all delivery partners. Payouts are calculated dynamically at checkout.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-bold text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={deliveryRate}
                      onChange={e => setDeliveryRate(Number(e.target.value))}
                      className="w-32 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      placeholder="Rate per km"
                    />
                  </div>
                  <button
                    onClick={handleSaveDeliveryRate}
                    disabled={savingDeliveryRate || deliveryRate < 0}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingDeliveryRate && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Save Rate
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-black text-gray-900">Delivery Partners</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{partners.length} delivery partner{partners.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

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
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-36">
                        <PartnerDropdown columnKey="isActive" title="Status" options={[
                          { label: 'Active', value: '__bool__:true' },
                          { label: 'Inactive', value: '__bool__:false' },
                        ]} />
                      </th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">
                        Active
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
                    ) : partnersPage.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <Truck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No delivery partners found</p>
                        </td>
                      </tr>
                    ) : partnersPage.map((p: any) => (
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
                          <p className="text-[10px] text-gray-400">@ calculated by distance</p>
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
              <PartnersPagination />
            </div>
          </div>
        )}

        {/* ── Categories ── */}
        {tab === 'categories' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900">All Categories</h2>
                <p className="text-xs text-gray-500 mt-0.5">{categories.length} categories total</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-48">
                      <CategoryHeader columnKey="name" title="Category" placeholder="Search name..." />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-44">
                      <CategoryHeader columnKey="slug" title="Slug" placeholder="Search slug..." />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-56">Description</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-40">Parent Category</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Sort Order</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Products</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-36">
                      <CategoryDropdown columnKey="isActive" title="Status" options={[
                        { label: 'Active', value: '__bool__:true' },
                        { label: 'Inactive', value: '__bool__:false' },
                      ]} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dataLoading ? (
                    [1,2,3].map(i => (
                      <tr key={i}>
                        {[1,2,3,4,5,6,7,8].map(j => (
                          <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : categoriesPage.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No categories found</td>
                    </tr>
                  ) : categoriesPage.map((cat: any) => (
                    <tr key={cat._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                            {cat.imageUrl && <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />}
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{cat.slug}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-[200px]" title={cat.description}>{cat.description || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                        {cat.parent?.name || cat.parent || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-semibold text-xs">{cat.sortOrder ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                          <ShoppingBag className="w-3 h-3" />{cat.productCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cat.isActive ? 'success' : 'error'}>{cat.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setModalCategory(cat);
                              setCategoryForm({
                                name: cat.name || '',
                                description: cat.description || '',
                                imageUrl: cat.imageUrl || '',
                                parent: cat.parent?._id || cat.parent || '',
                                sortOrder: cat.sortOrder ?? 0,
                                isActive: cat.isActive !== false,
                              });
                              setCategoryFormError('');
                            }}
                            title="Edit category"
                            className="flex items-center justify-center w-7 h-7 border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteCategoryTarget(cat)}
                            title="Delete category"
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
            <CategoriesPagination />
          </div>
        )}

        {/* ── Coupons ── */}
        {tab === 'coupons' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900">Coupon Codes</h2>
                <p className="text-xs text-gray-500 mt-0.5">{coupons.length} coupons total</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-40">
                      <CouponHeader columnKey="code" title="Code" placeholder="Search code..." />
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-48">Description</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">Discount</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-36">Min Order</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">Usage Limit</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-32">Expiry Date</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold align-top w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {couponsLoading ? (
                    [1,2,3].map(i => (
                      <tr key={i}>
                        {[1,2,3,4,5,6,7].map(j => (
                          <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : couponsPage.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No coupons found</td>
                    </tr>
                  ) : couponsPage.map((coupon: any) => (
                    <tr key={coupon._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-100 uppercase tracking-wider">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-[200px]" title={coupon.description}>{coupon.description || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 text-xs">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : fmt(coupon.discountValue)}
                        {coupon.maximumDiscountAmount && ` (Max ${fmt(coupon.maximumDiscountAmount)})`}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-medium text-xs">
                        {coupon.minimumOrderAmount ? fmt(coupon.minimumOrderAmount) : 'No Min'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {coupon.usageLimit ? `${coupon.usageCount} / ${coupon.usageLimit}` : `${coupon.usageCount} used`}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDeleteCouponTarget(coupon)}
                          title="Delete coupon"
                          className="flex items-center justify-center w-7 h-7 border border-gray-200 hover:border-red-400 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CouponsPagination />
          </div>
        )}
      </div>

      {/* ── Product Create/Edit Modal ── */}
      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct === 'new' ? null : modalProduct}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setModalProduct(undefined)}
          onAddCategory={(newCat) => setCategories(prev => [...prev, { ...newCat, productCount: 0 }])}
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
      {/* ── Category Create/Edit Modal ── */}
      {modalCategory !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h3 className="text-lg font-black text-gray-900">
                {modalCategory === 'new' ? 'Add New Category' : 'Edit Category'}
              </h3>
              <button
                type="button"
                onClick={() => setModalCategory(undefined)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Headphones"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Description</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Category description..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Category Image</label>
                <div className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-14 h-14 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0 relative">
                    {categoryForm.imageUrl ? (
                      <img src={categoryForm.imageUrl} alt="Category" className="w-full h-full object-cover" />
                    ) : categoryImageUploading ? (
                      <Loader className="w-5 h-5 text-amber-500 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      readOnly
                      value={categoryForm.imageUrl}
                      placeholder="Upload category image file"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none bg-white cursor-not-allowed text-gray-500"
                    />
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCategoryImageChange}
                        disabled={categoryImageUploading}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Parent Category</label>
                <select
                  value={categoryForm.parent}
                  onChange={e => setCategoryForm(f => ({ ...f, parent: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">— No parent (Top-Level) —</option>
                  {categories
                    .filter(c => modalCategory === 'new' || c._id !== modalCategory._id)
                    .map((c: any) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Sort Order</label>
                <input
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={e => setCategoryForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <div
                  onClick={() => setCategoryForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`w-10 h-5 rounded-full transition-colors ${categoryForm.isActive ? 'bg-amber-500' : 'bg-gray-200'} relative cursor-pointer`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${categoryForm.isActive ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Active</span>
              </div>
              {categoryFormError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {categoryFormError}
                </div>
              )}
              <div className="flex gap-3 pt-2 shrink-0">
                <button
                  type="submit"
                  disabled={categorySaving}
                  className="flex-1 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {categorySaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {modalCategory === 'new' ? 'Create Category' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalCategory(undefined)}
                  className="px-6 py-3 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Category Confirmation ── */}
      {deleteCategoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-1">Delete Category?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Category <span className="font-semibold text-gray-700">{deleteCategoryTarget.name}</span> will be permanently removed.
              {(deleteCategoryTarget.productCount ?? 0) > 0 && (
                <span className="block text-xs text-red-500 font-semibold mt-1">
                  Warning: There are {deleteCategoryTarget.productCount} products associated with this category.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteCategoryTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={deleteCategoryLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleteCategoryLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Coupon Create Modal ── */}
      {modalCoupon === 'new' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h3 className="text-lg font-black text-gray-900">Add New Coupon</h3>
              <button
                type="button"
                onClick={() => setModalCoupon(undefined)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCoupon} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SAVE50"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Description</label>
                <textarea
                  rows={2}
                  value={couponForm.description}
                  onChange={e => setCouponForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description of the coupon..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Discount Type *</label>
                  <select
                    value={couponForm.discountType}
                    onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={couponForm.discountValue}
                    onChange={e => setCouponForm(f => ({ ...f, discountValue: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 10 or 100"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.minimumOrderAmount}
                    onChange={e => setCouponForm(f => ({ ...f, minimumOrderAmount: Number(e.target.value) || 0 }))}
                    placeholder="e.g. 500"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Max Discount Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.maximumDiscountAmount || ''}
                    onChange={e => setCouponForm(f => ({ ...f, maximumDiscountAmount: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="e.g. 200 (optional)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Usage Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={couponForm.usageLimit || ''}
                    onChange={e => setCouponForm(f => ({ ...f, usageLimit: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="Total usage limit (optional)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Expiry Date</label>
                  <input
                    type="date"
                    value={couponForm.expiresAt}
                    onChange={e => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>
              {couponFormError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {couponFormError}
                </div>
              )}
              <div className="flex gap-3 pt-2 shrink-0">
                <button
                  type="submit"
                  disabled={couponSaving}
                  className="flex-1 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {couponSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Create Coupon
                </button>
                <button
                  type="button"
                  onClick={() => setModalCoupon(undefined)}
                  className="px-6 py-3 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Coupon Confirmation ── */}
      {deleteCouponTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-1">Delete Coupon?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Coupon <span className="font-semibold text-gray-700">{deleteCouponTarget.code}</span> will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCouponTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteCoupon} disabled={deleteCouponLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteCouponLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportInventoryModal
          onClose={() => setShowImportModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

interface ImportInventoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportInventoryModal({ onClose, onSuccess }: ImportInventoryModalProps) {
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    if ((window as any).XLSX) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const downloadTemplate = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      alert('Excel library is still loading. Please wait a moment.');
      return;
    }
    
    const data = [
      ['SKU', 'Stock', 'Threshold'],
      ['FRU-001', 150, 10],
      ['DAI-001', 80, 5],
      ['ATT-001', 200, 15]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Template');
    XLSX.writeFile(workbook, 'inventory_import_template.xlsx');
  };

  const processFile = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
          setError('Excel library is still loading. Please try again in 2 seconds.');
          return;
        }
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rows.length < 2) {
          setError('The uploaded file appears to be empty or contains no records.');
          return;
        }

        // Normalize headers
        const headers = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
        const skuIdx = headers.findIndex(h => h.includes('sku'));
        const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('inventory') || h === 'qty' || h.includes('quantity'));
        const thresholdIdx = headers.findIndex(h => h.includes('threshold') || h.includes('alert') || h.includes('limit'));

        if (skuIdx === -1) {
          setError('Could not find a column containing "SKU" in the header row.');
          return;
        }
        if (stockIdx === -1) {
          setError('Could not find a column containing "Stock", "Inventory", or "Qty" in the header row.');
          return;
        }

        const parsed: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0) continue;

          const sku = String(row[skuIdx] || '').trim().toUpperCase();
          const rawStock = row[stockIdx];
          const inventory = parseInt(String(rawStock), 10);

          if (!sku && rawStock === undefined) continue;

          const item: any = { sku, inventory };

          if (thresholdIdx !== -1) {
            const rawThr = row[thresholdIdx];
            if (rawThr !== undefined && rawThr !== null && String(rawThr).trim() !== '') {
              const thr = parseInt(String(rawThr), 10);
              if (!isNaN(thr)) {
                item.lowStockThreshold = thr;
              }
            }
          }

          // Validation
          const skuRegex = /^[A-Z]{3}-\d{3}$/;
          if (!sku) {
            item.status = 'invalid';
            item.error = 'Missing SKU';
          } else if (!skuRegex.test(sku)) {
            item.status = 'invalid';
            item.error = 'Invalid SKU format (expected AAA-000)';
          } else if (isNaN(inventory) || inventory < 0) {
            item.status = 'invalid';
            item.error = 'Stock must be a non-negative integer';
          } else {
            item.status = 'valid';
          }

          parsed.push(item);
        }

        if (parsed.length === 0) {
          setError('No valid rows found in the sheet.');
        } else {
          setParsedData(parsed);
        }
      } catch (err: any) {
        setError(err.message || 'Error parsing file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    const validUpdates = parsedData.filter(d => d.status === 'valid');
    if (validUpdates.length === 0) {
      setError('No valid rows to import.');
      return;
    }

    setImporting(true);
    setError('');
    try {
      const res = await productApi.bulkUpdateInventory(validUpdates.map(u => ({
        sku: u.sku,
        inventory: u.inventory,
        lowStockThreshold: u.lowStockThreshold
      })));

      if (res.success) {
        const resultsMap = new Map(res.results.map((r: any) => [r.sku, r]));
        const updatedData = parsedData.map(item => {
          const resItem = resultsMap.get(item.sku);
          if (resItem) {
            if (resItem.success) {
              return { ...item, status: 'success' };
            } else {
              return { ...item, status: 'failed', error: resItem.error || 'Update failed' };
            }
          }
          return item;
        });

        setParsedData(updatedData);
        setSuccess(true);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Import request failed');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedData.filter(d => d.status === 'valid' || d.status === 'success').length;
  const invalidCount = parsedData.filter(d => d.status === 'invalid' || d.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Import Inventory</h2>
            <p className="text-xs text-gray-500 mt-0.5">Upload a CSV, XLSX, or XLS file matching SKU and Stock values</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          
          {parsedData.length === 0 ? (
            /* Upload box */
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${
                dragActive ? 'border-amber-500 bg-amber-50/30' : 'border-gray-200 hover:border-amber-400'
              }`}
            >
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <p className="font-bold text-gray-950 text-sm">Drag and drop your spreadsheet here</p>
              <p className="text-xs text-gray-400 mt-1 mb-5">Supports .xlsx, .xls, and .csv files up to 10MB</p>
              
              <label className="px-5 py-2.5 bg-gray-900 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                Select File
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1 mt-4"
              >
                <Download className="w-3.5 h-3.5" /> Download Sample Template (.xlsx)
              </button>
            </div>
          ) : (
            /* Table Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {validCount} Rows to Import
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {invalidCount} Rows with errors (will be ignored)
                  </span>
                )}
                <button
                  onClick={() => { setParsedData([]); setError(''); setSuccess(false); }}
                  className="text-amber-600 hover:underline"
                >
                  Upload different file
                </button>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">New Stock</th>
                      <th className="px-4 py-2.5">Threshold</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className={row.status === 'invalid' || row.status === 'failed' ? 'bg-red-50/20' : ''}>
                        <td className="px-4 py-2 font-mono font-bold text-gray-950">{row.sku || '—'}</td>
                        <td className="px-4 py-2 font-bold text-gray-700">{row.inventory}</td>
                        <td className="px-4 py-2 text-gray-400">{row.lowStockThreshold ?? '—'}</td>
                        <td className="px-4 py-2">
                          {row.status === 'valid' && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full text-[10px]">Valid</span>
                          )}
                          {row.status === 'invalid' && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded-full text-[10px]" title={row.error}>{row.error || 'Invalid'}</span>
                          )}
                          {row.status === 'success' && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px]">Imported</span>
                          )}
                          {row.status === 'failed' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full text-[10px]" title={row.error}>{row.error || 'Failed'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-bold">
              Inventory import completed successfully! Check the table above for details.
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
          
          {parsedData.length > 0 && !success && (
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {importing && <Loader className="w-4 h-4 animate-spin" />}
              Confirm Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
