import type { RoutesApiResponse } from '../shared/parseRoute';
import type { LatLng } from '../shared/types';

export const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Only the fields the parser reads. Fewer fields = lower billing tier and less data.
export const FIELD_MASK = [
  'routes.duration',
  'routes.legs.steps.travelMode',
  'routes.legs.steps.staticDuration',
  'routes.legs.steps.transitDetails.stopDetails',
  'routes.legs.steps.transitDetails.headsign',
  'routes.legs.steps.transitDetails.stopCount',
  'routes.legs.steps.transitDetails.transitLine.name',
  'routes.legs.steps.transitDetails.transitLine.nameShort',
  'routes.legs.steps.transitDetails.transitLine.vehicle.type',
].join(',');

export class UpstreamError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const waypoint = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });

export async function fetchTransitRoute(apiKey: string, origin: LatLng, destination: LatLng, arriveBy: Date): Promise<RoutesApiResponse> {
  const res = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      origin: waypoint(origin),
      destination: waypoint(destination),
      travelMode: 'TRANSIT',
      arrivalTime: arriveBy.toISOString(),
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: 'IMPERIAL',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? '';
    } catch {
      /* ignore */
    }
    throw new UpstreamError(`Google Routes API returned ${res.status}${detail ? `: ${detail}` : ''}`, res.status);
  }
  return (await res.json()) as RoutesApiResponse;
}
