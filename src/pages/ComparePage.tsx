import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { bathMismatch, describeBaths, leaseFlexibility, verifiedBathCount } from '../../shared/insights';
import { photoUrl } from '../../shared/listings';
import { IconX } from '../components/icons';
import { Img } from '../components/Img';
import { JourneyBar } from '../components/JourneyBar';
import { EmptyState, SampleLabel } from '../components/states';
import { money } from '../lib/format';
import { commuteMinutes, useApp, type ListingView } from '../state/AppState';

interface Row {
  label: string;
  rule: string;
  /** Numeric score; null = no data. */
  score: (v: ListingView) => number | null;
  better: 'low' | 'high';
  render: (v: ListingView, maxCommute: number) => ReactNode;
}

const ROWS: Row[] = [
  {
    label: 'True commute',
    rule: 'Lowest wins',
    score: commuteMinutes,
    better: 'low',
    render: (v, max) =>
      v.commute.status === 'ok' ? (
        <div className="space-y-2">
          <p className="evidence text-lg">{v.commute.result.totalMinutes} min</p>
          <JourneyBar result={v.commute.result} size="mini" scaleTo={max} animate={false} />
          <p className="text-xs text-ink-muted">{v.commute.result.lines.join(' → ')}{v.commute.result.earlyArrival ? ` · ${v.commute.result.earlyArrival} min early` : ''}</p>
        </div>
      ) : (
        <span className="text-sm text-ink-faint">{v.commute.status === 'loading' ? 'Loading…' : 'Unavailable'}</span>
      ),
  },
  {
    label: 'True monthly cost',
    rule: 'Lowest wins',
    score: (v) => v.cost.total,
    better: 'low',
    render: (v) => (
      <div>
        <p className="evidence text-lg">{money(v.cost.total)}</p>
        <p className="text-xs text-ink-muted">Rent {money(v.listing.rent)} + {money(v.cost.extra)}</p>
      </div>
    ),
  },
  {
    label: 'Baths, listed vs verified',
    rule: 'Most verified baths with no mismatch',
    score: (v) => (bathMismatch(v.listing.bathroom) ? 0 : verifiedBathCount(v.listing.bathroom)),
    better: 'high',
    render: (v) => (
      <div className="text-sm">
        <p>Listed {v.listing.bathroom.listed}</p>
        <p className={bathMismatch(v.listing.bathroom) ? 'font-medium text-mismatch-dark' : 'text-ink'}>
          Verified <span className="evidence">{describeBaths(v.listing.bathroom)}</span>
          {bathMismatch(v.listing.bathroom) && ' · mismatch'}
        </p>
      </div>
    ),
  },
  {
    label: 'Lease flexibility',
    rule: 'Highest wins',
    score: (v) => leaseFlexibility(v.listing.lease).score,
    better: 'high',
    render: (v) => {
      const f = leaseFlexibility(v.listing.lease);
      return (
        <div>
          <p className="evidence text-lg">{f.score} of {f.max}</p>
          <p className="text-xs text-ink-muted">{f.reasons.join(', ') || 'Fixed 12-month lease'}</p>
        </div>
      );
    },
  },
  {
    label: 'Tenant rating',
    rule: 'Highest wins',
    score: (v) => v.rating,
    better: 'high',
    render: (v) => <p className="evidence text-lg">{v.rating.toFixed(1)} <span className="text-sm text-ink-muted">/ 5</span></p>,
  },
  {
    label: 'Flags',
    rule: 'Fewest wins',
    score: (v) => v.flags.length,
    better: 'low',
    render: (v) => (
      <div>
        <p className="evidence text-lg">{v.flags.length}</p>
        <ul className="mt-1 space-y-1 text-xs text-ink-muted">
          {v.flags.map((f) => <li key={f.id} className={f.severity === 'red' ? 'text-mismatch-dark' : ''}>{f.label}</li>)}
        </ul>
      </div>
    ),
  },
];

export function ComparePage() {
  const { compare, viewById, toggleCompare, commuteSource } = useApp();
  const views = compare.map((id) => viewById[id]).filter(Boolean);

  if (views.length < 2) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          title={views.length === 0 ? 'Nothing to compare yet' : 'Add one more home'}
          body="Open a home and choose Compare. You can compare 2 to 4 homes side by side."
          action={<Link to="/" className="btn-primary">Browse homes</Link>}
        />
      </div>
    );
  }

  const maxCommute = Math.max(...views.map((v) => commuteMinutes(v) ?? 0), 1);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Compare {views.length} homes</h1>
          <p className="text-sm text-ink-muted">The best value in each row is highlighted in green.</p>
        </div>
        {commuteSource === 'sample' && <SampleLabel />}
      </div>
      <div className="overflow-x-auto rounded-card border border-hairline bg-white">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <caption className="sr-only">Homes compared by commute, cost, baths, lease, rating, and flags</caption>
          <thead>
            <tr>
              <th scope="col" className="w-48 p-4 align-bottom text-sm font-medium text-ink-muted">Home</th>
              {views.map((v) => (
                <th key={v.listing.id} scope="col" className="p-4 align-top font-normal">
                  <div className="relative">
                    <div className="aspect-[4/3] overflow-hidden rounded-img">
                      <Img src={photoUrl(v.listing.photos[0].url, 400)} alt="" room="Exterior" />
                    </div>
                    <button type="button" onClick={() => toggleCompare(v.listing.id)} aria-label={`Remove ${v.listing.street} from compare`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-lift">
                      <IconX size={14} />
                    </button>
                  </div>
                  <Link to={`/listing/${v.listing.id}`} className="mt-3 block text-sm font-semibold hover:underline">{v.listing.street}</Link>
                  <p className="text-xs text-ink-muted">{v.listing.neighborhood} · {v.listing.beds} bd · {money(v.listing.rent)}/mo</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const scores = views.map(row.score);
              const valid = scores.filter((s): s is number => s !== null);
              const best = valid.length ? (row.better === 'low' ? Math.min(...valid) : Math.max(...valid)) : null;
              return (
                <tr key={row.label} className="border-t border-hairline">
                  <th scope="row" className="p-4 align-top">
                    <span className="block text-sm font-semibold">{row.label}</span>
                    <span className="text-xs font-normal text-ink-faint">{row.rule}</span>
                  </th>
                  {views.map((v, i) => {
                    const isBest = best !== null && scores[i] === best;
                    return (
                      <td key={v.listing.id} className={`p-4 align-top ${isBest ? 'bg-scout-soft' : ''}`}>
                        {isBest && <span className="badge mb-2 bg-scout-dark text-white">Best</span>}
                        {row.render(v, maxCommute)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
