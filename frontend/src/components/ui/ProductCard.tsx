import { useState } from 'react';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useToast } from '../../contexts/ToastContext';
import { useRouter } from '../../lib/router';
import { StarRating } from './StarRating';
import { Badge } from './Badge';

interface ProductCardProps {
  product: any; // supports both MongoDB (camelCase) and legacy shapes
  view?: 'grid' | 'list';
}

// Normalize MongoDB / Supabase product shapes
function normalizeProduct(p: any) {
  const images = p.images || p.product_images || [];
  const primaryImage = images.find((i: any) => i.isPrimary || i.is_primary) ?? images[0];
  const secondaryImage = images[1];
  const price = p.price ?? 0;
  const comparePrice = p.comparePrice ?? p.compare_price;
  const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
  const inventory = p.inventory ?? 0;
  const lowStockThreshold = p.lowStockThreshold ?? p.low_stock_threshold ?? 5;
  const isFeatured = p.isFeatured ?? p.is_featured ?? false;
  const ratingAvg = p.ratingAvg ?? p.rating_avg ?? 0;
  const ratingCount = p.ratingCount ?? p.rating_count ?? 0;
  const categoryName = p.category?.name ?? p.categories?.name;
  const id = p._id ?? p.id ?? '';
  const shortDescription = p.shortDescription ?? p.short_description ?? '';
  return { id, images, primaryImage, secondaryImage, price, comparePrice, discount, inventory, lowStockThreshold, isFeatured, ratingAvg, ratingCount, categoryName, shortDescription };
}

function formatPrice(price: number) {
  return '₹' + price.toLocaleString('en-IN');
}

export function ProductCard({ product, view = 'grid' }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { toast } = useToast();
  const { navigate } = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const norm = normalizeProduct(product);
  const { primaryImage, secondaryImage, price, comparePrice, discount, inventory, lowStockThreshold, isFeatured, ratingAvg, ratingCount, categoryName, id, shortDescription } = norm;

  const isLowStock = inventory > 0 && inventory <= lowStockThreshold;
  const isOutOfStock = inventory === 0;
  const wishlisted = isWishlisted(id);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem(product);
    toast(`${product.name} added to cart`, 'success');
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(id);
    toast(wishlisted ? 'Removed from wishlist' : 'Added to wishlist', 'info');
  }

  if (view === 'list') {
    return (
      <div
        className="flex gap-6 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
        onClick={() => navigate(`/product/${product.slug}`)}
      >
        <div className="relative w-48 shrink-0 overflow-hidden bg-gray-50">
          {primaryImage && (
            <img
              src={primaryImage.url}
              alt={primaryImage.altText || primaryImage.alt_text || product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          {discount > 0 && (
            <div className="absolute top-3 left-3">
              <Badge variant="error">-{discount}%</Badge>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center py-6 pr-6 flex-1 gap-2">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">{categoryName}</p>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors">{product.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-2">{shortDescription}</p>
          <StarRating rating={ratingAvg} count={ratingCount} />
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl font-bold text-gray-900">{formatPrice(price)}</span>
            {comparePrice && <span className="text-lg text-gray-400 line-through">{formatPrice(comparePrice)}</span>}
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button onClick={handleWishlist} className={`p-2.5 rounded-xl border ${wishlisted ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'} transition-all`}>
              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-black/8 transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/product/${product.slug}`)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {!imageLoaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}
        {primaryImage && (
          <img
            src={isHovered && secondaryImage ? secondaryImage.url : primaryImage.url}
            alt={primaryImage.altText || primaryImage.alt_text || product.name}
            className={`w-full h-full object-cover transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isHovered ? 'scale-105' : 'scale-100'}`}
            onLoad={() => setImageLoaded(true)}
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount > 0 && <Badge variant="error">-{discount}%</Badge>}
          {isFeatured && <Badge variant="dark">Featured</Badge>}
          {isLowStock && <Badge variant="warning">Low Stock</Badge>}
          {isOutOfStock && <Badge variant="default">Out of Stock</Badge>}
        </div>

        {/* Quick actions */}
        <div className={`absolute right-3 top-3 flex flex-col gap-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <button
            onClick={handleWishlist}
            className={`w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md ${wishlisted ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} transition-colors`}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-500' : ''}`} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/product/${product.slug}`); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Add to cart overlay */}
        <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full py-3 bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">{categoryName}</p>
        <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors line-clamp-1">{product.name}</h3>
        <StarRating rating={ratingAvg} count={ratingCount} size="sm" />
        <div className="flex items-center gap-2 mt-3">
          <span className="text-lg font-bold text-gray-900">{formatPrice(price)}</span>
          {comparePrice && <span className="text-sm text-gray-400 line-through">{formatPrice(comparePrice)}</span>}
        </div>
      </div>
    </div>
  );
}
