import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from '../../lib/router';
import { categoryApi } from '../../lib/api';

export function Categories() {
  const { navigate } = useRouter();
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    categoryApi.list().then((res) => setCategories(res.data ?? [])).catch(() => {});
  }, []);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-2">Collections</p>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Shop by Category</h2>
          </div>
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-2 text-gray-600 hover:text-amber-600 font-semibold text-sm transition-colors group"
          >
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, idx) => (
            <button
              key={cat._id || cat.id}
              onClick={() => navigate(`/category/${cat.slug}`)}
              className={`group relative overflow-hidden rounded-2xl aspect-square cursor-pointer ${idx === 0 ? 'col-span-2 md:col-span-2 lg:col-span-2 row-span-1' : ''}`}
            >
              <img
                src={cat.imageUrl || cat.image_url || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400'}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-start justify-end p-4">
                <h3 className="text-white font-bold text-sm sm:text-base">{cat.name}</h3>
                <div className="flex items-center gap-1 text-amber-400 text-xs font-medium mt-1 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  Shop now <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
