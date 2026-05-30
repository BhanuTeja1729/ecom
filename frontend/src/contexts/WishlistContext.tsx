import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { userApi } from '../lib/api';

interface WishlistContextValue {
  items: string[];
  toggle: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const STORAGE_KEY = 'luxe_wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [items, setItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Sync wishlist from backend when user logs in
  useEffect(() => {
    if (!user) return;

    userApi.getWishlist()
      .then(res => {
        const serverIds = (res.data ?? []).map((p: any) => p._id || p.id || p).filter(Boolean);
        if (serverIds.length > 0 || items.length > 0) {
          setItems(serverIds);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverIds));
        }
      })
      .catch(() => {
        // If the backend call fails, keep using localStorage data
      });
  }, [user?.id]);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const toggle = useCallback((productId: string) => {
    // Optimistic update
    setItems(prev => {
      const exists = prev.includes(productId);
      return exists ? prev.filter(id => id !== productId) : [...prev, productId];
    });

    // If logged in, sync with backend
    if (user) {
      userApi.toggleWishlist(productId).catch(() => {
        // Revert on failure
        setItems(prev => {
          const exists = prev.includes(productId);
          return exists ? prev.filter(id => id !== productId) : [...prev, productId];
        });
      });
    }
  }, [user]);

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
