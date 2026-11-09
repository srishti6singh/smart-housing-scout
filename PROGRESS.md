# Progress

Build order from the brief. Each finished stage is committed.

- [x] 1. Design tokens and layout shell (`tailwind.config.js`, `src/index.css`)
- [x] 2. Sample data and types (`shared/types.ts`, `shared/listings.ts`, `shared/campuses.ts`, `shared/cost.ts`)
- [x] 4a. Commute engine: Routes API parser, mock mode, Express proxy, tests (`shared/parseRoute.ts`, `shared/mockCommute.ts`, `server/`)
- [x] 3. Search page with map and cards
- [x] 5. Listing detail: Lease Time Machine, Bathroom Detective, lease terms
- [x] 6. Compare and Saved
- [x] 7. Polish pass, verified in a browser at 1440px and 375px

## Notes for resuming
- `npm test` must stay green. The sample-data trap tests in `test/insights.test.ts` fail if schedule phases in `shared/listings.ts` change.
- Commute model: ordered segments (walk, wait, ride, transfer walk, wait, ride, final walk, early arrival). Total = arrive-by minus departure.
