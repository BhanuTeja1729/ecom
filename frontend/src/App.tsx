import { RouterProvider, useRouter } from './lib/router';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { LocationProvider } from './contexts/LocationContext';
import { ToastProvider } from './contexts/ToastContext';
import { Header } from './components/layout/Header';
import { CartDrawer } from './components/layout/CartDrawer';
import { useAuth } from './contexts/AuthContext';
import { useEffect, lazy, Suspense } from 'react';

// Lazy load page components
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Shop = lazy(() => import('./pages/Shop').then(m => ({ default: m.Shop })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const CheckoutVerify = lazy(() => import('./pages/CheckoutVerify').then(m => ({ default: m.CheckoutVerify })));
const Auth = lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const OrderTracking = lazy(() => import('./pages/OrderTracking').then(m => ({ default: m.OrderTracking })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const FAQ = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQ })));
const Legal = lazy(() => import('./pages/Legal').then(m => ({ default: m.Legal })));
const DeliveryDashboard = lazy(() => import('./pages/DeliveryDashboard').then(m => ({ default: m.DeliveryDashboard })));

// Loading skeleton fallback for Suspense page loading
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}

// Routes that skip the shared Header/Footer (have their own layout)
const NO_LAYOUT_PATHS = ['/auth', '/reset-password', '/landing'];


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <>{children}</> : null;
}

// Customer-only route guard: delivery partners get redirected to /delivery
function CustomerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user?.role === 'delivery_partner') {
      navigate('/delivery');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role === 'delivery_partner') return null;
  return <>{children}</>;
}

function AppRouter() {
  const { path, params, navigate } = useRouter();

  const showLayout = !NO_LAYOUT_PATHS.includes(path) && !path.startsWith('/auth') && !path.startsWith('/reset-password') && !path.startsWith('/landing');

  function renderPage() {
    // Public routes
    if (path === '/landing') return <Landing />;
    if (path === '/auth') return <Auth />;
    if (path === '/reset-password') return <ResetPassword />;
    if (path === '/contact') return <Contact />;
    if (path === '/about') return <About />;
    if (path === '/faq') return <FAQ />;
    if (path === '/privacy') return <Legal page="privacy" />;
    if (path === '/terms') return <Legal page="terms" />;
    if (path === '/admin') return <Admin />;
    if (path === '/delivery') return <ProtectedRoute><DeliveryDashboard /></ProtectedRoute>;

    // Root and /shop are publicly browsable (add-to-cart handles auth check inside)
    if (path === '/' || path === '/shop') return <Shop />;
    if (path.startsWith('/category/') && params.slug) return <Shop categorySlug={params.slug} />;
    if (path.startsWith('/product/') && params.slug) return <ProductDetail slug={params.slug} />;
    if (path === '/cart') return <CustomerRoute><Cart /></CustomerRoute>;
    if (path === '/checkout') return <CustomerRoute><Checkout /></CustomerRoute>;
    if (path === '/checkout-verify') return <CustomerRoute><CheckoutVerify /></CustomerRoute>;
    if (path === '/dashboard') return <CustomerRoute><Dashboard /></CustomerRoute>;
    if (path === '/order-tracking') return <CustomerRoute><OrderTracking /></CustomerRoute>;

    return <NotFound />;
  }

  return (
    <>
      {showLayout && <Header />}
      <CartDrawer />
      <Suspense fallback={<PageLoader />}>
        {renderPage()}
      </Suspense>
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
        <LocationProvider>
          <WishlistProvider>
            <CartProvider>
              <ToastProvider>
                <AppRouter />
              </ToastProvider>
            </CartProvider>
          </WishlistProvider>
        </LocationProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
