import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, X, Zap, User, Menu, ChevronDown } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../lib/router';
import { productApi } from '../../lib/api';

export function Header() {
  const { itemCount, openCart } = useCart();
  const { user, signOut, isAdmin } = useAuth();
  const { navigate } = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Live product search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await productApi.list({ search: searchQuery, limit: '6' });
        setSearchResults(res.data ?? []);
      } catch { setSearchResults([]); }
    }, 280);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Close search dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const showDropdown = searchFocused && searchQuery.trim().length > 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 h-16">

          {/* ── Logo ── */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight hidden sm:inline">
              BLIPZO
            </span>
          </button>

          {/* ── Inline Search Bar ── */}
          <div ref={searchWrapRef} className="relative flex-1 min-w-0 max-w-xl">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-100 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 border border-transparent focus-within:border-amber-400 focus-within:bg-white transition-all w-full min-w-0">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder='Search "headphones", "jacket"…'
                className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400 min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50">
                {searchResults.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto p-2">
                    {searchResults.map((p: any) => {
                      const images = p.images || p.product_images || [];
                      const img = images.find((i: any) => i.isPrimary || i.is_primary) ?? images[0];
                      const price = p.price ?? 0;
                      return (
                        <button
                          key={p._id || p.id}
                          onClick={() => {
                            navigate(`/product/${p.slug}`);
                            setSearchQuery('');
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left"
                        >
                          {img && <img src={img.url} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                          <div>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                            <p className="text-xs text-amber-600 font-bold mt-0.5">₹{price.toLocaleString('en-IN')}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="p-4 text-sm text-gray-500 text-center">No products found for "{searchQuery}"</p>
                )}
              </div>
            )}
          </div>

          {/* ── Right actions — pushed to far right corner ── */}
          <div className="flex items-center gap-2 ml-auto shrink-0">

            {/* Cart — always visible for non-delivery users */}
            {user?.role !== 'delivery_partner' && (
              <button
                onClick={openCart}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 hover:text-amber-600 transition-all"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>
            )}


          {/* Account / Login actions */}
          {user ? (
            // Logged In State
            <>
              {/* Desktop Account Dropdown */}
              <div className="hidden lg:block relative group">
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 rounded-xl transition-all select-none">
                  <User className="w-4 h-4" />
                  Account
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 group-hover:rotate-180 transition-transform duration-200" />
                </button>

                {/* Dropdown panel */}
                <div className="absolute right-0 top-full pt-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto z-50">
                  <div className="w-56 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden">
                    {/* My Account header */}
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">My Account</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                    </div>

                    <div className="p-2">
                      {isAdmin && (
                        <button onClick={() => navigate('/admin')} className="w-full text-left px-3 py-2.5 text-sm text-amber-600 font-semibold hover:bg-amber-50 rounded-xl transition-colors">
                          Admin Panel
                        </button>
                      )}
                      {user.role === 'delivery_partner' ? (
                        <button onClick={() => navigate('/delivery')} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                          Delivery Portal
                        </button>
                      ) : (
                        <>
                          <button onClick={() => navigate('/dashboard')} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                            My Orders
                          </button>
                          <button onClick={() => navigate('/dashboard')} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                            Dashboard
                          </button>
                          <button onClick={() => navigate('/order-tracking')} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                            Order Tracking
                          </button>
                        </>
                      )}
                      <hr className="border-gray-100 my-1" />
                      <button onClick={() => signOut()} className="w-full text-left px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        Log Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile/Tablet Hamburger Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(v => !v)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 hover:text-amber-600 transition-all"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            // Logged Out State
            <>
              {/* Desktop Login Button */}
              <button
                onClick={() => navigate('/auth')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 rounded-xl transition-all select-none"
              >
                Login
              </button>

              {/* Mobile/Tablet User Icon Button (Login shortcut) */}
              <button
                onClick={() => navigate('/auth')}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 hover:text-amber-600 transition-all"
                aria-label="Login"
              >
                <User className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {user ? (
              <>
                <p className="px-4 py-2 text-xs text-gray-400 font-semibold truncate">{user.email}</p>
                {user.role === 'delivery_partner' ? (
                  <button onClick={() => { navigate('/delivery'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-50 rounded-xl">
                    Delivery Portal
                  </button>
                ) : (
                  <>
                    <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-xl">
                      Dashboard
                    </button>
                    <button onClick={() => { navigate('/order-tracking'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-xl">
                      Order Tracking
                    </button>
                  </>
                )}
                {isAdmin && (
                  <button onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-50 rounded-xl">
                    Admin Panel
                  </button>
                )}
                <hr className="border-gray-100" />
                <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl">
                  Sign Out
                </button>
              </>
            ) : (
              <button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="w-full px-4 py-3 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors text-center">
                Login / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
