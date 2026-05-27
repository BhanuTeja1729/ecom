import { useState, useEffect } from 'react';
import { ShoppingCart, Heart, Shield, Truck, RotateCcw, Share2, ChevronLeft, ChevronRight, Star, Plus, Minus, Zap } from 'lucide-react';
import { productApi } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useToast } from '../contexts/ToastContext';
import { useRouter } from '../lib/router';
import { StarRating } from '../components/ui/StarRating';
import { Badge } from '../components/ui/Badge';
import { ProductCard } from '../components/ui/ProductCard';

export function ProductDetail({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const { addItem } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { toast } = useToast();

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'shipping'>('description');

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

        // Load reviews
        try {
          const revRes = await productApi.reviews(productId);
          setReviews(revRes.data ?? []);
        } catch { setReviews([]); }

        // Load related products (same category)
        if (data.category?._id || data.category) {
          try {
            const catId = data.category._id || data.category;
            const relRes = await productApi.list({ category: catId, limit: '4' });
            setRelated((relRes.data ?? []).filter((p: any) => (p._id || p.id) !== productId));
          } catch { setRelated([]); }
        }
      } catch {
        navigate('/shop');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-200 rounded-2xl" />
              <div className="flex gap-3">
                {[1,2,3].map(i => <div key={i} className="w-20 h-20 bg-gray-200 rounded-xl" />)}
              </div>
            </div>
            <div className="space-y-4">
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

  const images: any[] = (product.images || product.product_images || []).sort((a: any, b: any) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0));
  const primaryImage = images[selectedImage] ?? images[0];

  // Normalize variants into groups
  const variants: any[] = product.variants || product.product_variants || [];
  const variantGroups: Record<string, any[]> = {};
  variants.forEach((v: any) => {
    const groupName = v.name || v.type;
    if (!variantGroups[groupName]) variantGroups[groupName] = [];
    variantGroups[groupName].push(v);
  });

  const selectedVariant = Object.values(selectedVariants)[0] ?? null;
  const priceModifier = selectedVariant?.priceModifier ?? selectedVariant?.price_modifier ?? 0;
  const effectivePrice = product.price + priceModifier;
  const comparePrice = product.comparePrice ?? product.compare_price;
  const discount = comparePrice ? Math.round(((comparePrice - product.price) / comparePrice) * 100) : 0;

  const inventory = product.inventory ?? 0;
  const lowStockThreshold = product.lowStockThreshold ?? product.low_stock_threshold ?? 5;
  const isOutOfStock = inventory === 0;
  const isLowStock = inventory > 0 && inventory <= lowStockThreshold;
  const ratingAvg = product.ratingAvg ?? product.rating_avg ?? 0;
  const ratingCount = product.ratingCount ?? product.rating_count ?? 0;
  const soldCount = product.soldCount ?? product.sold_count ?? 0;
  const shortDescription = product.shortDescription ?? product.short_description ?? '';
  const productId = product._id || product.id;
  const wishlisted = isWishlisted(productId);
  const categoryInfo = product.category;

  const ratingDistribution = [5,4,3,2,1].map(r => ({
    rating: r,
    count: reviews.filter((rev: any) => rev.rating === r).length,
    pct: reviews.length ? (reviews.filter((rev: any) => rev.rating === r).length / reviews.length) * 100 : 0,
  }));

  function formatPrice(p: number) {
    return '₹' + p.toLocaleString('en-IN');
  }

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button onClick={() => navigate('/')} className="hover:text-amber-600 transition-colors">Home</button>
            <span>/</span>
            <button onClick={() => navigate('/shop')} className="hover:text-amber-600 transition-colors">Shop</button>
            {categoryInfo && (
              <>
                <span>/</span>
                <button onClick={() => navigate(`/category/${categoryInfo.slug}`)} className="hover:text-amber-600 transition-colors">{categoryInfo.name}</button>
              </>
            )}
            <span>/</span>
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-gray-50 group">
              {primaryImage && (
                <img
                  src={primaryImage.url}
                  alt={primaryImage.altText || primaryImage.alt_text || product.name}
                  className="w-full h-full object-cover"
                />
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(i => (i + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              {discount > 0 && (
                <div className="absolute top-4 left-4">
                  <Badge variant="error" size="md">-{discount}% OFF</Badge>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === selectedImage ? 'border-amber-500' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <img src={img.url} alt={img.altText || img.alt_text} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              {categoryInfo && (
                <button
                  onClick={() => navigate(`/category/${categoryInfo.slug}`)}
                  className="text-amber-600 text-sm font-semibold uppercase tracking-wider hover:text-amber-700 transition-colors mb-2 block"
                >
                  {categoryInfo.name}
                </button>
              )}
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight">{product.name}</h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <StarRating rating={ratingAvg} count={ratingCount} size="md" />
              <span className="text-sm text-gray-500">{soldCount.toLocaleString()} sold</span>
            </div>

            {/* Price */}
            <div className="flex items-end gap-4">
              <span className="text-4xl font-black text-gray-900">{formatPrice(effectivePrice)}</span>
              {comparePrice && (
                <span className="text-xl text-gray-400 line-through mb-1">{formatPrice(comparePrice + priceModifier)}</span>
              )}
              {discount > 0 && (
                <span className="text-emerald-600 font-bold text-sm mb-1">Save {formatPrice(comparePrice! - product.price)}</span>
              )}
            </div>

            {/* Stock */}
            <div>
              {isOutOfStock ? (
                <Badge variant="error" size="md">Out of Stock</Badge>
              ) : isLowStock ? (
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="md">Low Stock</Badge>
                  <span className="text-sm text-amber-600 font-medium">Only {inventory} left!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-sm text-emerald-600 font-medium">In Stock</span>
                </div>
              )}
            </div>

            <p className="text-gray-600 leading-relaxed">{shortDescription}</p>

            {/* Variants */}
            {Object.entries(variantGroups).map(([groupName, groupVariants]) => (
              <div key={groupName}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-900">{groupName}:</span>
                  {selectedVariants[groupName] && (
                    <span className="text-sm text-gray-600">{selectedVariants[groupName].value}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupVariants.map((v: any) => {
                    const vid = v._id || v.id;
                    const selVid = selectedVariants[groupName]?._id || selectedVariants[groupName]?.id;
                    const isSelected = selVid === vid;
                    const mod = v.priceModifier ?? v.price_modifier ?? 0;
                    return (
                      <button
                        key={vid}
                        onClick={() => setSelectedVariants(prev => ({ ...prev, [groupName]: isSelected ? prev[groupName] : v }))}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${isSelected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}
                      >
                        {v.value}
                        {mod > 0 && ` (+${formatPrice(mod)})`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div>
              <span className="text-sm font-bold text-gray-900 mb-3 block">Quantity</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-3 hover:bg-gray-100 transition-colors text-gray-600">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-6 py-3 font-bold text-gray-900 text-lg min-w-[60px] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(inventory || 99, q + 1))} className="px-4 py-3 hover:bg-gray-100 transition-colors text-gray-600">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-500">{inventory} available</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  if (isOutOfStock) return;
                  addItem(product, selectedVariant, quantity);
                  toast(`${product.name} added to cart`, 'success');
                }}
                disabled={isOutOfStock}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-gray-900 text-white font-bold text-lg rounded-2xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                onClick={() => {
                  if (isOutOfStock) return;
                  addItem(product, selectedVariant, quantity);
                  navigate('/checkout');
                }}
                disabled={isOutOfStock}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-amber-500 text-white font-bold text-lg rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-5 h-5" />
                Buy Now
              </button>
              <button
                onClick={() => { toggle(productId); toast(wishlisted ? 'Removed from wishlist' : 'Added to wishlist', 'info'); }}
                className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${wishlisted ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'}`}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-red-500' : ''}`} />
              </button>
              <button className="w-14 h-14 flex items-center justify-center rounded-2xl border-2 border-gray-200 text-gray-500 hover:border-gray-300 transition-all">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Trust */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              {[
                { icon: Shield, text: 'Secure Payment' },
                { icon: Truck, text: 'Free Shipping ₹999+' },
                { icon: RotateCcw, text: '30-Day Returns' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                  <Icon className="w-5 h-5 text-amber-500" />
                  <span className="text-xs text-gray-500 font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {product.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-20">
          <div className="border-b border-gray-200 mb-8">
            <div className="flex gap-8">
              {(['description', 'reviews', 'shipping'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-bold capitalize transition-colors border-b-2 ${activeTab === tab ? 'text-gray-900 border-amber-500' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                >
                  {tab} {tab === 'reviews' && `(${reviews.length})`}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'description' && (
            <div className="max-w-3xl">
              <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-4xl">
              {reviews.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Summary */}
                  <div className="lg:col-span-1">
                    <div className="text-center p-6 bg-gray-50 rounded-2xl">
                      <div className="text-6xl font-black text-gray-900 mb-2">{ratingAvg.toFixed(1)}</div>
                      <StarRating rating={ratingAvg} count={ratingCount} size="md" />
                      <p className="text-sm text-gray-500 mt-2">Based on {ratingCount} reviews</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {ratingDistribution.map(({ rating, count, pct }) => (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-4">{rating}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-6">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reviews list */}
                  <div className="lg:col-span-2 space-y-6">
                    {reviews.map((rev: any, i: number) => (
                      <div key={rev._id || rev.id || i} className="border-b border-gray-100 pb-6 last:border-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-amber-600 font-bold text-sm">
                              {rev.user?.fullName?.[0] ?? rev.profiles?.full_name?.[0] ?? 'U'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-gray-900 text-sm">{rev.user?.fullName ?? rev.profiles?.full_name ?? 'Customer'}</p>
                              {(rev.isVerifiedPurchase || rev.is_verified_purchase) && <Badge variant="success" size="sm">Verified Purchase</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <StarRating rating={rev.rating} size="sm" showCount={false} />
                              <span className="text-xs text-gray-400">{new Date(rev.createdAt || rev.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        {rev.title && <p className="font-semibold text-gray-900 text-sm mb-1">{rev.title}</p>}
                        <p className="text-gray-600 text-sm leading-relaxed">{rev.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold">No reviews yet</p>
                  <p className="text-sm">Be the first to review this product</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="max-w-2xl space-y-6">
              {[
                { title: 'Standard Shipping', desc: 'Free on orders over ₹999. Otherwise ₹49. Delivered in 5-7 business days.' },
                { title: 'Express Shipping', desc: '₹149. Delivered in 2-3 business days.' },
                { title: 'Overnight Shipping', desc: '₹299. Order by 2pm for next business day delivery.' },
                { title: 'COD Available', desc: 'Cash on Delivery available across 25,000+ pin codes across India.' },
                { title: 'Returns Policy', desc: 'Free 30-day returns on all orders. Items must be in original condition with tags attached.' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-4">
                  <Truck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl font-black text-gray-900 mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((p: any) => <ProductCard key={p._id || p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
