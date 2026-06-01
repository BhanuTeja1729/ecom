import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Loader } from 'lucide-react';
import { categoryApi, mediaApi } from '../../lib/api';

interface Props {
  product: any | null;   // null = create mode
  categories: any[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  onAddCategory?: (category: any) => void;
}

const EMPTY = {
  name: '', description: '', shortDescription: '', sku: '',
  price: '', comparePrice: '', inventory: '0', lowStockThreshold: '5',
  category: '', tags: '', isFeatured: false, isActive: true,
  images: [{ url: '', altText: '', isPrimary: true, sortOrder: 0 }],
};

export function ProductModal({ product, categories, onSave, onClose, onAddCategory }: Props) {
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!form.name.trim()) {
      alert('Please enter a product name before uploading images.');
      return;
    }
    if (!form.category) {
      alert('Please select a category before uploading images.');
      return;
    }

    const selectedCat = categories.find((c: any) => c._id === form.category);
    if (!selectedCat) {
      alert('Selected category not found.');
      return;
    }

    setUploadingIndex(index);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'product');
    formData.append('categoryName', selectedCat.name);
    formData.append('productName', form.name.trim());

    try {
      const res = await mediaApi.upload(formData);
      if (res.success && res.data.url) {
        setImg(index, 'url', res.data.url);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload image.');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Category inline state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', description: '', parent: '', sortOrder: 0, isActive: true });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name ?? '',
        description: product.description ?? '',
        shortDescription: product.shortDescription ?? '',
        sku: product.sku ?? '',
        price: String(product.price ?? ''),
        comparePrice: String(product.comparePrice ?? ''),
        inventory: String(product.inventory ?? 0),
        lowStockThreshold: String(product.lowStockThreshold ?? 5),
        category: product.category?._id ?? product.category ?? '',
        tags: (product.tags ?? []).join(', '),
        isFeatured: product.isFeatured ?? false,
        isActive: product.isActive ?? true,
        images: product.images?.length
          ? product.images.map((i: any) => ({ url: i.url, altText: i.altText ?? '', isPrimary: i.isPrimary, sortOrder: i.sortOrder }))
          : [{ url: '', altText: '', isPrimary: true, sortOrder: 0 }],
      });
    } else {
      setForm(EMPTY);
    }
  }, [product]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryForm.name.trim()) {
      setCategoryError('Category name is required.');
      return;
    }
    setCategorySaving(true);
    setCategoryError('');
    try {
      const res = await categoryApi.create({
        name: newCategoryForm.name.trim(),
        description: newCategoryForm.description.trim() || undefined,
        parent: newCategoryForm.parent || undefined,
        sortOrder: Number(newCategoryForm.sortOrder) || 0,
        isActive: newCategoryForm.isActive,
      });

      if (res.success && res.data) {
        if (onAddCategory) {
          onAddCategory(res.data);
        }
        set('category', res.data._id);
        setShowAddCategory(false);
      } else {
        setCategoryError('Failed to create category.');
      }
    } catch (err: any) {
      setCategoryError(err.message || 'Failed to create category.');
    } finally {
      setCategorySaving(false);
    }
  }

  const setImg = (i: number, k: string, v: any) =>
    setForm((p: any) => {
      const imgs = [...p.images];
      imgs[i] = { ...imgs[i], [k]: v };
      return { ...p, images: imgs };
    });

  const addImg = () =>
    setForm((p: any) => ({
      ...p,
      images: [...p.images, { url: '', altText: '', isPrimary: false, sortOrder: p.images.length }],
    }));

  const removeImg = (i: number) =>
    setForm((p: any) => ({ ...p, images: p.images.filter((_: any, idx: number) => idx !== i) }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.description.trim() || !form.price) {
      setError('Name, description and price are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim(),
        shortDescription: form.shortDescription.trim(),
        sku: form.sku.trim() || undefined,
        price: parseFloat(form.price),
        comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : undefined,
        inventory: parseInt(form.inventory) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
        category: form.category || undefined,
        tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        images: form.images.filter((i: any) => i.url.trim()),
      });
    } catch (err: any) {
      setError(err.message || 'Save failed');
      setSaving(false);
    }
  }

  const label = 'block text-xs font-semibold text-gray-600 mb-1';
  const input = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Basic */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className={label}>Product Name *</label>
              <input className={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Premium Wireless Headphones" />
            </div>
            <div>
              <label className={label}>MRP / Main Price (₹) *</label>
              <input type="number" min={0} className={input} value={form.comparePrice} onChange={e => {
                const mrp = e.target.value;
                set('comparePrice', mrp);
                // Auto-calculate selling price from MRP and discount
                const disc = parseFloat(form.discountPercent);
                const mrpNum = parseFloat(mrp);
                if (mrpNum > 0 && disc > 0 && disc < 100) {
                  set('price', String(Math.round(mrpNum * (1 - disc / 100))));
                } else if (mrpNum > 0) {
                  set('price', mrp); // No discount → selling = MRP
                }
              }} placeholder="320" />
            </div>
            <div>
              <label className={label}>Discount %</label>
              <div className="relative">
                <input type="number" min={0} max={99} step={1} className={input + ' pr-8'} value={form.discountPercent ?? (() => {
                  // Auto-calculate from existing price/comparePrice
                  const p = parseFloat(form.price);
                  const cp = parseFloat(form.comparePrice);
                  if (cp > 0 && p > 0 && cp > p) return String(Math.round(((cp - p) / cp) * 100));
                  return '';
                })()} onChange={e => {
                  const disc = e.target.value;
                  set('discountPercent', disc);
                  const mrp = parseFloat(form.comparePrice);
                  if (mrp > 0 && parseFloat(disc) > 0 && parseFloat(disc) < 100) {
                    set('price', String(Math.round(mrp * (1 - parseFloat(disc) / 100))));
                  } else if (mrp > 0) {
                    set('price', String(Math.round(mrp))); // 0% discount → selling = MRP
                  }
                }} placeholder="10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">%</span>
              </div>
            </div>
            <div>
              <label className={label}>Selling Price (₹)</label>
              <input type="number" min={0} className={input + ' bg-gray-50 font-bold text-emerald-700'} value={form.price} onChange={e => {
                const sp = e.target.value;
                set('price', sp);
                // Auto-update discount % from MRP and new selling price
                const mrp = parseFloat(form.comparePrice);
                const spNum = parseFloat(sp);
                if (mrp > 0 && spNum > 0 && mrp > spNum) {
                  set('discountPercent', String(Math.round(((mrp - spNum) / mrp) * 100)));
                } else {
                  set('discountPercent', '');
                }
              }} placeholder="289" />
              {parseFloat(form.comparePrice) > 0 && parseFloat(form.price) > 0 && parseFloat(form.comparePrice) > parseFloat(form.price) && (
                <p className="text-[11px] text-amber-600 font-semibold mt-1">
                  You save ₹{(parseFloat(form.comparePrice) - parseFloat(form.price)).toLocaleString('en-IN')} ({Math.round(((parseFloat(form.comparePrice) - parseFloat(form.price)) / parseFloat(form.comparePrice)) * 100)}% off)
                </p>
              )}
            </div>
            <div>
              <label className={label}>SKU</label>
              <input className={input} value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="ABC-123" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={label + ' mb-0'}>Category</label>
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryForm({ name: '', description: '', parent: '', sortOrder: 0, isActive: true });
                    setCategoryError('');
                    setShowAddCategory(true);
                  }}
                  className="text-[11px] text-amber-600 font-bold hover:underline"
                >
                  + New Category
                </button>
              </div>
              <select className={input} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">— No category —</option>
                {categories.map((c: any) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Stock</label>
              <input type="number" min={0} className={input} value={form.inventory} onChange={e => set('inventory', e.target.value)} />
            </div>
            <div>
              <label className={label}>Low-Stock Alert At</label>
              <input type="number" min={0} className={input} value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={label}>Description *</label>
            <textarea rows={3} className={input} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Full product description…" />
          </div>
          <div>
            <label className={label}>Short Description</label>
            <input className={input} value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} placeholder="One-liner shown in listings" />
          </div>
          <div>
            <label className={label}>Tags (comma-separated)</label>
            <input className={input} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="wireless, audio, headphones" />
          </div>

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={label + ' mb-0'}>Product Images</label>
              <button type="button" onClick={addImg} className="text-xs text-amber-600 font-semibold flex items-center gap-1 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add Image Slot
              </button>
            </div>
            <div className="space-y-3">
              {form.images.map((img: any, i: number) => (
                <div key={i} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-xl border border-gray-100 relative group">
                  {/* Thumbnail / Upload Status */}
                  <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0 relative">
                    {img.url ? (
                      <img src={img.url} alt={img.altText || 'Product'} className="w-full h-full object-cover" />
                    ) : uploadingIndex === i ? (
                      <Loader className="w-6 h-6 text-amber-500 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex gap-2">
                      <input
                        className={input + ' flex-1 bg-white cursor-not-allowed text-xs'}
                        value={img.url}
                        readOnly
                        placeholder="Click Upload File to choose an image"
                      />
                      <label className="px-3 py-2 bg-gray-900 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0">
                        <Upload className="w-3 h-3" />
                        Upload File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleFileChange(e, i)}
                          disabled={uploadingIndex !== null}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        className={input + ' w-full sm:w-48 bg-white py-1.5 px-3 text-xs'}
                        value={img.altText}
                        onChange={e => setImg(i, 'altText', e.target.value)}
                        placeholder="SEO alt text"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                          checked={img.isPrimary}
                          onChange={e => {
                            // Enforce only one primary image
                            setForm((p: any) => ({
                              ...p,
                              images: p.images.map((im: any, idx: number) => ({
                                ...im,
                                isPrimary: idx === i ? e.target.checked : false
                              }))
                            }));
                          }}
                        />
                        Primary
                      </label>
                    </div>
                  </div>

                  {form.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImg(i)}
                      className="absolute top-2 right-2 sm:static text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            {[
              { key: 'isActive', label: 'Active' },
              { key: 'isFeatured', label: 'Featured' },
            ].map(({ key, label: lbl }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => set(key, !form[key])}
                  className={`w-10 h-5 rounded-full transition-colors ${form[key] ? 'bg-amber-500' : 'bg-gray-200'} relative cursor-pointer`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form[key] ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{lbl}</span>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} type="button" className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit as any} disabled={saving} className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {product ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>

      {showAddCategory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 transform transition-all scale-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-gray-900">Add New Category</h3>
              <button
                type="button"
                onClick={() => setShowAddCategory(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home & Kitchen"
                  value={newCategoryForm.name}
                  onChange={e => setNewCategoryForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of products in this category..."
                  value={newCategoryForm.description}
                  onChange={e => setNewCategoryForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Parent Category</label>
                <select
                  value={newCategoryForm.parent}
                  onChange={e => setNewCategoryForm(f => ({ ...f, parent: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">— No parent (Top-Level) —</option>
                  {categories.map((c: any) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {categoryError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {categoryError}
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 border border-gray-200 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySaving}
                  className="px-4 py-2 bg-gray-900 hover:bg-amber-600 text-white text-xs font-bold rounded-xl disabled:opacity-60 flex items-center gap-1.5"
                >
                  {categorySaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
