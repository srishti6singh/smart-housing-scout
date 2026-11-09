# Smart Housing Scout

Rent with evidence, not claims. A rental search for students who rent sight-unseen,
starting with Pittsburgh (CMU, Pitt, Duquesne).

## Run it

Needs Node.js 20 or newer (`node -v`). From this folder:

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm run dev` starts two processes:

- **web**: Vite on port 5173 (proxies `/api` to the API)
- **api**: Express on port 8787

With no API key the app runs fully offline on sample commute data and shows a
"Sample commute data" label. Map tiles and photos still need the internet; photos fall
back to a labeled placeholder when offline.

Other commands:

```bash
npm test          # unit tests (parser, true cost, insights, time zone)
npm run typecheck
npm start         # production build served by the API on port 8787
```

## Add a Google API key (real transit times)

1. In Google Cloud Console, create a project, enable **Routes API**, and create an API key.
   Restrict the key to the Routes API.
2. Copy the example env file and paste the key:
   ```bash
   cp .env.example .env
   ```
   then set `GOOGLE_MAPS_API_KEY=...` in `.env`.
3. Restart `npm run dev`. `GET /api/health` reports `"source": "google"` and the sample label disappears.

The key stays on the server. The browser only calls `/api/commute`.

## How the commute is computed

`POST /api/commute` with `{ listingId, campusId, origin, destination, arriveBy }` calls
`directions/v2:computeRoutes` with `travelMode: TRANSIT` and `arrivalTime`. The field mask
asks only for `routes.duration` and the step fields the parser reads (`server/google.ts`).

`shared/parseRoute.ts` turns the response into ordered segments:

walk to stop → wait → ride → (transfer walk → wait → ride)… → walk to building → **early arrival**

- A route has no departure field, so departure = final arrival − `routes.duration`.
- Initial wait = first transit departure − (departure + walk to stop).
- Early arrival = arrive-by − actual arrival. When the only bus that makes 8:45 lands at 8:31,
  those 14 minutes are counted.
- **Total = arrive-by − departure.** Default sort is by this total.
- Arrive-by "HH:MM" resolves to the next weekday in America/New_York, on the server.
- Results are cached in memory by listing, campus, and resolved arrive-by time (30 min).
  The API is rate limited (300 req/min per IP) and CORS allows only the dev origin by default.

Mock mode builds a Routes-API-shaped response from a simple schedule model
(`shared/mockCommute.ts`) and runs it through the same parser.

## Sample data

12 fictional listings on real Pittsburgh streets (`shared/listings.ts`). Built-in test traps:

| Trap | Listing |
|---|---|
| Closest home, slow commute (infrequent bus + transfer) | Semple St, Oakland |
| Farther home, fast direct bus | Penn Ave, Point Breeze |
| Listed 2 baths, verified 1 full + 1 half | Ellsworth Ave, Shadyside |
| Cheapest rent, high utilities | Greenfield Ave, Greenfield |
| Excellent reviews, long commute | Beechwood Blvd, Squirrel Hill |

Utility estimates use the sample factors in `shared/cost.ts` and are labeled "estimate".
Photos are Unsplash stock images with stable IDs. The "tenant" side of each before/after pair
is the same stock image with a simulated phone-camera look, and the UI says so.

Saved homes and the compare list live in `localStorage` (no accounts).
