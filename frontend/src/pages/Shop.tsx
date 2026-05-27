import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, X, ShoppingCart } from 'lucide-react';
import { productApi, categoryApi } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { useRouter } from '../lib/router';

/* ─── tiny helper to scroll a ref left / right ─────────────────────────── */
function scrollRow(ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') {
  if (ref.current) ref.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
}

/* ─── product card matching the reference image ─────────────────────────── */
function QuickCard({ product, onAdd }: { product: any; onAdd: () => void }) {
  const img = product.images?.[0]?.url ?? '';
  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;
  const { navigate } = useRouter();

  return (
    <div className="flex-shrink-0 w-[180px] bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer group">
      {/* Image */}
      <div
        className="relative h-[140px] bg-gray-50 flex items-center justify-center p-3"
        onClick={() => navigate(`/product/${product.slug}`)}
      >
        {img
          ? <img src={img} alt={product.name} className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300" />
          : <ShoppingCart className="w-12 h-12 text-gray-200" />
        }
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {discount}% off
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        {/* Featured / discount badge */}
        <div className="flex items-center gap-1 mb-1.5">
          {discount > 0 ? (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              🏷 {discount}% discount
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              ✦ Premium
            </span>
          )}
        </div>

        {/* Name */}
        <p
          className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1 min-h-[2.5rem]"
          onClick={() => navigate(`/product/${product.slug}`)}
        >
          {product.name}
        </p>

        {/* Short description / SKU */}
        <p className="text-[11px] text-gray-400 mb-2.5">
          {product.shortDescription ?? (product.sku ?? '')}
        </p>

        {/* Price + Add button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-gray-900">₹{product.price.toLocaleString('en-IN')}</p>
            {product.comparePrice > product.price && (
              <p className="text-[10px] text-gray-400 line-through">₹{product.comparePrice.toLocaleString('en-IN')}</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="flex items-center justify-center gap-0.5 px-3 py-1.5 bg-gray-900 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold rounded-lg transition-all"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── horizontal row of products for one category ───────────────────────── */
function CategoryRow({ category, products, onAdd, onSeeAll }: {
  category: any;
  products: any[];
  onAdd: (p: any) => void;
  onSeeAll: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  function updateArrows() {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanLeft(scrollLeft > 0);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 4);
  }

  return (
    <section className="mb-8">
      {/* Row header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg font-black text-gray-900">{category.name}</h2>
        <button onClick={onSeeAll} className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
          See All →
        </button>
      </div>

      {/* Scrollable row */}
      <div className="relative group/row">
        {/* Left arrow */}
        {canLeft && (
          <button
            onClick={() => { scrollRow(rowRef, 'left'); setTimeout(updateArrows, 350); }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-3 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center border border-gray-100 hover:shadow-xl transition-all opacity-0 group-hover/row:opacity-100"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
        )}

        <div
          ref={rowRef}
          onScroll={updateArrows}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map(p => (
            <QuickCard key={p._id} product={p} onAdd={() => onAdd(p)} />
          ))}
          {/* See all card */}
          <div
            onClick={onSeeAll}
            className="flex-shrink-0 w-[180px] bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-100 flex flex-col items-center justify-center cursor-pointer hover:from-amber-100 hover:to-amber-200 transition-all gap-2"
          >
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-bold text-amber-700 text-center px-3">See all {category.name}</p>
          </div>
        </div>

        {/* Right arrow */}
        {canRight && (
          <button
            onClick={() => { scrollRow(rowRef, 'right'); setTimeout(updateArrows, 350); }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-3 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center border border-gray-100 hover:shadow-xl transition-all opacity-0 group-hover/row:opacity-100"
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
        )}
      </div>
    </section>
  );
}

/* ─── category icon pill at the top ─────────────────────────────────────── */
const CAT_COLORS = [
  'bg-orange-50', 'bg-green-50', 'bg-pink-50', 'bg-blue-50',
  'bg-yellow-50', 'bg-purple-50', 'bg-rose-50', 'bg-teal-50',
];

/* ─── main Shop page ─────────────────────────────────────────────────────── */
export function Shop({ categorySlug }: { categorySlug?: string }) {
  const { navigate } = useRouter();
  const { addItem } = useCart();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(categorySlug ?? '');
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      categoryApi.list(),
      productApi.list({ limit: '100', sort: 'createdAt', order: 'desc' }),
    ])
      .then(([cats, prods]) => {
        setCategories(cats.data ?? []);
        setAllProducts(prods.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleAdd(product: any) {
    addItem(product, null, 1);
    setAddedId(product._id);
    setTimeout(() => setAddedId(null), 1500);
  }

  /* Filter products by search + activeCategory */
  const filtered = allProducts.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || p.category?.slug === activeCategory || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  /* Group by category */
  const grouped: { category: any; products: any[] }[] = [];
  if (!activeCategory && !search) {
    categories.forEach(cat => {
      const prods = allProducts.filter(p => p.category?.slug === cat.slug || p.category?._id === cat._id || p.category === cat._id);
      if (prods.length > 0) grouped.push({ category: cat, products: prods });
    });
    // Uncategorised
    const uncatProds = allProducts.filter(p => !p.category);
    if (uncatProds.length > 0) grouped.push({ category: { name: 'Other', slug: '' }, products: uncatProds });
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* ── Search bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 max-w-xl">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search "headphones", "jacket"…'
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Category icon strip ── */}
        {!loading && categories.length > 0 && (
          <div className="mb-8 -mx-4 px-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-4 w-max">
              <button
                onClick={() => { setActiveCategory(''); setSearch(''); }}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${!activeCategory ? 'bg-gray-900 shadow-lg shadow-gray-300' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'}`}>
                  <span className="text-2xl">🛒</span>
                </div>
                <span className={`text-[11px] font-semibold text-center leading-tight max-w-[68px] ${!activeCategory ? 'text-gray-900' : 'text-gray-600'}`}>All</span>
              </button>

              {categories.map((cat: any, i) => (
                <button
                  key={cat._id}
                  onClick={() => setActiveCategory(cat.slug === activeCategory ? '' : cat.slug)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden transition-all
                    ${activeCategory === cat.slug
                      ? 'ring-2 ring-amber-500 ring-offset-2 shadow-lg shadow-amber-100'
                      : 'border border-gray-100 shadow-sm hover:shadow-md hover:ring-1 hover:ring-amber-200'
                    } ${CAT_COLORS[i % CAT_COLORS.length]}`}
                  >
                    {cat.imageUrl
                      ? <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 object-contain" />
                      : <span className="text-xl font-black text-gray-700">{cat.name.charAt(0)}</span>
                    }
                  </div>
                  <span className={`text-[11px] font-semibold text-center leading-tight max-w-[68px] ${activeCategory === cat.slug ? 'text-amber-600' : 'text-gray-600'}`}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Skeleton ── */}
        {loading && (
          <div className="space-y-8">
            {[1, 2].map(i => (
              <div key={i}>
                <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse mb-4" />
                <div className="flex gap-3">
                  {[1,2,3,4,5].map(j => (
                    <div key={j} className="flex-shrink-0 w-[180px] h-[260px] bg-white rounded-2xl border border-gray-100 animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Grouped by category (default view) ── */}
        {!loading && !activeCategory && !search && grouped.length > 0 && (
          <div>
            {grouped.map(({ category, products }) => (
              <CategoryRow
                key={category.slug || 'other'}
                category={category}
                products={products}
                onAdd={handleAdd}
                onSeeAll={() => { setActiveCategory(category.slug); }}
              />
            ))}
          </div>
        )}

        {/* ── Filtered / search / single-category view ── */}
        {!loading && (activeCategory || search) && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                {activeCategory && (
                  <h1 className="text-xl font-black text-gray-900">
                    {categories.find(c => c.slug === activeCategory)?.name ?? activeCategory}
                  </h1>
                )}
                {search && <p className="text-sm text-gray-500 mt-0.5">{filtered.length} results for "{search}"</p>}
              </div>
              {(activeCategory || search) && (
                <button
                  onClick={() => { setActiveCategory(''); setSearch(''); }}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-bold text-gray-900 mb-1">No products found</p>
                <p className="text-gray-500 text-sm">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map(p => (
                  <QuickCard key={p._id} product={p} onAdd={() => handleAdd(p)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Empty state when no products at all ── */}
        {!loading && allProducts.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🛒</p>
            <p className="font-black text-gray-900 text-xl mb-2">No products yet</p>
            <p className="text-gray-500">Products added by the admin will appear here.</p>
          </div>
        )}
      </div>

      {/* ── Added to cart toast ── */}
      {addedId && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-amber-400" />
        <span>Added to cart!</span>
      </div>
    )}
    </div>
  );
}
