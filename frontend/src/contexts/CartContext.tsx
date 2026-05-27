import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
// CartContext uses 'any' for product/variant to support both MongoDB and legacy shapes

interface CartContextValue {
  items: any[];
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon: any | null;
  isOpen: boolean;
  addItem: (product: any, variant?: any | null, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null | undefined, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (coupon: any) => void;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'luxe_cart';

function loadCart(): CartItemLocal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItemLocal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemLocal[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);
  const [coupon, setCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((product: any, variant: any | null = null, quantity = 1) => {
    const productId = product._id || product.id;
    const variantId = variant?._id || variant?.id;
    setItems(prev => {
      const key = variantId ? `${productId}-${variantId}` : productId;
      const existing = prev.find(i => {
        const pid = i.product._id || i.product.id;
        const vid = i.variant?._id || i.variant?.id;
        return (vid ? `${pid}-${vid}` : pid) === key;
      });
      if (existing) {
        return prev.map(i => {
          const pid = i.product._id || i.product.id;
          const vid = i.variant?._id || i.variant?.id;
          return (vid ? `${pid}-${vid}` : pid) === key
            ? { ...i, quantity: i.quantity + quantity }
            : i;
        });
      }
      return [...prev, { id: key, product, variant, quantity }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string | null) => {
    setItems(prev => prev.filter(i => {
      const pid = i.product._id || i.product.id;
      const vid = i.variant?._id || i.variant?.id;
      const key = vid ? `${pid}-${vid}` : pid;
      const targetKey = variantId ? `${productId}-${variantId}` : productId;
      return key !== targetKey;
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, variantId: string | null | undefined, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems(prev => prev.map(i => {
      const pid = i.product._id || i.product.id;
      const vid = i.variant?._id || i.variant?.id;
      const key = vid ? `${pid}-${vid}` : pid;
      const targetKey = variantId ? `${productId}-${variantId}` : productId;
      return key === targetKey ? { ...i, quantity } : i;
    }));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, []);

  const applyCoupon = useCallback((c: Coupon) => setCoupon(c), []);
  const removeCoupon = useCallback(() => setCoupon(null), []);

  const subtotal = items.reduce((sum, i) => {
    const priceModifier = i.variant?.priceModifier ?? i.variant?.price_modifier ?? 0;
    const base = i.product.price + priceModifier;
    return sum + base * i.quantity;
  }, 0);

  const discount = coupon
    ? (coupon.discountType || coupon.discount_type) === 'percentage'
      ? Math.min(subtotal * ((coupon.discountValue ?? coupon.discount_value) / 100), coupon.maximumDiscountAmount ?? coupon.maximum_discount_amount ?? Infinity)
      : (coupon.discountValue ?? coupon.discount_value ?? 0)
    : 0;

  const total = Math.max(0, subtotal - discount);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, itemCount, subtotal, discount, total, coupon, isOpen,
      addItem, removeItem, updateQuantity, clearCart,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      applyCoupon, removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
