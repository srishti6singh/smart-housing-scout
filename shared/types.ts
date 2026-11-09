// Shared domain types used by the web app and the API server.

export type CampusId = 'cmu' | 'pitt' | 'duq';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Campus {
  id: CampusId;
  name: string;
  short: string;
  building: { name: string } & LatLng;
  /** Mock mode only: the stop that serves the building and the walk from it. */
  mock: {
    stopName: string;
    finalWalkMin: number;
    /** Line used from a transfer hub when a home has no direct line. */
    hubLine: MockLine;
  };
}

/* ---------- Commute Truth-Teller ---------- */

export type SegmentKind = 'walk' | 'wait' | 'ride' | 'transferWalk' | 'finalWalk' | 'early';

/** One piece of the trip, in order. The Journey Bar renders these left to right. */
export interface JourneySegment {
  kind: SegmentKind;
  minutes: number;
  /** ISO start time of this segment. */
  startsAt: string;
  line?: string;
  vehicle?: string;
  headsign?: string;
  from?: string;
  to?: string;
  stopCount?: number;
}

/**
 * Door-to-campus commute. Bucket fields sum segments of that kind:
 * `wait` is the initial wait plus every transfer wait, `ride` is every ride.
 * `totalMinutes` = arrive-by time minus departure time, so it includes
 * minutes lost to arriving early.
 */
export interface CommuteResult {
  walkToStop: number;
  wait: number;
  ride: number;
  transferWalk: number;
  walkToBuilding: number;
  earlyArrival: number;
  transfers: number;
  lines: string[];
  /** Departure to arrival at the building. */
  travelMinutes: number;
  /** Departure to the arrive-by time. The number we sort by. */
  totalMinutes: number;
  departAt: string;
  arriveAt: string;
  arriveBy: string;
  walkOnly: boolean;
  segments: JourneySegment[];
}

export type CommuteSource = 'google' | 'sample';

export interface CommuteRequest {
  listingId?: string;
  campusId?: CampusId;
  origin: LatLng;
  destination: LatLng;
  /** "HH:MM" (resolved to the next weekday in America/New_York) or an ISO timestamp. */
  arriveBy: string;
}

export interface CommuteResponse {
  result: CommuteResult;
  source: CommuteSource;
  arriveBy: string;
  cached: boolean;
}

/* ---------- Mock transit model ---------- */

export interface MockLine {
  name: string;
  headwayMin: number;
  /** Average in-vehicle speed including stops. */
  kmh: number;
  /** Campuses this line reaches without a transfer. */
  direct?: CampusId[];
  /** Minute offset of the first departure each hour. Defaults to a stable hash. */
  phase?: number;
  vehicle?: 'BUS' | 'LIGHT_RAIL';
}

export interface MockTransitProfile {
  stopName: string;
  walkToStopMin: number;
  lines: MockLine[];
  /** Where to change when no line is direct. Defaults to Oakland (Fifth Ave at Bellefield). */
  hub?: { name: string; walkMin: number } & LatLng;
}

/* ---------- Lease Time Machine ---------- */

export type UtilityKey = 'electricity' | 'gas' | 'water' | 'internet' | 'insurance';
export type Season = 'average' | 'winter' | 'summer';
export type Efficiency = 'efficient' | 'average' | 'drafty';

export interface UtilityProfile {
  /** Utilities the landlord includes in rent. */
  included: UtilityKey[];
  heating: 'gas' | 'electric';
  efficiency: Efficiency;
}

export interface CostItem {
  key: UtilityKey;
  label: string;
  amount: number;
  included: boolean;
  estimate: true;
  basis: string;
}

export interface CostBreakdown {
  rent: number;
  season: Season;
  items: CostItem[];
  /** Sum of utilities the tenant pays on top of rent. */
  extra: number;
  total: number;
}

export interface TenantReview {
  id: string;
  author: string;
  tenancyFrom: string; // YYYY-MM
  tenancyTo: string; // YYYY-MM
  rating: number;
  text: string;
  verified: boolean;
}

export interface CategoryRatings {
  responsiveness: number;
  maintenance: number;
  noise: number;
  heating: number;
}

export interface ListingPhoto {
  id: string;
  url: string;
  room: string;
  alt: string;
}

export interface TenantPhoto {
  id: string;
  url: string;
  room: string;
  angle: string;
  date: string; // YYYY-MM-DD
  /** Listing photo of the same room, for the before/after slider. */
  pairsWith?: string;
}

/* ---------- Bathroom Detective ---------- */

export interface BathroomCheck {
  listed: number;
  verifiedFull: number;
  verifiedHalf: number;
  method: string;
  verifiedOn: string;
  note?: string;
}

export interface LeaseTerms {
  lengthsMonths: number[];
  deposit: number;
  earlyTermination: string | null;
  sublease: 'yes' | 'with approval' | 'no';
  noticeDays: number;
  availableFrom: string;
}

export interface Listing {
  id: string;
  title: string;
  neighborhood: string;
  address: string;
  /** Short street label for comparisons, e.g. "Semple St". */
  street: string;
  lat: number;
  lng: number;
  rent: number;
  beds: number;
  sqft: number;
  yearBuilt: number;
  bathroom: BathroomCheck;
  photos: ListingPhoto[];
  tenantPhotos: TenantPhoto[];
  utilities: UtilityProfile;
  ratings: CategoryRatings;
  reviews: TenantReview[];
  lease: LeaseTerms;
  /** What the listing itself says. Scout checks these. */
  claims: string[];
  description: string;
  neighborhoodNotes: string[];
  landlord: string;
  transit: MockTransitProfile;
}
