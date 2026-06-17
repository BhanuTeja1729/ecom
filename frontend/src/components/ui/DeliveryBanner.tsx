import { MapPin, AlertTriangle, CheckCircle2, Navigation } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';

interface DeliveryBannerProps {
  /** Compact mode for embedding inside cards/sections */
  compact?: boolean;
  /** Override distance/available for shipping-address-based check */
  overrideDistance?: number | null;
  overrideAvailable?: boolean | null;
  /** Show a "checking..." state */
  checking?: boolean;
}

export function TrendingMarquee({ compact }: { compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${compact ? 'py-2' : 'py-3'} bg-white border border-gray-200 text-gray-700 rounded-2xl shadow-sm flex items-center h-11`}>
      <style>{`
        @keyframes ticker {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .ticker-wrap {
          display: flex;
          width: 100%;
          overflow: hidden;
        }
        .ticker-move {
          display: inline-block;
          white-space: nowrap;
          padding-left: 100%;
          animation: ticker 25s linear infinite;
        }
        .ticker-item {
          display: inline-block;
          font-size: 0.875rem;
          font-weight: 800;
          letter-spacing: 0.025em;
        }
      `}</style>
      
      <div className="ticker-wrap">
        <div className="ticker-move">
          <span className="ticker-item text-gray-700">⚡ Notice: Delivery services are currently available exclusively within Zirakpur, Punjab</span>
        </div>
      </div>
    </div>
  );
}

export function DeliveryBanner({ compact, overrideDistance, overrideAvailable, checking }: DeliveryBannerProps) {
  const { locationStatus, distanceFromInventory, isDeliveryAvailable, requestLocation, deliveryRadiusKm } = useLocation();
  const { user } = useAuth();

  // If the user is not logged in, do not render location detection banner
  if (!user) return null;

  // Use overrides if provided (e.g., from shipping address geocode)
  const distance = overrideDistance !== undefined ? overrideDistance : distanceFromInventory;
  const available = overrideAvailable !== undefined ? overrideAvailable : isDeliveryAvailable;

  if (checking) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'p-3' : 'px-4 py-3'} bg-gray-50 border border-gray-200 rounded-xl`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin shrink-0" />
        <span className="text-sm text-gray-500 font-medium">Checking delivery availability…</span>
      </div>
    );
  }

  // Location not yet determined
  if (locationStatus === 'idle' || locationStatus === 'loading') {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'p-3' : 'px-4 py-3'} bg-gray-50 border border-gray-200 rounded-xl`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin shrink-0" />
        <span className="text-sm text-gray-500 font-medium">Detecting your location…</span>
      </div>
    );
  }

  // Location denied or unavailable
  if ((locationStatus === 'denied' || locationStatus === 'unavailable') && available === null) {
    return (
      <div className={`flex items-center justify-between gap-3 ${compact ? 'p-3' : 'px-4 py-3'} bg-gray-50 border border-gray-200 rounded-xl`}>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-500 font-medium">Enable location to check delivery availability</span>
        </div>
        <button
          onClick={requestLocation}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
        >
          <Navigation className="w-3 h-3" /> Enable
        </button>
      </div>
    );
  }

  // Delivery available
  if (available === true) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'p-3' : 'px-4 py-3'} bg-emerald-50 border border-emerald-200 rounded-xl`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-semibold text-emerald-800">
            Delivery available to your location. And available only in Zirakpur, Punjab.
          </span>
        </div>
      </div>
    );
  }

  // Delivery NOT available
  if (available === false) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'p-3' : 'px-4 py-3'} bg-red-50 border border-red-200 rounded-xl`}>
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-semibold text-red-800">
            Delivery not available to this area
          </span>
          {distance !== null && (
            <span className="text-xs text-red-600 ml-1.5">
              ({distance} km away — max {deliveryRadiusKm} km)
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}
