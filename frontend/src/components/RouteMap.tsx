import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';

// Custom icons
const goldIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3198/3198336.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
  shadowSize: [36, 36],
});

interface RouteMapProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startName?: string;
  endName?: string;
  onDistanceCalculated?: (distanceKm: number, durationMin: number) => void;
  maxDistanceKm?: number;
}

// Helper component to auto-recenter and fit bounds
function FitBounds({ start, end, route }: { start: [number, number]; end: [number, number]; route: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [start, end, ...route];
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [start, end, route, map]);

  return null;
}

export function RouteMap({
  startLat,
  startLng,
  endLat,
  endLng,
  startName = 'Warehouse',
  endName = 'Delivery Address',
  onDistanceCalculated,
  maxDistanceKm = 25,
}: RouteMapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPoint: [number, number] = [startLat, startLng];
  const endPoint: [number, number] = [endLat, endLng];

  useEffect(() => {
    async function fetchRoute() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          startLat: String(startLat),
          startLng: String(startLng),
          endLat: String(endLat),
          endLng: String(endLng),
        });
        
        const API_URL = (import.meta.env.VITE_API_URL || '/api/v1') + `/routes/directions?${query.toString()}`;
        const response = await fetch(API_URL);
        
        if (!response.ok) {
          throw new Error('Failed to resolve route geometry.');
        }

        const resData = await response.json();
        if (resData.success && resData.data) {
          const { distanceKm, durationMin, coordinates } = resData.data;
          const routeDist = parseFloat(distanceKm);
          setDistance(routeDist);
          setDuration(durationMin);
          setRouteCoords(coordinates);

          if (onDistanceCalculated) {
            onDistanceCalculated(routeDist, durationMin);
          }
        } else {
          throw new Error(resData.message || 'Failed to draw route path.');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Could not fetch driving directions.');
        // Fallback straight-line distance if API fails
        const straightLineDist = getHaversineDistance(startLat, startLng, endLat, endLng);
        setDistance(straightLineDist);
        setDuration(Math.round(straightLineDist * 2.5)); // rough estimate: 2.5 mins per km
        if (onDistanceCalculated) {
          onDistanceCalculated(straightLineDist, Math.round(straightLineDist * 2.5));
        }
      } finally {
        setLoading(false);
      }
    }

    if (startLat && startLng && endLat && endLng) {
      fetchRoute();
    }
  }, [startLat, startLng, endLat, endLng]);

  // Haversine formula helper
  function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }

  const isOverRadius = distance !== null && distance > maxDistanceKm;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Route Info Overlay */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-amber-500" />
            <span>{distance !== null ? `${distance} km` : 'Calculating...'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>{duration !== null ? `${duration} min drive` : 'Calculating...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">

          {distance !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs ${
              isOverRadius ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              {isOverRadius ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Exceeds {maxDistanceKm}km limit!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Within Delivery Area</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-72 w-full bg-gray-100 flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500 font-bold">Calculating driving route...</span>
          </div>
        )}

        <MapContainer
          center={startPoint}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {(() => {
            const isLivePartner = startName.toLowerCase().includes('live') || startName.toLowerCase().includes('your');
            return (
              <Marker position={startPoint} icon={isLivePartner ? deliveryIcon : goldIcon}>
                <Popup>
                  <div className="text-xs font-bold">
                    <span className="text-amber-600 block mb-1">
                      {isLivePartner ? '🛵 Delivery Partner (You)' : '📍 Store Pickup'}
                    </span>
                    <span className="text-gray-800">{startName}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })()}

          <Marker position={endPoint} icon={redIcon}>
            <Popup>
              <div className="text-xs font-bold">
                <span className="text-red-500 block mb-1">📍 Destination</span>
                <span className="text-gray-800">{endName}</span>
              </div>
            </Popup>
          </Marker>

          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              color="#d97706"
              weight={5}
              opacity={0.8}
            />
          )}


          <FitBounds start={startPoint} end={endPoint} route={routeCoords} />
        </MapContainer>

        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 z-[1000]">
            ⚠️ Using straight-line distance fallback: {error}
          </div>
        )}
      </div>
    </div>
  );
}
