import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown, Zap } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, Link } from '../../lib/router';
import { categoryApi, productApi } from '../../lib/api';

const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function Header() {
  const { itemCount, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, signOut, isAdmin } = useAuth();
  const { navigate, path } = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const isHome = path === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    categoryApi.list().then(res => setCategories(res.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await productApi.list({ search: searchQuery, limit: '5' });
        setSearchResults(res.data ?? []);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const headerBg = scrolled || !isHome
    ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm'
    : 'bg-transparent';

  const textColor = scrolled || !isHome ? 'text-gray-900' : 'text-white';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className={`text-xl font-black tracking-tight ${textColor}`}>LUXE</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {/* Shop with dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setShopMenuOpen(true)}
              onMouseLeave={() => setShopMenuOpen(false)}
            >
              <button className={`flex items-center gap-1 text-sm font-semibold ${textColor} hover:text-amber-500 transition-colors`}>
                Shop <ChevronDown className={`w-3.5 h-3.5 transition-transform ${shopMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {shopMenuOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64">
                  <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 p-3 grid grid-cols-1 gap-1">
                    <button
                      onClick={() => { navigate('/shop'); setShopMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left group"
                    >
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">All Products</span>
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { navigate(`/category/${cat.slug}`); setShopMenuOpen(false); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left group"
                      >
                        <img src={cat.imageUrl || cat.image_url} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600 transition-colors">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {NAV_LINKS.slice(1).map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-semibold ${textColor} hover:text-amber-500 transition-colors`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 lg:gap-2">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl ${textColor} hover:bg-white/10 hover:text-amber-500 transition-all`}
              >
                <Search className="w-5 h-5" />
              </button>
              {searchOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50">
                    <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="max-h-80 overflow-y-auto p-2">
                        {searchResults.map((p: any) => {
                          const images = p.images || p.product_images || [];
                          const img = images.find((i: any) => i.isPrimary || i.is_primary) ?? images[0];
                          const price = p.price ?? 0;
                          return (
                            <button
                              key={p._id || p.id}
                              onClick={() => { navigate(`/product/${p.slug}`); setSearchOpen(false); setSearchQuery(''); }}
                              className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left"
                            >
                              {img && <img src={img.url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />}
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                                <p className="text-xs text-amber-600">{'₹' + price.toLocaleString('en-IN')}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {searchQuery && searchResults.length === 0 && (
                      <p className="p-4 text-sm text-gray-500 text-center">No products found</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Wishlist */}
            <button
              onClick={() => navigate('/dashboard')}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl ${textColor} hover:bg-white/10 hover:text-amber-500 transition-all hidden sm:flex`}
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              onClick={openCart}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl ${textColor} hover:bg-white/10 hover:text-amber-500 transition-all`}
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>

            {/* User */}
            {user ? (
              <div className="relative group hidden lg:block">
                <button className={`w-9 h-9 flex items-center justify-center rounded-xl ${textColor} hover:bg-white/10 transition-all`}>
                  <User className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full pt-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
                  <div className="w-48 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 p-2">
                    {isAdmin && (
                      <button onClick={() => navigate('/admin')} className="w-full text-left px-3 py-2 text-sm text-amber-600 font-semibold hover:bg-amber-50 rounded-xl transition-colors">
                        Admin Panel
                      </button>
                    )}
                    <button onClick={() => navigate('/dashboard')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                      Dashboard
                    </button>
                    <button onClick={() => navigate('/order-tracking')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                      Order Tracking
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={signOut} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors"
              >
                Sign In
              </button>
            )}

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`lg:hidden w-9 h-9 flex items-center justify-center rounded-xl ${textColor} hover:bg-white/10 transition-all`}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            <button onClick={() => { navigate('/shop'); setMobileOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-xl">All Products</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => { navigate(`/category/${cat.slug}`); setMobileOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl">
                {cat.name}
              </button>
            ))}
            <hr className="border-gray-100" />
            {NAV_LINKS.slice(1).map(link => (
              <button key={link.href} onClick={() => { navigate(link.href); setMobileOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-xl">
                {link.label}
              </button>
            ))}
            {user ? (
              <>
                <button onClick={() => { navigate('/dashboard'); setMobileOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-xl">Dashboard</button>
                {isAdmin && <button onClick={() => { navigate('/admin'); setMobileOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-50 rounded-xl">Admin Panel</button>}
                <button onClick={signOut} className="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl">Sign Out</button>
              </>
            ) : (
              <button onClick={() => { navigate('/auth'); setMobileOpen(false); }} className="w-full px-4 py-3 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors">
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
