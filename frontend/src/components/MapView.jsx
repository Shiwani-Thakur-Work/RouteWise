/**
 * MapView.jsx
 * Leaflet map rendering:
 *  - OSM base tiles
 *  - Animated route polyline
 *  - Start / destination markers
 *  - Stop markers with category icons
 *
 * Uses react-leaflet for React integration.
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon paths (broken in Vite builds)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

/** Create a custom div icon with an emoji */
function emojiIcon(emoji, size = 32) {
  return L.divIcon({
    className: '',
    html: `<div style="
      font-size:${size}px;
      line-height:1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      cursor: pointer;
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  });
}

/** Auto-fit map bounds when route data changes */
function BoundsController({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [points, map]);
  return null;
}

/** Extract GeoJSON coordinates into Leaflet LatLng pairs */
function geometryToLatLngs(geometry) {
  if (!geometry || !geometry.coordinates) return [];
  return geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

export default function MapView({ planData }) {
  // Default centre: New Delhi
  const defaultCenter = [28.6139, 77.2090];
  const defaultZoom   = 11;

  const allPoints = planData ? [
    planData.route.start,
    ...planData.route.stops.map(s => ({ lat: s.lat, lng: s.lng })),
    planData.route.destination
  ] : [];

  const routeLatLngs = planData ? geometryToLatLngs(planData.route.geometry) : [];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
      attributionControl={true}
    >
      {/* OSM base tiles */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {/* Auto-fit bounds */}
      {allPoints.length > 0 && <BoundsController points={allPoints} />}

      {/* Animated route polyline */}
      {routeLatLngs.length > 0 && (
        <Polyline
          positions={routeLatLngs}
          pathOptions={{
            color: '#2D6A4F',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
          }}
          className="route-line"
        />
      )}

      {/* Start marker */}
      {planData && (
        <Marker
          position={[planData.route.start.lat, planData.route.start.lng]}
          icon={emojiIcon('🟢', 28)}
        >
          <Popup>
            <strong>Start</strong><br />
            {planData.route.start.displayName}
          </Popup>
        </Marker>
      )}

      {/* Stop markers */}
      {planData && planData.route.stops.map(stop => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={emojiIcon(stop.icon || '📍', 30)}
        >
          <Popup>
            <strong>{stop.name}</strong><br />
            {stop.category.replace('_', ' ')}<br />
            <span style={{ color: '#2D6A4F', fontWeight: 600 }}>+{stop.detour_min} min detour</span>
          </Popup>
        </Marker>
      ))}

      {/* Destination marker */}
      {planData && (
        <Marker
          position={[planData.route.destination.lat, planData.route.destination.lng]}
          icon={emojiIcon('🏁', 28)}
        >
          <Popup>
            <strong>Destination</strong><br />
            {planData.route.destination.displayName}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
