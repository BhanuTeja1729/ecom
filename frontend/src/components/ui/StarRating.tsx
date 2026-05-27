import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function StarRating({ rating, count, size = 'md', showCount = true }: StarRatingProps) {
  const sizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, rating - star + 1));
          return (
            <span key={star} className="relative inline-block">
              <Star className={`${sizes[size]} text-gray-200 fill-gray-200`} />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className={`${sizes[size]} text-amber-400 fill-amber-400`} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showCount && count !== undefined && (
        <span className={`${textSizes[size]} text-gray-500`}>({count.toLocaleString()})</span>
      )}
    </div>
  );
}
