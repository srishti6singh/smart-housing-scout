import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CAMPUSES, DEFAULT_CAMPUS, getCampus } from '../../shared/campuses';
import { computeTrueCost } from '../../shared/cost';
import { distanceKm } from '../../shared/geo';
import { commuteInsight, getFlags, overallRating, type CommuteInsight, type CommuteRank, type Flag } from '../../shared/insights';
import { LISTINGS } from '../../shared/listings';
import type { CampusId, CommuteResponse, CommuteResult, CommuteSource, CostBreakdown, Listing, UtilityKey } from '../../shared/types';
import { safeStorage } from '../lib/format';

/* ---------- Filters and sort ---------- */

export type SortKey = 'commute' | 'trueCost' | 'rent' | 'distance' | 'rating';

export const SORT_LABELS: Record<SortKey, string> = {
  commute: 'Fastest commute',
  trueCost: 'Lowest true cost',
  rent: 'Lowest rent',
  distance: 'Closest',
  rating: 'Best tenant rating',
};

export interface Filters {
  maxBudget: number | null;
  budgetUsesTrueCost: boolean;
  minBeds: number;
  minFullBaths: number;
  maxCommute: number | null;
  mustInclude: UtilityKey[];
}

export const DEFAULT_FILTERS: Filters = {
  maxBudget: null,
  budgetUsesTrueCost: true,
  minBeds: 0,
  minFullBaths: 0,
  maxCommute: null,
  mustInclude: [],
};

/* ---------- Commute fetch state ---------- */

export type CommuteEntry =
  | { status: 'loading' }
  | { status: 'ok'; result: CommuteResult }
  | { status: 'error'; error: string };

interface CommuteState {
  key: string;
  entries: Record<string, CommuteEntry>;
  source: CommuteSource | null;
  arriveByIso: string | null;
}

/* ---------- Enriched listing (claims + evidence) ---------- */

export interface ListingView {
  listing: Listing;
  distanceKm: number;
  cost: CostBreakdown;
  commute: CommuteEntry;
  insight: CommuteInsight | null;
  flags: Flag[];
  rating: number;
}

interface AppState {
  campusId: CampusId;
  setCampusId: (id: CampusId) => void;
  arriveBy: string;
  setArriveBy: (hhmm: string) => void;
  query: string;
  setQuery: (q: string) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  saved: string[];
  toggleSaved: (id: string) => void;
  compare: string[];
  toggleCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  views: ListingView[];
  viewById: Record<string, ListingView>;
  commuteSource: CommuteSource | null;
  arriveByIso: string | null;
  commutesLoading: boolean;
  commuteError: string | null;
  retryCommutes: () => void;
}

const Ctx = createContext<AppState | null>(null);

export const MAX_COMPARE = 4;

