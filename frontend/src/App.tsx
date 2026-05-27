import { RouterProvider, useRouter } from './lib/router';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { ToastProvider } from './contexts/ToastContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/layout/CartDrawer';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { OrderTracking } from './pages/OrderTracking';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { FAQ } from './pages/FAQ';
import { Legal } from './pages/Legal';

function AppRouter() {
  const { path, params } = useRouter();

  const noLayoutPaths = ['/auth'];
  const showLayout = !noLayoutPaths.includes(path);

  function renderPage() {
    if (path === '/') return <Home />;
    if (path === '/shop') return <Shop />;
    if (path.startsWith('/category/') && params.slug) return <Shop categorySlug={params.slug} />;
    if (path.startsWith('/product/') && params.slug) return <ProductDetail slug={params.slug} />;
    if (path === '/cart') return <Cart />;
    if (path === '/checkout') return <Checkout />;
    if (path === '/auth') return <Auth />;
    if (path === '/dashboard') return <Dashboard />;
    if (path === '/order-tracking') return <OrderTracking />;
    if (path === '/admin') return <Admin />;
    if (path === '/about') return <About />;
    if (path === '/contact') return <Contact />;
    if (path === '/faq') return <FAQ />;
    if (path === '/privacy') return <Legal page="privacy" />;
    if (path === '/terms') return <Legal page="terms" />;
    return <NotFound />;
  }

  return (
    <>
      {showLayout && <Header />}
      <CartDrawer />
      {renderPage()}
      {showLayout && <Footer />}
    </>
  );
}

function NotFound() {
  const { navigate } = useRouter();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
      <div className="text-center px-4">
        <p className="text-8xl font-black text-gray-200 mb-4">404</p>
        <h1 className="text-2xl font-black text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors">
            Go Home
          </button>
          <button onClick={() => navigate('/shop')} className="px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-colors">
            Browse Shop
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <ToastProvider>
              <AppRouter />
            </ToastProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
