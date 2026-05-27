import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useRouter } from '../../lib/router';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal, total, discount, coupon, itemCount } = useCart();
  const { navigate } = useRouter();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]" onClick={closeCart} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[91] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-gray-900" />
            <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
            {itemCount > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Your cart is empty</p>
                <p className="text-sm text-gray-500">Add some products to get started</p>
              </div>
              <button
                onClick={() => { closeCart(); navigate('/shop'); }}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors"
              >
                Shop Now
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {items.map((item) => {
                // Support both MongoDB (images[]) and legacy (product_images[]) shapes
                const imgUrl =
                  item.product.images?.find((i: any) => i.isPrimary || i.is_primary)?.url ??
                  item.product.images?.[0]?.url ??
                  item.product.product_images?.find((i: any) => i.is_primary)?.url ??
                  item.product.product_images?.[0]?.url ??
                  '';

                // Support both _id (MongoDB) and id (legacy)
                const productId = item.product._id ?? item.product.id;
                const variantId = item.variant?._id ?? item.variant?.id ?? null;

                const priceModifier = item.variant?.priceModifier ?? item.variant?.price_modifier ?? 0;
                const price = item.product.price + priceModifier;

                return (
                  <div key={item.id} className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                      {imgUrl
                        ? <img src={imgUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        : <ShoppingCart className="w-6 h-6 text-gray-300" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.variant.name}: {item.variant.value}</p>
                      )}
                      <p className="text-sm font-bold text-gray-900 mt-1">{fmt(price)}</p>

                      {/* Qty controls + delete */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(productId, variantId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(productId, variantId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(productId, variantId)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {coupon && discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount ({coupon.code})</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { closeCart(); navigate('/checkout'); }}
                className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors"
              >
                Checkout
              </button>
              <button
                onClick={() => { closeCart(); navigate('/cart'); }}
                className="w-full py-3 text-gray-700 font-semibold text-sm hover:text-gray-900 transition-colors"
              >
                View Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
