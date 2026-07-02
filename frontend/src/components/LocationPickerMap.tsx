import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

// Custom gold icon for warehouse
const goldIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom red icon for customer pin
const redIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerMapProps {
  onLocationSelected: (coords: { lat: number; lng: number }, addressDetails?: any) => void;
  warehouseCoords: { lat: number; lng: number };
  maxDistanceKm?: number;
  initialCoords?: { lat: number; lng: number } | null;
}

// Click listener to move the marker
function MapClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

export function LocationPickerMap({
  onLocationSelected,
  warehouseCoords,
  maxDistanceKm = 25,
  initialCoords,
}: LocationPickerMapProps) {
  const [position, setPosition] = useState<[number, number]>(() => {
    if (initialCoords?.lat && initialCoords?.lng) {
      return [initialCoords.lat, initialCoords.lng];
    }
    return [warehouseCoords.lat, warehouseCoords.lng];
  });
  const [distance, setDistance] = useState<number | null>(null);
  const [addressName, setAddressName] = useState<string>('');
  const [resolving, setResolving] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  // Haversine distance formula
  const getHaversineDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }, []);

  // Sync position from initialCoords
  useEffect(() => {
    if (initialCoords?.lat && initialCoords?.lng) {
      setPosition([initialCoords.lat, initialCoords.lng]);
    }
  }, [initialCoords]);

  // Reverse geocode and trigger callbacks
  const handleLocationUpdate = useCallback(async (lat: number, lng: number) => {
    setResolving(true);
    setAddressName('Resolving address details...');
    
    // Calculate distance
    const dist = getHaversineDistance(warehouseCoords.lat, warehouseCoords.lng, lat, lng);
    setDistance(dist);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!response.ok) throw new Error('Reverse geocode failed');
      const data = await response.json();
      
      if (data && data.address) {
        const road = data.address.road || data.address.suburb || data.address.neighbourhood || '';
        const city = data.address.city || data.address.town || data.address.village || '';
        setAddressName(data.display_name || 'Location pinned on map');
        onLocationSelected({ lat, lng }, data.address);
      } else {
        setAddressName('Location pinned on map');
        onLocationSelected({ lat, lng });
      }
    } catch (err) {
      console.error(err);
      setAddressName('Location pinned on map');
      onLocationSelected({ lat, lng });
    } finally {
      setResolving(false);
    }
  }, [warehouseCoords, getHaversineDistance, onLocationSelected]);

  // Handle marker drag
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          setPosition([latLng.lat, latLng.lng]);
          handleLocationUpdate(latLng.lat, latLng.lng);
        }
      },
    }),
    [handleLocationUpdate]
  );

  // Handle map click
  const handleMapClick = useCallback((latlng: L.LatLng) => {
    setPosition([latlng.lat, latlng.lng]);
    handleLocationUpdate(latlng.lat, latlng.lng);
  }, [handleLocationUpdate]);

  const isOverRadius = distance !== null && distance > maxDistanceKm;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mt-4">
      {/* Header Info Panel */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
          <div className="flex items-center gap-1.5 text-gray-800">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>Select Location on Map</span>
          </div>

          {distance !== null && (
            <div className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 font-semibold ${
              isOverRadius ? 'bg-red-50 border border-red-200 text-red-700 animate-pulse' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              <span>{isOverRadius ? 'Outside delivery area' : 'Within delivery area'}</span>
            </div>
          )}
        </div>

        {addressName && (
          <p className="text-xs text-gray-500 font-medium leading-relaxed truncate flex items-center gap-1">
            {resolving && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
            <span>{addressName}</span>
          </p>
        )}
      </div>

      {/* Interactive Map */}
      <div className="h-64 w-full relative bg-gray-50">
        <MapContainer
          center={position}
          zoom={14}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Draggable Customer Marker */}
          <Marker
            position={position}
            icon={redIcon}
            draggable={true}
            eventHandlers={eventHandlers}
            ref={markerRef}
          >
            <Popup>
              <div className="text-xs font-bold text-gray-800">
                <span>📍 Your Delivery Point</span>
                <span className="block text-[10px] text-gray-400 font-medium mt-1">Drag me to adjust</span>
              </div>
            </Popup>
          </Marker>

          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>
      </div>
      <p className="text-[11px] text-gray-400 p-3 bg-gray-50 text-center font-medium">
        💡 Tap anywhere on the map or drag the red pin to select your exact delivery address
      </p>
    </div>
  );
}
