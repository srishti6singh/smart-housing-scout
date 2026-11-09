import type { CommuteResult, JourneySegment, SegmentKind } from './types';

/*
 * Turns a Google Routes API (v2 computeRoutes, TRANSIT) response into a
 * door-to-campus journey.
 *
 * Fields used (see the field mask in server/google.ts):
 *   routes.duration                      "1934s"
 *   routes.legs.steps.travelMode         "WALK" | "TRANSIT"
 *   routes.legs.steps.staticDuration     "312s"
 *   routes.legs.steps.transitDetails     stopDetails.{departureTime, arrivalTime,
 *                                        departureStop.name, arrivalStop.name},
 *                                        transitLine.{nameShort, name, vehicle.type},
 *                                        headsign, stopCount
 *
 * A Route has no departure time field, so departure is derived:
 *   final arrival = last transit arrivalTime + walk after it
 *   departure     = final arrival - routes.duration
 *   initial wait  = first transit departureTime - (departure + walk to stop)
 * If routes.duration is missing, departure = first transit departure - walk to
 * stop, and the initial wait is 0.
 *
 * Early arrival = arrive-by - final arrival. Total = arrive-by - departure.
 */

export interface RoutesApiStep {
  travelMode?: string;
  staticDuration?: string;
  distanceMeters?: number;
  transitDetails?: {
    stopDetails?: {
      departureStop?: { name?: string };
      arrivalStop?: { name?: string };
      departureTime?: string;
      arrivalTime?: string;
    };
    headsign?: string;
    stopCount?: number;
    transitLine?: {
      name?: string;
      nameShort?: string;
      vehicle?: { type?: string };
    };
  };
}

export interface RoutesApiResponse {
  routes?: {
    duration?: string;
    staticDuration?: string;
    legs?: { steps?: RoutesApiStep[] }[];
  }[];
}

