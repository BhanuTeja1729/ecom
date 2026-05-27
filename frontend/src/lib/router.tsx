import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface RouterContextValue {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

const ROUTES = [
  '/admin',
  '/dashboard',
  '/checkout',
  '/cart',
  '/auth',
  '/order-tracking',
  '/about',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
  '/shop',
  '/category/:slug',
  '/product/:slug',
  '/',
];

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(() => window.location.pathname || '/');
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search));

  useEffect(() => {
    const handlePop = () => {
      setLocation(window.location.pathname || '/');
      setQuery(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = useCallback((to: string) => {
    const [path, search] = to.split('?');
    window.history.pushState({}, '', to);
    setLocation(path);
    setQuery(new URLSearchParams(search || ''));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  let matchedParams: Record<string, string> = {};
  for (const route of ROUTES) {
    const params = matchRoute(route, location);
    if (params !== null) {
      matchedParams = params;
      break;
    }
  }

  return (
    <RouterContext.Provider value={{ path: location, params: matchedParams, query, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}

export function Link({ to, children, className, onClick }: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
