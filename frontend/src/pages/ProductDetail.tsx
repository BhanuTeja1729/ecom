import { useState, useEffect } from 'react';
import { ShoppingCart, Heart, Shield, Users, Banknote, Truck, RotateCcw, Share2, ChevronLeft, ChevronRight, Star, Plus, Minus, Zap, ChevronDown, Clock } from 'lucide-react';
import { productApi } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { StarRating } from '../components/ui/StarRating';
import { Badge } from '../components/ui/Badge';

/* ─── custom quick-commerce card component ──────────────────────────────── */
function BlinkitProductCard({ product }: { product: any }) {
  const { navigate } = useRouter();
  const { items, addItem, updateQuantity } = useCart();
  const [showVariants, setShowVariants] = useState(false);

  const id = product._id || product.id;
  const name = product.name;
  const slug = product.slug;
  const images = product.images || product.product_images || [];
  const primaryImage = images.find((i: any) => i.isPrimary || i.is_primary) ?? images[0];

  const variants = product.variants || product.product_variants || [];
  const hasVariants = variants.length > 0;

  // Local state for active variant selected on the card
  const [selectedVar, setSelectedVar] = useState<any>(variants[0] ?? null);

  const priceModifier = selectedVar?.priceModifier ?? selectedVar?.price_modifier ?? 0;
  const comparePriceModifier = selectedVar?.comparePriceModifier ?? selectedVar?.compare_price_modifier ?? 0;

  const effectivePrice = product.price + priceModifier;
  const baseComparePrice = product.comparePrice ?? product.compare_price;
  const effectiveComparePrice = baseComparePrice ? (baseComparePrice + comparePriceModifier) : undefined;
  const discount = effectiveComparePrice ? Math.round(((effectiveComparePrice - effectivePrice) / effectiveComparePrice) * 100) : 0;

  // Cart lookup for this variant
  const cartItem = items.find((i: any) => {
    const pid = i.product._id || i.product.id;
    const vid = i.variant?._id || i.variant?.id;
    const targetVid = selectedVar?._id || selectedVar?.id;
    return pid === id && vid === targetVid;
  });

  const sizeText = selectedVar ? selectedVar.value : (product.weight ? `${product.weight}g` : '1 unit');
  const formattedPrice = '₹' + effectivePrice.toLocaleString('en-IN');
  const formattedComparePrice = effectiveComparePrice ? '₹' + effectiveComparePrice.toLocaleString('en-IN') : null;

  return (
    <div className="relative bg-white border border-gray-100 rounded-2xl p-3 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
      {/* Discount Badge */}
      {discount > 0 && (
        <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-sm">
          {discount}% OFF
        </div>
      )}

      {/* Image click wrapper */}
      <div
        onClick={() => navigate(`/product/${slug}`)}
        className="cursor-pointer aspect-square w-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center mb-2 p-1"
      >
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.altText || name}
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <ShoppingCart className="w-10 h-10 text-gray-200" />
        )}
      </div>

      {/* Info & Footer */}
      <div className="flex-grow flex flex-col justify-between">
        <div>
          {/* Product Name */}
          <h4
            onClick={() => navigate(`/product/${slug}`)}
            className="cursor-pointer text-xs font-bold text-gray-800 line-clamp-2 h-8 leading-snug mb-2 hover:text-emerald-600 transition-colors"
          >
            {name}
          </h4>

          {/* Variant dropdown inside card */}
          <div className="relative mb-3">
            {hasVariants ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowVariants(!showVariants)}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold text-gray-500 hover:text-gray-900 border border-gray-100 bg-gray-50 px-2 py-1 rounded-lg transition-all cursor-pointer"
                >
                  {sizeText} <ChevronDown className="w-3 h-3 text-emerald-600" />
                </button>

                {showVariants && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowVariants(false)} />
                    <div className="absolute bottom-full left-0 mb-1 z-30 bg-white border border-gray-100 rounded-xl shadow-2xl p-1.5 min-w-[120px] max-h-40 overflow-y-auto">
                      {variants.map((v: any) => {
                        const vid = v._id || v.id;
                        const isSelected = (selectedVar?._id || selectedVar?.id) === vid;
                        return (
                          <button
                            key={vid}
                            type="button"
                            onClick={() => {
                              setSelectedVar(v);
                              setShowVariants(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isSelected
                              ? 'bg-emerald-50 text-emerald-700 font-bold'
                              : 'hover:bg-gray-50 text-gray-700'
                              }`}
                          >
                            {v.value}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <span className="text-[10px] font-extrabold text-gray-400">
                {sizeText}
              </span>
            )}
          </div>
        </div>

        {/* Footer: Price and Cart Control */}
        <div className="flex items-center justify-between gap-1 mt-auto">
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-gray-900">{formattedPrice}</span>
            {formattedComparePrice && (
              <span className="text-[10px] text-gray-400 line-through font-semibold leading-none mt-0.5">
                {formattedComparePrice}
              </span>
            )}
          </div>

          <div>
            {product.inventory === 0 ? (
              <span className="text-[10px] text-red-500 font-bold px-2 py-1 bg-red-50 rounded-lg">
                OOS
              </span>
            ) : cartItem ? (
              <div className="flex items-center bg-emerald-600 text-white rounded-lg shadow-sm border border-emerald-600 font-extrabold text-xs">
                <button
                  type="button"
                  onClick={() => updateQuantity(id, selectedVar?._id || selectedVar?.id, cartItem.quantity - 1)}
                  className="px-2 py-1 hover:bg-emerald-700 transition-colors rounded-l-lg"
                >
                  <Minus className="w-3 h-3 stroke-[3]" />
                </button>
                <span className="px-1.5 py-1 text-xs select-none">
                  {cartItem.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(id, selectedVar?._id || selectedVar?.id, cartItem.quantity + 1)}
                  className="px-2 py-1 hover:bg-emerald-700 transition-colors rounded-r-lg"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  addItem(product, selectedVar, 1);
                }}
                className="px-3.5 py-1 bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-black transition-all"
              >
                ADD
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetail({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const { items, addItem, updateQuantity } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { toast } = useToast();

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [peopleBought, setPeopleBought] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await productApi.get(slug);
        const data = res.data;
        if (!data) { navigate('/shop'); return; }
        setProduct(data);
        setSelectedImage(0);

        const productId = data._id || data.id;

        // Load related products (same category)
        if (data.category?._id || data.category) {
          try {
            const catId = data.category._id || data.category;
            const relRes = await productApi.list({ category: catId, limit: '6' });
            setRelated((relRes.data ?? []).filter((p: any) => (p._id || p.id) !== productId));
          } catch { setRelated([]); }
        }

        // Load people also bought (featured products)
        try {
          const featRes = await productApi.list({ isFeatured: 'true', limit: '7' });
          setPeopleBought((featRes.data ?? []).filter((p: any) => (p._id || p.id) !== productId));
        } catch { setPeopleBought([]); }
      } catch {
        navigate('/shop');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, navigate]);

  // Auto-select first variant on load
  useEffect(() => {
    if (product) {
      const vars = product.variants || product.product_variants || [];
      if (vars.length > 0) {
        const groups: Record<string, any> = {};
        vars.forEach((v: any) => {
          const groupName = v.name || v.type || 'Size';
          if (!groups[groupName]) {
            groups[groupName] = v;
          }
        });
        setSelectedVariants(groups);
      } else {
        setSelectedVariants({});
      }
    }
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-200 rounded-3xl" />
              <div className="flex gap-3">
                {[1, 2, 3].map(i => <div key={i} className="w-20 h-20 bg-gray-200 rounded-xl" />)}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-10 bg-gray-200 rounded w-1/3" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images: any[] = (product.images || product.product_images || []).sort(
    (a: any, b: any) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0)
  );
  const primaryImage = images[selectedImage] ?? images[0];

  // Group variants
  const variants: any[] = product.variants || product.product_variants || [];
  const variantGroups: Record<string, any[]> = {};
  variants.forEach((v: any) => {
    const groupName = v.name || v.type || 'Size';
    if (!variantGroups[groupName]) variantGroups[groupName] = [];
    variantGroups[groupName].push(v);
  });

  const selectedVariant = Object.values(selectedVariants)[0] ?? null;
  const priceModifier = selectedVariant?.priceModifier ?? selectedVariant?.price_modifier ?? 0;
  const comparePriceModifier = selectedVariant?.comparePriceModifier ?? selectedVariant?.compare_price_modifier ?? 0;

  const effectivePrice = product.price + priceModifier;
  const baseComparePrice = product.comparePrice ?? product.compare_price;
  const effectiveComparePrice = baseComparePrice ? (baseComparePrice + comparePriceModifier) : undefined;
  const discount = effectiveComparePrice ? Math.round(((effectiveComparePrice - effectivePrice) / effectiveComparePrice) * 100) : 0;

  const inventory = product.inventory ?? 0;
  const isOutOfStock = inventory === 0;
  const productId = product._id || product.id;
  const wishlisted = isWishlisted(productId);
  const categoryInfo = product.category;

  const ratingAvg = product.ratingAvg ?? product.rating_avg ?? 0;
  const ratingCount = product.ratingCount ?? product.rating_count ?? 0;
  const soldCount = product.soldCount ?? product.sold_count ?? 0;

  // Cart item lookup for detail controls
  const activeCartItem = items.find((i: any) => {
    const pid = i.product._id || i.product.id;
    const vid = i.variant?._id || i.variant?.id;
    const activePid = product._id || product.id;
    const activeVid = selectedVariant?._id || selectedVariant?.id;
    return pid === activePid && vid === activeVid;
  });

  function formatPrice(p: number) {
    return '₹' + p.toLocaleString('en-IN');
  }

  const trustPoints = [
    {
      title: 'Scheduled Delivery',
      description: 'Get your order delivered to your doorstep at your scheduled time.',
      icon: Clock,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Best Prices & Offers',
      description: 'Best price destination with offers directly from the manufacturers.',
      icon: Banknote,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Wide Assortment',
      description: 'Choose from thousands of products across daily essentials, personal care, and more.',
      icon: ShoppingCart,
      iconBg: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">

          {/* Left Column: Images + Collapsible Specifications */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 flex items-center justify-center p-6 group">
              {primaryImage ? (
                <img
                  src={primaryImage.url}
                  alt={primaryImage.altText || product.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <ShoppingCart className="w-24 h-24 text-gray-200" />
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-all hover:scale-105"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(i => (i + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-all hover:scale-105"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border bg-white flex items-center justify-center p-1 transition-all ${i === selectedImage ? 'border-emerald-500 ring-2 ring-emerald-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <img src={img.url} alt={img.altText || 'Thumbnail'} className="max-h-full max-w-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Structured specifications & toggle details */}
            <div className="border border-gray-100 rounded-2xl p-5 mt-6">
              <h3 className="text-base font-extrabold text-gray-900 mb-3">Product Details</h3>
              <div className="space-y-3">

                {categoryInfo && (
                  <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Category</span>
                    <span className="text-gray-900 font-bold">{categoryInfo.name}</span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Net Weight</span>
                    <span className="text-gray-900 font-bold">{product.weight}g</span>
                  </div>
                )}

                {/* Expanded Details section */}
                {detailsExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 text-xs text-gray-600 leading-relaxed animate-in fade-in duration-300">
                    <div>
                      <h4 className="font-extrabold text-gray-800 mb-1 uppercase tracking-wide">Product Description</h4>
                      <p className="whitespace-pre-line">{product.description}</p>
                    </div>
                    {product.shortDescription && (
                      <div>
                        <h4 className="font-extrabold text-gray-800 mb-1 uppercase tracking-wide">Highlights</h4>
                        <p>{product.shortDescription}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-gray-800 mb-1 uppercase tracking-wide">Shipping</h4>
                      <p>Free standard shipping applies on orders over ₹999. Cash on Delivery only.</p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="w-full text-center text-xs font-extrabold text-emerald-600 hover:text-emerald-700 py-1 mt-2 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  {detailsExpanded ? 'View Less Details ▴' : 'View More Details ▾'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Title + Price + Add To Cart + Trust */}
          <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">

            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <button onClick={() => navigate('/')} className="hover:text-emerald-600 transition-colors">Home</button>
              <span>/</span>
              {categoryInfo && (
                <>
                  <button onClick={() => navigate(`/category/${categoryInfo.slug}`)} className="hover:text-emerald-600 transition-colors">{categoryInfo.name}</button>
                  <span>/</span>
                </>
              )}
              <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
            </div>

            {/* Product Title */}
            <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight">
              {product.name}
            </h1>


            {/* Sub-header row (Delivery Speed & Selected Variant display) */}
            <div className="flex flex-wrap items-center gap-3">
              {selectedVariant && (
                <span className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                  {selectedVariant.value}
                </span>
              )}
            </div>

            {/* Horizontal spacer */}
            <div className="h-[1px] bg-gray-100" />

            {/* Price & Action Row */}
            <div className="flex items-center justify-between py-2 gap-4">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl font-black text-gray-900">{formatPrice(effectivePrice)}</span>
                  {effectiveComparePrice && (
                    <span className="text-base text-gray-400 line-through font-bold">
                      {formatPrice(effectiveComparePrice)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded shadow-sm">
                      {discount}% OFF
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">
                  (Inclusive of all taxes)
                </p>
              </div>

              {/* Blinkit Quick-Add Cart Button */}
              <div className="flex items-center gap-3">
                {isOutOfStock ? (
                  <span className="px-5 py-2.5 bg-gray-100 border border-gray-200 text-gray-400 text-xs font-bold rounded-xl">
                    Out of Stock
                  </span>
                ) : activeCartItem ? (
                  <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-md border border-emerald-600 font-extrabold text-sm overflow-hidden">
                    <button
                      onClick={() => updateQuantity(productId, selectedVariant?._id || selectedVariant?.id, activeCartItem.quantity - 1)}
                      className="px-4 py-2.5 hover:bg-emerald-700 transition-colors text-base"
                    >
                      <Minus className="w-4 h-4 stroke-[3]" />
                    </button>
                    <span className="px-3 py-2.5 text-sm min-w-[32px] text-center select-none font-black">
                      {activeCartItem.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(productId, selectedVariant?._id || selectedVariant?.id, activeCartItem.quantity + 1)}
                      className="px-4 py-2.5 hover:bg-emerald-700 transition-colors text-base"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      addItem(product, selectedVariant, 1);
                      toast(`${product.name} added to cart`, 'success');
                    }}
                    className="px-8 py-2.5 bg-white text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-50 rounded-xl text-sm font-black transition-all hover:shadow-md cursor-pointer"
                  >
                    ADD
                  </button>
                )}

                {/* Wishlist Button */}
                <button
                  onClick={() => {
                    toggle(productId);
                    toast(wishlisted ? 'Removed from wishlist' : 'Added to wishlist', 'info');
                  }}
                  className={`p-2.5 rounded-xl border transition-all hover:scale-105 ${wishlisted
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500'
                    }`}
                >
                  <Heart className={`w-5 h-5 ${wishlisted ? 'fill-red-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Variant selector chips */}
            {Object.entries(variantGroups).map(([groupName, groupVariants]) => (
              <div key={groupName} className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  Select {groupName}
                </label>
                <div className="flex flex-wrap gap-2">
                  {groupVariants.map((v: any) => {
                    const vid = v._id || v.id;
                    const selVid = selectedVariants[groupName]?._id || selectedVariants[groupName]?.id;
                    const isSelected = selVid === vid;
                    return (
                      <button
                        key={vid}
                        onClick={() => setSelectedVariants({ [groupName]: v })}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-extrabold shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {v.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="h-[1px] bg-gray-100" />

            {/* Why Shop From Us Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                Why shop from us?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                {trustPoints.map((pt, idx) => {
                  const Icon = pt.icon;
                  return (
                    <div key={idx} className="flex gap-3 items-start border border-gray-50 rounded-xl p-3 bg-gray-50/20">
                      <div className={`p-2 rounded-full shrink-0 ${pt.iconBg}`}>
                        <Icon className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{pt.title}</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{pt.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Similar Products scroll */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-gray-100 pt-12">
            <h2 className="text-lg font-black text-gray-900 mb-6">Similar products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {related.map((p: any) => (
                <BlinkitProductCard key={p._id || p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* People Also Bought scroll */}
        {peopleBought.length > 0 && (
          <div className="mt-16 border-t border-gray-100 pt-12">
            <h2 className="text-lg font-black text-gray-900 mb-6">People also bought</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {peopleBought.map((p: any) => (
                <BlinkitProductCard key={p._id || p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