/** "123s" or "3.5s" -> seconds. */
export function parseDurationSeconds(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

type Block =
  | { type: 'walk'; ms: number }
  | {
      type: 'transit';
      dep: number;
      arr: number;
      line: string;
      vehicle?: string;
      headsign?: string;
      from?: string;
      to?: string;
      stopCount?: number;
    };

export function parseRoutesResponse(response: RoutesApiResponse, arriveByIso: string): CommuteResult | null {
  const route = response.routes?.[0];
  if (!route) return null;
  const steps = (route.legs ?? []).flatMap((leg) => leg.steps ?? []);
  if (steps.length === 0) return null;
  const arriveBy = new Date(arriveByIso).getTime();

  // 1. Group consecutive WALK steps; keep each TRANSIT step.
  const blocks: Block[] = [];
  let cursor: number | null = null;
  for (const step of steps) {
    const ms = parseDurationSeconds(step.staticDuration) * 1000;
    if (step.travelMode === 'TRANSIT' && step.transitDetails) {
      const td = step.transitDetails;
      const sd = td.stopDetails ?? {};
      const dep: number = sd.departureTime ? Date.parse(sd.departureTime) : (cursor ?? arriveBy);
      const arr: number = sd.arrivalTime ? Date.parse(sd.arrivalTime) : dep + ms;
      cursor = arr;
      blocks.push({
        type: 'transit',
        dep,
        arr,
        line: td.transitLine?.nameShort || td.transitLine?.name || td.transitLine?.vehicle?.type || 'Transit',
        vehicle: td.transitLine?.vehicle?.type,
        headsign: td.headsign,
        from: sd.departureStop?.name,
        to: sd.arrivalStop?.name,
        stopCount: td.stopCount,
      });
    } else {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'walk') last.ms += ms;
      else blocks.push({ type: 'walk', ms });
      if (cursor !== null) cursor += ms;
    }
  }

  const transits = blocks.filter((b): b is Extract<Block, { type: 'transit' }> => b.type === 'transit');
  const routeMs = parseDurationSeconds(route.duration) * 1000;

  // Walk-only route: leave so you arrive exactly at the arrive-by time.
  if (transits.length === 0) {
    const walkMs = blocks.reduce((s, b) => s + (b.type === 'walk' ? b.ms : 0), 0) || routeMs;
    const minutes = Math.max(1, Math.round(walkMs / 60000));
    const departAt = new Date(arriveBy - minutes * 60000).toISOString();
    return {
      walkToStop: 0,
      wait: 0,
      ride: 0,
      transferWalk: 0,
      walkToBuilding: minutes,
      earlyArrival: 0,
      transfers: 0,
      lines: [],
      travelMinutes: minutes,
      totalMinutes: minutes,
      departAt,
      arriveAt: new Date(arriveBy).toISOString(),
      arriveBy: new Date(arriveBy).toISOString(),
      walkOnly: true,
      segments: [{ kind: 'finalWalk', minutes, startsAt: departAt, to: 'Campus' }],
    };
  }

  // 2. Walk time before the first ride and after the last ride.
  const firstIdx = blocks.indexOf(transits[0]);
  const lastIdx = blocks.indexOf(transits[transits.length - 1]);
  const walkBefore = blocks.slice(0, firstIdx).reduce((s, b) => s + (b.type === 'walk' ? b.ms : 0), 0);
  const walkAfter = blocks.slice(lastIdx + 1).reduce((s, b) => s + (b.type === 'walk' ? b.ms : 0), 0);
  const finalArrival = transits[transits.length - 1].arr + walkAfter;

  const latestDepart = transits[0].dep - walkBefore;
  const depart = routeMs > 0 ? Math.min(finalArrival - routeMs, latestDepart) : latestDepart;

  // 3. Lay the trip out as ordered [kind, start, end] spans in absolute time.
  const spans: { kind: SegmentKind; start: number; end: number; t?: (typeof transits)[number]; to?: string }[] = [];
  spans.push({ kind: 'walk', start: depart, end: depart + walkBefore, to: transits[0].from });
  spans.push({ kind: 'wait', start: depart + walkBefore, end: transits[0].dep });
  transits.forEach((t, i) => {
    if (i > 0) {
      const prev = transits[i - 1];
      const between = blocks
        .slice(blocks.indexOf(prev) + 1, blocks.indexOf(t))
        .reduce((s, b) => s + (b.type === 'walk' ? b.ms : 0), 0);
      spans.push({ kind: 'transferWalk', start: prev.arr, end: prev.arr + between, to: t.from });
      spans.push({ kind: 'wait', start: prev.arr + between, end: t.dep });
    }
    spans.push({ kind: 'ride', start: t.dep, end: t.arr, t });
  });
  const last = transits[transits.length - 1];
  spans.push({ kind: 'finalWalk', start: last.arr, end: finalArrival, to: 'Campus' });
  if (arriveBy > finalArrival) spans.push({ kind: 'early', start: finalArrival, end: arriveBy });

  // 4. Round span boundaries (not durations) to whole minutes from departure,
  //    so segment minutes always add up to the total.
  const toMin = (ms: number) => Math.round((ms - depart) / 60000);
  let prevEnd = 0;
  const segments: JourneySegment[] = [];
  for (const s of spans) {
    const start = Math.max(prevEnd, toMin(s.start));
    const end = Math.max(start, toMin(s.end));
    prevEnd = end;
    const minutes = end - start;
    if (minutes <= 0 && s.kind !== 'ride') continue;
    segments.push({
      kind: s.kind,
      minutes: Math.max(minutes, s.kind === 'ride' ? 1 : 0),
      startsAt: new Date(depart + start * 60000).toISOString(),
      line: s.t?.line,
      vehicle: s.t?.vehicle,
      headsign: s.t?.headsign,
      from: s.t?.from,
      to: s.t?.to ?? s.to,
      stopCount: s.t?.stopCount,
    });
  }

  const sum = (kind: SegmentKind) => segments.filter((s) => s.kind === kind).reduce((a, s) => a + s.minutes, 0);
  const totalMinutes = segments.reduce((a, s) => a + s.minutes, 0);
  const earlyArrival = sum('early');

  return {
    walkToStop: sum('walk'),
    wait: sum('wait'),
    ride: sum('ride'),
    transferWalk: sum('transferWalk'),
    walkToBuilding: sum('finalWalk'),
    earlyArrival,
    transfers: transits.length - 1,
    lines: transits.map((t) => t.line),
    travelMinutes: totalMinutes - earlyArrival,
    totalMinutes,
    departAt: new Date(depart).toISOString(),
    arriveAt: new Date(finalArrival).toISOString(),
    arriveBy: new Date(arriveBy).toISOString(),
    walkOnly: false,
    segments,
  };
}
