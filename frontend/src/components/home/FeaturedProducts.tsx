import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from '../../lib/router';
import { productApi } from '../../lib/api';
import { ProductCard } from '../ui/ProductCard';

export function FeaturedProducts() {
  const { navigate } = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi.featured()
      .then((res) => setProducts(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-2">Handpicked</p>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Featured Products</h2>
          </div>
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-2 text-gray-600 hover:text-amber-600 font-semibold text-sm transition-colors group"
          >
            View All Products
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No featured products yet</p>
            <p className="text-sm mt-1">Check back soon for our latest picks</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