async function fetchCommute(listing: Listing, campusId: CampusId, arriveBy: string): Promise<CommuteResponse> {
  const campus = getCampus(campusId);
  let res: Response;
  try {
    res = await fetch('/api/commute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: listing.id,
        campusId,
        origin: { lat: listing.lat, lng: listing.lng },
        destination: { lat: campus.building.lat, lng: campus.building.lng },
        arriveBy,
      }),
    });
  } catch {
    throw new Error('Can’t reach the commute server. Start it with "npm run dev", which runs the API on port 8787.');
  }
  if (!res.ok) {
    let message = `Commute server returned ${res.status}.`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // No JSON body means the dev proxy answered, not our API: the API is not running.
      if (res.status >= 500) message = 'Can’t reach the commute server. Start it with "npm run dev", which runs the API on port 8787.';
    }
    throw new Error(message);
  }
  return (await res.json()) as CommuteResponse;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [campusId, setCampusIdState] = useState<CampusId>(() => {
    const stored = safeStorage.get<string>('scout.campus', DEFAULT_CAMPUS);
    return CAMPUSES.some((c) => c.id === stored) ? (stored as CampusId) : DEFAULT_CAMPUS;
  });
  const [arriveBy, setArriveByState] = useState(() => safeStorage.get('scout.arriveBy', '08:45'));
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('commute');
  const [saved, setSaved] = useState<string[]>(() => safeStorage.get('scout.saved', []));
  const [compare, setCompareState] = useState<string[]>(() => safeStorage.get('scout.compare', []));
  const [attempt, setAttempt] = useState(0);
  const [commutes, setCommutes] = useState<CommuteState>({ key: '', entries: {}, source: null, arriveByIso: null });
  const cacheRef = useRef(new Map<string, CommuteState>());

  const setCampusId = useCallback((id: CampusId) => {
    setCampusIdState(id);
    safeStorage.set('scout.campus', id);
  }, []);
  const setArriveBy = useCallback((v: string) => {
    setArriveByState(v);
    safeStorage.set('scout.arriveBy', v);
  }, []);
  const toggleSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      safeStorage.set('scout.saved', next);
      return next;
    });
  }, []);
  const setCompare = useCallback((ids: string[]) => {
    const next = ids.slice(0, MAX_COMPARE);
    setCompareState(next);
    safeStorage.set('scout.compare', next);
  }, []);
  const toggleCompare = useCallback((id: string) => {
    setCompareState((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id];
      safeStorage.set('scout.compare', next);
      return next;
    });
  }, []);

  // Fetch commutes for every listing whenever campus or arrive-by changes.
  useEffect(() => {
    const key = `${campusId}|${arriveBy}`;
    const cached = cacheRef.current.get(key);
    if (cached && attempt === 0) {
      setCommutes(cached);
      return;
    }
    let cancelled = false;
    const loading: Record<string, CommuteEntry> = Object.fromEntries(LISTINGS.map((l) => [l.id, { status: 'loading' } as CommuteEntry]));
    setCommutes({ key, entries: loading, source: null, arriveByIso: null });

    Promise.allSettled(LISTINGS.map((l) => fetchCommute(l, campusId, arriveBy))).then((results) => {
      if (cancelled) return;
      const entries: Record<string, CommuteEntry> = {};
      let source: CommuteSource | null = null;
      let arriveByIso: string | null = null;
      results.forEach((r, i) => {
        const id = LISTINGS[i].id;
        if (r.status === 'fulfilled') {
          entries[id] = { status: 'ok', result: r.value.result };
          source = r.value.source;
          arriveByIso = r.value.arriveBy;
        } else {
          entries[id] = { status: 'error', error: (r.reason as Error).message };
        }
      });
      const state: CommuteState = { key, entries, source, arriveByIso };
      if (Object.values(entries).every((e) => e.status === 'ok')) cacheRef.current.set(key, state);
      setCommutes(state);
    });
    return () => {
      cancelled = true;
    };
  }, [campusId, arriveBy, attempt]);

  const retryCommutes = useCallback(() => {
    cacheRef.current.clear();
    setAttempt((a) => a + 1);
  }, []);

  const views = useMemo<ListingView[]>(() => {
    const campus = getCampus(campusId);
    const base = LISTINGS.map((listing) => {
      const commute = commutes.entries[listing.id] ?? { status: 'loading' as const };
      const cost = computeTrueCost(listing);
      return {
        listing,
        distanceKm: distanceKm(listing, campus.building),
        cost,
        commute,
        insight: null as CommuteInsight | null,
        flags: getFlags(listing, cost, commute.status === 'ok' ? commute.result : null),
        rating: overallRating(listing),
      };
    });
    const ranks: CommuteRank[] = base
      .filter((v) => v.commute.status === 'ok')
      .map((v) => ({
        id: v.listing.id,
        street: v.listing.street,
        distanceKm: v.distanceKm,
        totalMinutes: (v.commute as { result: CommuteResult }).result.totalMinutes,
      }));
    for (const v of base) {
      const rank = ranks.find((r) => r.id === v.listing.id);
      if (rank) v.insight = commuteInsight(rank, ranks);
    }
    return base;
  }, [campusId, commutes]);

  const viewById = useMemo(() => Object.fromEntries(views.map((v) => [v.listing.id, v])), [views]);
  const entries = Object.values(commutes.entries);
  const commutesLoading = entries.length === 0 || entries.some((e) => e.status === 'loading');
  const firstError = entries.find((e): e is Extract<CommuteEntry, { status: 'error' }> => e.status === 'error');

  const value: AppState = {
    campusId,
    setCampusId,
    arriveBy,
    setArriveBy,
    query,
    setQuery,
    filters,
    setFilters,
    sort,
    setSort,
    saved,
    toggleSaved,
    compare,
    toggleCompare,
    setCompare,
    views,
    viewById,
    commuteSource: commutes.source,
    arriveByIso: commutes.arriveByIso,
    commutesLoading,
    commuteError: firstError?.error ?? null,
    retryCommutes,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}

export function commuteMinutes(v: ListingView): number | null {
  return v.commute.status === 'ok' ? v.commute.result.totalMinutes : null;
}
