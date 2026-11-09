import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Campus, Listing } from '../../shared/types';

function priceLabel(rent: number) {
  return rent >= 1000 ? `$${(rent / 1000).toFixed(rent % 1000 === 0 ? 0 : 2).replace(/0$/, '')}k` : `$${rent}`;
}

function pinIcon(rent: number, active: boolean, saved: boolean) {
  return L.divIcon({
    className: `price-pin${active ? ' is-active' : ''}${saved ? ' is-saved' : ''}`,
    html: `<span>${priceLabel(rent)}</span>`,
    iconSize: [0, 0],
  });
}

function campusIcon(label: string) {
  return L.divIcon({ className: 'campus-pin', html: `<span>${label}</span>`, iconSize: [0, 0] });
}

function FitBounds({ points, padding }: { points: [number, number][]; padding: number }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, padding]);
  return null;
}

function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

interface Props {
  listings: Listing[];
  campus: Campus;
  activeId?: string | null;
  savedIds?: string[];
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  padding?: number;
  interactive?: boolean;
  className?: string;
}

export function MapView({ listings, campus, activeId, savedIds = [], onSelect, onHover, padding = 48, interactive = true, className = '' }: Props) {
  const points = useMemo<[number, number][]>(
    () => [...listings.map((l) => [l.lat, l.lng] as [number, number]), [campus.building.lat, campus.building.lng]],
    [listings, campus],
  );

  return (
    <MapContainer
      center={[campus.building.lat, campus.building.lng]}
      zoom={13}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      doubleClickZoom={interactive}
      keyboard={interactive}
      className={`h-full w-full ${className}`}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} padding={padding} />
      <InvalidateOnResize />
      <Marker position={[campus.building.lat, campus.building.lng]} icon={campusIcon(campus.short)} keyboard={false} zIndexOffset={-100}>
        <Tooltip direction="top" offset={[0, -14]}>
          {campus.building.name}
        </Tooltip>
      </Marker>
      {listings.map((l) => (
        <Marker
          key={l.id}
          position={[l.lat, l.lng]}
          icon={pinIcon(l.rent, l.id === activeId, savedIds.includes(l.id))}
          zIndexOffset={l.id === activeId ? 1000 : 0}
          title={`${l.street}, $${l.rent.toLocaleString('en-US')} a month`}
          alt={`${l.street}, $${l.rent.toLocaleString('en-US')} a month`}
          eventHandlers={{
            click: () => onSelect?.(l.id),
            keypress: (e) => {
              const key = (e.originalEvent as KeyboardEvent).key;
              if (key === 'Enter' || key === ' ') onSelect?.(l.id);
            },
            mouseover: () => onHover?.(l.id),
            mouseout: () => onHover?.(null),
          }}
        />
      ))}
    </MapContainer>
  );
}
