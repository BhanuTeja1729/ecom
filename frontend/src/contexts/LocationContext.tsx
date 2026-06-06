import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ── Inventory / warehouse coordinates (configurable via env) ───────────────
const INVENTORY_LAT = parseFloat(import.meta.env.VITE_INVENTORY_LAT || '13.0654465');
const INVENTORY_LNG = parseFloat(import.meta.env.VITE_INVENTORY_LNG || '77.5915385');
const DELIVERY_RADIUS_KM = parseFloat(import.meta.env.VITE_DELIVERY_RADIUS_KM || '12');

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

export interface LocationCoords {
  lat: number;
  lng: number;
}

interface LocationContextValue {
  /** User's browser geolocation */
  userCoords: LocationCoords | null;
  locationStatus: LocationStatus;
  /** Distance from user's browser location to inventory (km) */
  distanceFromInventory: number | null;
  /** Whether the user's current browser location is within delivery radius */
  isDeliveryAvailable: boolean | null;
  /** Re-request browser location */
  requestLocation: () => void;
  /** Check if any arbitrary lat/lng is within delivery radius */
  checkDeliveryDistance: (lat: number, lng: number) => number;
  /** Geocode an address string → coords, then return distance in km */
  geocodeAndCheckDistance: (address: string) => Promise<{ coords: LocationCoords | null; distance: number | null; available: boolean | null }>;
  /** Inventory coords for reference */
  inventoryCoords: LocationCoords;
  deliveryRadiusKm: number;
}

const LocationContext = createContext<LocationContextValue | null>(null);

// ── Haversine formula ─────────────────────────────────────────────────────
function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userCoords, setUserCoords] = useState<LocationCoords | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');

  // Request browser geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('denied');
        } else {
          setLocationStatus('unavailable');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Auto-request when user logs in
  useEffect(() => {
    if (user && user.role !== 'delivery_partner' && locationStatus === 'idle') {
      requestLocation();
    }
  }, [user, locationStatus, requestLocation]);

  const distanceFromInventory =
    userCoords !== null
      ? Math.round(haversineDistanceKm(userCoords.lat, userCoords.lng, INVENTORY_LAT, INVENTORY_LNG) * 10) / 10
      : null;

  const isDeliveryAvailable =
    distanceFromInventory !== null ? distanceFromInventory <= DELIVERY_RADIUS_KM : null;

  function checkDeliveryDistance(lat: number, lng: number): number {
    return Math.round(haversineDistanceKm(lat, lng, INVENTORY_LAT, INVENTORY_LNG) * 10) / 10;
  }

  async function geocodeAndCheckDistance(address: string) {
    // Helper to call Nominatim with a given query string
    async function nominatimQuery(q: string): Promise<{ lat: number; lng: number } | null> {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
      } catch {
        return null;
      }
    }

    // Helper to call Nominatim with structured parameters (more reliable for Indian addresses)
    async function nominatimStructured(params: Record<string, string>): Promise<{ lat: number; lng: number } | null> {
      try {
        const qs = Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join('&');
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&${qs}&limit=1&countrycodes=in&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
      } catch {
        return null;
      }
    }

    try {
      // Parse address parts from the address string.
      // Checkout builds: "[doorNo, ] address, city, state, zip, country"
      // Counting from the right: country=[−1], zip=[−2], state=[−3], city=[−4]
      const parts = address.split(',').map(p => p.trim());
      const city  = parts.length >= 4 ? parts[parts.length - 4].trim() : '';
      const state = parts.length >= 3 ? parts[parts.length - 3].replace(/\s*-\s*\d+/, '').trim() : '';
      // 6-digit Indian PIN code — most specific and reliable anchor
      const postalMatch = address.match(/\b\d{6}\b/);
      const postalCode = postalMatch ? postalMatch[0] : '';
      const country = 'India';

      // Strategy 1: Full address free-text query (limit to India)
      let coords = await nominatimQuery(address);

      // Strategy 2: Structured query with postalcode + city + state (most reliable for India)
      if (!coords && postalCode && city) {
        coords = await nominatimStructured({
          postalcode: postalCode,
          city,
          state,
          country,
        });
      }

      // Strategy 3: postalcode + country only (PIN code is highly specific in India)
      if (!coords && postalCode) {
        coords = await nominatimStructured({
          postalcode: postalCode,
          country,
        });
      }

      // Strategy 4: city + state + country (broad fallback)
      if (!coords && city && state) {
        coords = await nominatimStructured({
          city,
          state,
          country,
        });
      }

      if (coords) {
        const dist = checkDeliveryDistance(coords.lat, coords.lng);
        return { coords, distance: dist, available: dist <= DELIVERY_RADIUS_KM };
      }
      return { coords: null, distance: null, available: null };
    } catch {
      return { coords: null, distance: null, available: null };
    }
  }

  return (
    <LocationContext.Provider
      value={{
        userCoords,
        locationStatus,
        distanceFromInventory,
        isDeliveryAvailable,
        requestLocation,
        checkDeliveryDistance,
        geocodeAndCheckDistance,
        inventoryCoords: { lat: INVENTORY_LAT, lng: INVENTORY_LNG },
        deliveryRadiusKm: DELIVERY_RADIUS_KM,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used inside LocationProvider');
  return ctx;
}
