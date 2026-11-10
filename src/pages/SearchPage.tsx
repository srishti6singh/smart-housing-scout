import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCampus } from '../../shared/campuses';
import { formatDistance } from '../../shared/geo';
import { closestVsFastest, type CommuteRank } from '../../shared/insights';
import { formatClock } from '../../shared/time';
import { FilterBar } from '../components/FilterBar';
import { IconList, IconMap, IconX } from '../components/icons';
import { ListingCard } from '../components/ListingCard';
import { MapView } from '../components/MapView';
import { EmptyState, ErrorBanner, SampleLabel } from '../components/states';
import { CompareTray } from '../components/CompareTray';
import { budgetMatch } from '../lib/filters';
import { prefersReducedMotion, safeStorage } from '../lib/format';
import { commuteMinutes, DEFAULT_FILTERS, SORT_LABELS, useApp, type ListingView } from '../state/AppState';

function matchesQuery(v: ListingView, q: string) {
  if (!q) return true;
  const hay = `${v.listing.neighborhood} ${v.listing.address} ${v.listing.title}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

const MAP_MIN = 20;
const MAP_MAX = 70;
const MAP_DEFAULT = 44;
const clampMap = (pct: number) => Math.min(MAP_MAX, Math.max(MAP_MIN, Math.round(pct)));

/** Drag handle between the list and the map. Arrow keys resize it too. */
function MapDivider({ pct, onChange }: { pct: number; onChange: (pct: number) => void }) {
  const toPct = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.parentElement!.getBoundingClientRect();
    return clampMap(((box.right - e.clientX) / box.width) * 100);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize map"
      aria-valuemin={MAP_MIN}
      aria-valuemax={MAP_MAX}
      aria-valuenow={pct}
      aria-valuetext={`Map is ${pct}% of the width`}
      tabIndex={0}
      title="Drag to resize the map. Double-click to reset."
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.style.userSelect = 'none';
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onChange(toPct(e));
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        document.body.style.userSelect = '';
      }}
      onDoubleClick={() => {
        onChange(MAP_DEFAULT);
      }}
      onKeyDown={(e) => {
        const step = { ArrowLeft: 5, ArrowRight: -5 }[e.key];
        if (step) onChange(clampMap(pct + step));
        else if (e.key === 'Home') onChange(MAP_MAX);
        else if (e.key === 'End') onChange(MAP_MIN);
        else return;
        e.preventDefault();
      }}
      className="group sticky top-[137px] z-10 flex h-[calc(100vh-137px)] w-3 shrink-0 cursor-col-resize touch-none items-center justify-center border-l border-hairline bg-white hover:bg-mist"
    >
      <span className="h-10 w-1 rounded-full bg-hairline transition-colors group-hover:bg-ink-faint group-focus-visible:bg-transit" aria-hidden />
    </div>
  );
}

export function SearchPage() {
  const app = useApp();
  const [mapPct, setMapPct] = useState(() => clampMap(safeStorage.get('scout.mapPct', MAP_DEFAULT)));
  const [showMap, setShowMap] = useState(() => safeStorage.get('scout.showMap', true));
  useEffect(() => safeStorage.set('scout.mapPct', mapPct), [mapPct]);
  const toggleMap = () => {
    setShowMap((s) => {
      safeStorage.set('scout.showMap', !s);
      return !s;
    });
  };
  const { views, filters, sort, query, campusId, commuteError, commuteSource, arriveByIso, saved } = app;
  const campus = getCampus(campusId);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState<'list' | 'map'>('list');

  const results = useMemo(() => {
    const filtered = views.filter((v) => {
      const { listing, cost } = v;
      if (!matchesQuery(v, query)) return false;
      if (!budgetMatch(listing.rent, cost.extra, filters)) return false;
      if (listing.beds < filters.minBeds) return false;
      if (listing.bathroom.verifiedFull < filters.minFullBaths) return false;
      if (filters.maxCommute !== null) {
        const m = commuteMinutes(v);
        if (m !== null && m > filters.maxCommute) return false;
      }
      if (filters.mustInclude.some((u) => !listing.utilities.included.includes(u))) return false;
      return true;
    });
    const key = (v: ListingView): number => {
      switch (sort) {
        case 'commute':
          return commuteMinutes(v) ?? Number.POSITIVE_INFINITY;
        case 'trueCost':
          return v.cost.total;
        case 'rent':
          return v.listing.rent;
        case 'distance':
          return v.distanceKm;
        case 'rating':
          return -v.rating;
      }
    };
    return [...filtered].sort((a, b) => key(a) - key(b) || a.distanceKm - b.distanceKm);
  }, [views, filters, sort, query]);

  const headline = useMemo(() => {
    const ranks: CommuteRank[] = results
      .filter((v) => v.commute.status === 'ok')
      .map((v) => ({ id: v.listing.id, street: v.listing.street, distanceKm: v.distanceKm, totalMinutes: commuteMinutes(v)! }));
    return closestVsFastest(ranks);
  }, [results]);

  const selectFromMap = useCallback((id: string) => {
    setSelectedId(id);
    const el = document.getElementById(`card-${id}`);
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    }
  }, []);

  const activeId = hoverId ?? selectedId;
  const selectedView = selectedId ? results.find((v) => v.listing.id === selectedId) : undefined;

  const list = (
    <div className="px-4 pb-28 pt-5 md:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">
            {results.length} {results.length === 1 ? 'home' : 'homes'} for {campus.short} students
          </h1>
          <p className="text-sm text-ink-muted">
            Sorted by {SORT_LABELS[sort].toLowerCase()} to {campus.building.name}
            {arriveByIso ? `, arriving by ${formatClock(arriveByIso)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge border border-hairline bg-white text-ink-muted">Sample listings</span>
          {commuteSource === 'sample' && <SampleLabel />}
          <button type="button" onClick={toggleMap} aria-pressed={!showMap} className="pill hidden px-3 py-1.5 text-xs lg:inline-flex">
            <IconMap size={14} /> {showMap ? 'Hide map' : 'Show map'}
          </button>
        </div>
      </div>

      {commuteError && (
        <div className="mb-4">
          <ErrorBanner message={commuteError} onRetry={app.retryCommutes} />
        </div>
      )}

      {headline && sort === 'commute' && (
        <section aria-label="Distance versus commute" className="evidence-panel mb-5 p-5">
          <p className="eyebrow text-[#8DDDD5]">Commute Truth-Teller</p>
          <p className="mt-1 max-w-prose text-base">
            The closest home is not the fastest. <strong className="font-semibold">{headline.closest.street}</strong> is{' '}
            {formatDistance(headline.closest.distanceKm)} from campus but takes{' '}
            <span className="evidence text-amber">{headline.closest.totalMinutes} min</span> door to door.{' '}
            <strong className="font-semibold">{headline.fastest.street}</strong> is {formatDistance(headline.fastest.distanceKm)} away and takes{' '}
            <span className="evidence text-[#8DDDD5]">{headline.fastest.totalMinutes} min</span>.
          </p>
        </section>
      )}

      {results.length === 0 ? (
        <EmptyState
          title="No homes match these filters"
          body={query ? `Nothing matches “${query}” with the current filters. Try a neighborhood such as Shadyside or Squirrel Hill, or clear the filters.` : 'Try a higher budget or a longer commute limit.'}
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                app.setFilters(DEFAULT_FILTERS);
                app.setQuery('');
              }}
            >
              Clear search and filters
            </button>
          }
        />
      ) : (
        <div className="grid gap-x-4 gap-y-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr))]">
          {results.map((v) => (
            <ListingCard key={v.listing.id} view={v} active={selectedId === v.listing.id} onHover={setHoverId} />
          ))}
        </div>
      )}
    </div>
  );

  const map = (
    <MapView
      listings={results.map((v) => v.listing)}
      campus={campus}
      activeId={activeId}
      savedIds={saved}
      onSelect={selectFromMap}
      onHover={setHoverId}
    />
  );

  return (
    <>
      <FilterBar resultCount={results.length} />

      {/* Desktop: list and map side by side */}
      <div className="hidden lg:flex">
        <div className="min-w-0 flex-1">{list}</div>
        {showMap && (
          <>
            <MapDivider pct={mapPct} onChange={setMapPct} />
            <div className="sticky top-[137px] h-[calc(100vh-137px)] shrink-0" style={{ width: `${mapPct}%` }}>
              {map}
            </div>
          </>
        )}
      </div>

      {/* Mobile and tablet: list or map, with a bottom sheet */}
      <div className="lg:hidden">
        {mobileMode === 'list' ? (
          list
        ) : (
          <div className="relative h-[calc(100dvh-137px)]">
            {map}
            {selectedView && (
              <div className="absolute inset-x-0 bottom-0 z-[950] motion-safe:animate-sheet" role="dialog" aria-label={`${selectedView.listing.street} details`}>
                <div className="mx-auto max-w-md rounded-t-card bg-white p-3 pb-20 shadow-float">
                  <div className="mb-1 flex items-center justify-between px-2">
                    <span className="mx-auto h-1 w-10 rounded-full bg-hairline" aria-hidden />
                    <button type="button" aria-label="Close" onClick={() => setSelectedId(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-mist">
                      <IconX size={16} />
                    </button>
                  </div>
                  <ListingCard view={selectedView} compact />
                </div>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setMobileMode((m) => (m === 'list' ? 'map' : 'list'))}
          className="fixed bottom-6 left-1/2 z-[960] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-midnight px-5 py-3 text-sm font-semibold text-white shadow-float"
        >
          {mobileMode === 'list' ? (
            <>
              <IconMap size={16} /> Map
            </>
          ) : (
            <>
              <IconList size={16} /> List
            </>
          )}
        </button>
      </div>

      <CompareTray hidden={mobileMode === 'map' && typeof window !== 'undefined' && window.innerWidth < 1024} />
    </>
  );
}
