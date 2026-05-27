import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface Props {
  product: any | null;   // null = create mode
  categories: any[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

const EMPTY = {
  name: '', description: '', shortDescription: '', sku: '',
  price: '', comparePrice: '', inventory: '0', lowStockThreshold: '5',
  category: '', tags: '', isFeatured: false, isActive: true,
  images: [{ url: '', altText: '', isPrimary: true, sortOrder: 0 }],
};

export function ProductModal({ product, categories, onSave, onClose }: Props) {
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={label}>Product Name *</label>
              <input className={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Premium Wireless Headphones" />
            </div>
            <div>
              <label className={label}>Price (₹) *</label>
              <input type="number" min={0} className={input} value={form.price} onChange={e => set('price', e.target.value)} placeholder="29999" />
            </div>
            <div>
              <label className={label}>Compare Price (₹)</label>
              <input type="number" min={0} className={input} value={form.comparePrice} onChange={e => set('comparePrice', e.target.value)} placeholder="39999" />
            </div>
            <div>
              <label className={label}>SKU</label>
              <input className={input} value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="ELEC-001" />
            </div>
            <div>
              <label className={label}>Category</label>
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
              <label className={label + ' mb-0'}>Image URLs</label>
              <button type="button" onClick={addImg} className="text-xs text-amber-600 font-semibold flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Add image
              </button>
            </div>
            <div className="space-y-2">
              {form.images.map((img: any, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className={input + ' flex-1'}
                    value={img.url}
                    onChange={e => setImg(i, 'url', e.target.value)}
                    placeholder="https://…"
                  />
                  <input
                    className={input + ' w-32'}
                    value={img.altText}
                    onChange={e => setImg(i, 'altText', e.target.value)}
                    placeholder="Alt text"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                    <input type="checkbox" checked={img.isPrimary} onChange={e => setImg(i, 'isPrimary', e.target.checked)} />
                    Primary
                  </label>
                  {form.images.length > 1 && (
                    <button type="button" onClick={() => removeImg(i)} className="text-red-400 hover:text-red-600">
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
    </div>
  );
}
