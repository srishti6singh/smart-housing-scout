import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPUSES } from '../shared/campuses';
import { buildMockRoutesResponse } from '../shared/mockCommute';
import { parseRoutesResponse } from '../shared/parseRoute';
import { nextWeekdayAt, parseHHMM } from '../shared/time';
import type { CampusId, CommuteRequest, CommuteResponse, CommuteResult, CommuteSource, LatLng } from '../shared/types';
import { fetchTransitRoute, UpstreamError } from './google';

const PORT = Number(process.env.API_PORT ?? 8787);
const API_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim() || '';
const SOURCE: CommuteSource = API_KEY ? 'google' : 'sample';
const CACHE_TTL_MS = 30 * 60 * 1000;
const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim());

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/api', cors({ origin: CORS_ORIGINS }));
app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    limit: Number(process.env.RATE_LIMIT_PER_MIN ?? 300),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Wait a minute and try again.' },
  }),
);

/* ---------- In-memory cache keyed by listing, campus and arrive-by time ---------- */

const cache = new Map<string, { at: number; result: CommuteResult }>();

function cacheKey(body: CommuteRequest, arriveBy: Date, origin: LatLng, destination: LatLng): string {
  const from = body.listingId ?? `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`;
  const to = body.campusId ?? `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
  return `${SOURCE}|${from}|${to}|${arriveBy.toISOString()}`;
}

/* ---------- Validation ---------- */

function asLatLng(v: unknown): LatLng | null {
  if (!v || typeof v !== 'object') return null;
  const { lat, lng } = v as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function resolveArriveBy(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  if (parseHHMM(value)) return nextWeekdayAt(value);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------- Routes ---------- */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, source: SOURCE, cacheSize: cache.size });
});

app.post('/api/commute', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as CommuteRequest;
  const origin = asLatLng(body.origin);
  const destination = asLatLng(body.destination);
  const arriveBy = resolveArriveBy(body.arriveBy);
  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination must be { lat, lng } numbers.' });
  }
  if (!arriveBy) {
    return res.status(400).json({ error: 'arriveBy must be "HH:MM" (for example "08:45") or an ISO timestamp.' });
  }
  if (body.campusId && !CAMPUSES.some((c) => c.id === body.campusId)) {
    return res.status(400).json({ error: `Unknown campusId "${body.campusId}".` });
  }

  const key = cacheKey(body, arriveBy, origin, destination);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    const payload: CommuteResponse = { result: hit.result, source: SOURCE, arriveBy: arriveBy.toISOString(), cached: true };
    return res.json(payload);
  }

  try {
    const raw = API_KEY
      ? await fetchTransitRoute(API_KEY, origin, destination, arriveBy)
      : buildMockRoutesResponse({ listingId: body.listingId, campusId: body.campusId as CampusId | undefined, origin, arriveBy });
    const result = parseRoutesResponse(raw, arriveBy.toISOString());
    if (!result) {
      return res.status(404).json({ error: 'No transit route arrives by that time. Try a later arrive-by time.' });
    }
    cache.set(key, { at: Date.now(), result });
    const payload: CommuteResponse = { result, source: SOURCE, arriveBy: arriveBy.toISOString(), cached: false };
    return res.json(payload);
  } catch (err) {
    if (err instanceof UpstreamError) {
      const hint =
        err.status === 403 || err.status === 401
          ? ' Check that GOOGLE_MAPS_API_KEY is valid and the Routes API is enabled for it.'
          : '';
      return res.status(502).json({ error: `${err.message}.${hint}` });
    }
    console.error(err);
    return res.status(500).json({ error: 'Could not compute the commute. Try again.' });
  }
});

/* ---------- Production: serve the built front end ---------- */

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Smart Housing Scout API on http://localhost:${PORT} (commute source: ${SOURCE === 'google' ? 'Google Routes API' : 'sample data, no API key set'})`);
});
