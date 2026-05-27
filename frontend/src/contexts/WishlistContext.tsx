import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface WishlistContextValue {
  items: string[];
  toggle: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const STORAGE_KEY = 'luxe_wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const toggle = useCallback((productId: string) => {
    setItems(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  }, []);

  const isWishlisted = useCallback((productId: string) => items.includes(productId), [items]);

  return (
    <WishlistContext.Provider value={{ items, toggle, isWishlisted, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
