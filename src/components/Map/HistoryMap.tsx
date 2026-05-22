import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../../types/index';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});
const currentIcon = L.divIcon({
  className: 'history-current-marker',
  html: `
    <div style="
      width: 18px; height: 18px; border-radius: 50%;
      background: #2563EB; border: 3px solid white;
      box-shadow: 0 0 0 4px rgba(37,99,235,0.3), 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const startIcon = L.divIcon({
  className: 'history-start-marker',
  html: `<div style="width: 12px; height: 12px; border-radius: 50%; background: #10B981; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const MAP_LAYERS = {
  osm: {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};
interface FitHistoryProps {
  positions: [number, number][];
}
function FitHistory({ positions }: FitHistoryProps) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 16 });
    }
  }, [positions, map]);
  return null;
}
interface HistoryMapProps {
  history: Location[];
  progressPercent: number;
  height?: string;
}
export function HistoryMap({ history, progressPercent, height = '100%' }: HistoryMapProps) {
  const [mapType, setMapType] = useState<keyof typeof MAP_LAYERS>('osm');
  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [history]
  );
  const positions: [number, number][] = useMemo(
    () => sorted.map((loc) => [loc.latitude, loc.longitude]),
    [sorted]
  );
  const progressIndex = Math.min(
    Math.floor((progressPercent / 100) * (positions.length - 1)),
    positions.length - 1
  );
  const visiblePositions = positions.slice(0, progressIndex + 1);
  const currentPos = positions[progressIndex] || positions[0];
  if (positions.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', borderRadius: 12 }}>
        <span style={{ color: '#94A3B8', fontSize: 14 }}>Aucun historique de position disponible</span>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        background: 'white',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <select
          value={mapType}
          onChange={(e) => setMapType(e.target.value as keyof typeof MAP_LAYERS)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {Object.entries(MAP_LAYERS).map(([key, layer]) => (
            <option key={key} value={key}>{layer.name}</option>
          ))}
        </select>
      </div>
      <MapContainer
        center={positions[0]}
        zoom={14}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution={MAP_LAYERS[mapType].attribution}
          url={MAP_LAYERS[mapType].url}
        />
      <FitHistory positions={positions} />
      {}
      <Polyline
        positions={positions}
        pathOptions={{ color: '#94A3B8', weight: 2, dashArray: '6 4', opacity: 0.4 }}
      />
      {}
      {visiblePositions.length > 1 && (
        <Polyline
          positions={visiblePositions}
          pathOptions={{ color: '#2563EB', weight: 4, opacity: 0.8 }}
        />
      )}
      {}
      <Marker position={positions[0]} icon={startIcon}>
        <Popup>
          <strong>Départ</strong><br />
          {new Date(sorted[0].timestamp).toLocaleTimeString('fr-FR')}
        </Popup>
      </Marker>
      {}
      {currentPos && (
        <Marker position={currentPos} icon={currentIcon}>
          <Popup>
            <strong>Position actuelle</strong><br />
            Vitesse: {sorted[progressIndex]?.speed?.toFixed(1) ?? '—'} km/h<br />
            {new Date(sorted[progressIndex]?.timestamp).toLocaleTimeString('fr-FR')}
          </Popup>
        </Marker>
      )}
    </MapContainer>
    </div>
  );
}
