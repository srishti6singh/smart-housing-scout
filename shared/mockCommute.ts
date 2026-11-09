// Deterministic sample commutes for offline use. The mock builds a response in
// the same shape as the Google Routes API and runs it through the same parser,
// so the UI never knows the difference except for the "Sample" label.
import { getCampus, OAKLAND_HUB } from './campuses';
import { distanceKm } from './geo';
import { getListing } from './listings';
import type { RoutesApiResponse, RoutesApiStep } from './parseRoute';
import type { Campus, CampusId, LatLng, MockLine, MockTransitProfile } from './types';
import { minutesOfDay } from './time';

const DETOUR = 1.3; // street distance vs straight line

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

function phaseOf(line: MockLine, salt: string): number {
  return line.phase ?? hash(line.name + salt) % line.headwayMin;
}

/** Latest scheduled departure at or before minute `t`. */
function latestAtOrBefore(t: number, line: MockLine, phase: number): number {
  return t - mod(t - phase, line.headwayMin);
}

/** First scheduled departure at or after minute `t`. */
function firstAtOrAfter(t: number, line: MockLine, phase: number): number {
  return t + mod(phase - t, line.headwayMin);
}

function rideMinutes(a: LatLng, b: LatLng, kmh: number): number {
  return Math.max(2, Math.round(((distanceKm(a, b) * DETOUR) / kmh) * 60));
}

const GENERIC_PROFILE: MockTransitProfile = {
  stopName: 'Nearest bus stop',
  walkToStopMin: 5,
  lines: [{ name: 'Bus', headwayMin: 15, kmh: 15, direct: ['cmu', 'pitt', 'duq'] }],
};

interface Leg {
  line: MockLine;
  from: string;
  to: string;
  dep: number;
  arr: number;
}

interface Plan {
  legs: Leg[];
  walkToStop: number;
  transferWalk: number;
  finalWalk: number;
  initialWait: number;
}

function planTrip(origin: LatLng, profile: MockTransitProfile, campus: Campus, arriveBy: number, salt: string): Plan | null {
  const building = campus.building;
  const finalWalk = campus.mock.finalWalkMin;
  const initialWait = hash(salt + campus.id) % 3;
  const plans: Plan[] = [];

  for (const line of profile.lines) {
    if (line.direct?.includes(campus.id)) {
      const ride = rideMinutes(origin, building, line.kmh);
      const dep = latestAtOrBefore(arriveBy - ride - finalWalk, line, phaseOf(line, salt));
      plans.push({
        legs: [{ line, from: profile.stopName, to: campus.mock.stopName, dep, arr: dep + ride }],
        walkToStop: profile.walkToStopMin,
        transferWalk: 0,
        finalWalk,
        initialWait,
      });
    }
  }

  if (plans.length === 0 && profile.lines.length > 0) {
    // Transfer at a hub onto the campus line. Take the first connection, the
    // way a journey planner does, and back off until the trip arrives in time.
    const first = profile.lines[0];
    const hub = profile.hub ?? OAKLAND_HUB;
    const second: MockLine = campus.mock.hubLine;
    const p1 = phaseOf(first, salt);
    const p2 = mod(phaseOf(second, campus.id) + (hash(hub.name) % second.headwayMin), second.headwayMin);
    const ride1 = rideMinutes(origin, hub, first.kmh);
    const ride2 = rideMinutes(hub, building, second.kmh);
    let dep1 = latestAtOrBefore(arriveBy - ride1 - hub.walkMin - ride2 - finalWalk, first, p1);
    for (let i = 0; i < 24; i++, dep1 -= first.headwayMin) {
      const dep2 = firstAtOrAfter(dep1 + ride1 + hub.walkMin, second, p2);
      if (dep2 + ride2 + finalWalk <= arriveBy) {
        plans.push({
          legs: [
            { line: first, from: profile.stopName, to: hub.name, dep: dep1, arr: dep1 + ride1 },
            { line: second, from: hub.name, to: campus.mock.stopName, dep: dep2, arr: dep2 + ride2 },
          ],
          walkToStop: profile.walkToStopMin,
          transferWalk: hub.walkMin,
          finalWalk,
          initialWait,
        });
        break;
      }
    }
  }

  // Best plan = latest departure from home.
  plans.sort((a, b) => b.legs[0].dep - a.legs[0].dep);
  return plans[0] ?? null;
}

export interface MockInput {
  listingId?: string;
  campusId?: CampusId;
  origin: LatLng;
  arriveBy: Date;
}

export function buildMockRoutesResponse(input: MockInput): RoutesApiResponse {
  const listing = getListing(input.listingId);
  const profile = listing?.transit ?? GENERIC_PROFILE;
  const campus = getCampus(input.campusId);
  const A = minutesOfDay(input.arriveBy);
  const salt = input.listingId ?? `${input.origin.lat.toFixed(4)},${input.origin.lng.toFixed(4)}`;
  const plan = planTrip(input.origin, profile, campus, A, salt);
  if (!plan) return { routes: [] };

  const at = (minuteOfDay: number) => new Date(input.arriveBy.getTime() + (minuteOfDay - A) * 60000).toISOString();
  const s = (min: number) => `${Math.round(min * 60)}s`;
  const headsign = campus.id === 'duq' ? 'Downtown' : 'Oakland';

  const steps: RoutesApiStep[] = [{ travelMode: 'WALK', staticDuration: s(plan.walkToStop) }];
  plan.legs.forEach((leg, i) => {
    if (i > 0) steps.push({ travelMode: 'WALK', staticDuration: s(plan.transferWalk) });
    steps.push({
      travelMode: 'TRANSIT',
      staticDuration: s(leg.arr - leg.dep),
      transitDetails: {
        stopDetails: {
          departureStop: { name: leg.from },
          arrivalStop: { name: leg.to },
          departureTime: at(leg.dep),
          arrivalTime: at(leg.arr),
        },
        headsign: i === plan.legs.length - 1 ? headsign : 'Oakland',
        stopCount: Math.max(2, Math.round((leg.arr - leg.dep) / 1.5)),
        transitLine: { nameShort: leg.line.name, vehicle: { type: leg.line.vehicle ?? 'BUS' } },
      },
    });
  });
  steps.push({ travelMode: 'WALK', staticDuration: s(plan.finalWalk) });

  const last = plan.legs[plan.legs.length - 1];
  const finalArrival = last.arr + plan.finalWalk;
  const departure = plan.legs[0].dep - plan.initialWait - plan.walkToStop;
  return { routes: [{ duration: s(finalArrival - departure), legs: [{ steps }] }] };
}
