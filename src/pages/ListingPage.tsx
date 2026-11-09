import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCampus } from '../../shared/campuses';
import { formatDistance } from '../../shared/geo';
import { verifiedBathCount } from '../../shared/insights';
import { CompareTray } from '../components/CompareTray';
import { CommuteSection } from '../components/detail/CommuteSection';
import { BathroomDetective, LeaseTermsPanel, TenantRights } from '../components/detail/EvidenceSections';
import { Gallery } from '../components/detail/Gallery';
import { LeaseTimeMachine } from '../components/detail/LeaseTimeMachine';
import { Dialog } from '../components/Dialog';
import { IconAlert, IconChevron, IconCompare, IconHeart, IconMessage } from '../components/icons';
import { MapView } from '../components/MapView';
import { EmptyState } from '../components/states';
import { bathLabel, money } from '../lib/format';
import { MAX_COMPARE, useApp } from '../state/AppState';

export function ListingPage() {
  const { id } = useParams();
  const { viewById, saved, toggleSaved, compare, toggleCompare, campusId } = useApp();
  const [contactOpen, setContactOpen] = useState(false);
  const view = id ? viewById[id] : undefined;

  if (!view) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          title="Listing not found"
          body="This home isn’t in the sample listings. It may have been removed."
          action={<Link to="/" className="btn-primary">Back to search</Link>}
        />
      </div>
    );
  }

  const { listing, cost, flags, commute } = view;
  const campus = getCampus(campusId);
  const isSaved = saved.includes(listing.id);
  const inCompare = compare.includes(listing.id);
  const compareFull = !inCompare && compare.length >= MAX_COMPARE;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-32 pt-6 md:px-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 rounded text-sm font-medium text-ink-muted hover:text-ink">
        <IconChevron dir="left" size={16} /> All homes
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">{listing.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{listing.neighborhood} · {listing.address} · <span className="badge border border-hairline">Sample listing</span></p>
        </div>
      </div>

      <Gallery listing={listing} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-12">
          {/* Facts and claims */}
          <section aria-label="Overview" className="space-y-5 border-b border-hairline pb-8">
            <p className="num text-lg">
              {listing.beds} bedrooms · {bathLabel(verifiedBathCount(listing.bathroom))} verified · {listing.sqft.toLocaleString('en-US')} sq ft · built {listing.yearBuilt}
            </p>
            <p className="max-w-prose leading-relaxed text-ink-muted">{listing.description}</p>
            <div>
              <h2 className="mb-2 text-sm font-semibold">What the listing claims</h2>
              <ul className="flex flex-wrap gap-2">
                {listing.claims.map((c) => (
                  <li key={c} className="rounded-full border border-dashed border-ink/30 px-3 py-1 text-sm italic text-ink-muted">&ldquo;{c}&rdquo;</li>
                ))}
              </ul>
            </div>
            {flags.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold">Scout found {flags.length} {flags.length === 1 ? 'flag' : 'flags'}</h2>
                <ul className="space-y-2">
                  {flags.map((f) => (
                    <li key={f.id} className={`flex items-start gap-2 rounded-input px-3 py-2 text-sm ${f.severity === 'red' ? 'bg-mismatch-soft text-mismatch-dark' : 'bg-amber-soft text-amber-dark'}`}>
                      <IconAlert size={16} className="mt-0.5 shrink-0" /> {f.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <CommuteSection view={view} />
          <LeaseTimeMachine listing={listing} />
          <BathroomDetective listing={listing} />
          <LeaseTermsPanel listing={listing} />

          <section aria-labelledby="hood-title" className="space-y-4">
            <h2 id="hood-title" className="text-xl font-semibold">Neighborhood: {listing.neighborhood}</h2>
            <div className="h-72 overflow-hidden rounded-card border border-hairline">
              <MapView listings={[listing]} campus={campus} activeId={listing.id} interactive={false} padding={40} />
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {listing.neighborhoodNotes.map((n) => <li key={n}>{n}</li>)}
              <li>{formatDistance(view.distanceKm)} straight-line to {campus.building.name}</li>
            </ul>
          </section>

          <TenantRights />
        </div>

        {/* Sticky side panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Cost and actions">
          <div className="card space-y-5 p-6 shadow-lift">
            <div>
              <p className="text-sm text-ink-muted">Listed <span className="num font-medium text-ink">{money(listing.rent)}</span>/mo</p>
              <p className="mt-1 text-sm text-ink-muted">True monthly cost</p>
              <p className="evidence text-2xl font-medium">{money(cost.total)}</p>
              <p className="text-xs text-ink-faint">Rent + {money(cost.extra)} estimated utilities, 12-month average</p>
            </div>
            {commute.status === 'ok' && (
              <a href="#commute" className="flex items-center justify-between rounded-input bg-midnight px-4 py-3 text-sm text-white">
                <span>Door to {campus.short}</span>
                <span className="evidence">{commute.result.totalMinutes} min</span>
              </a>
            )}
            <div className="grid gap-2">
              <button type="button" onClick={() => toggleSaved(listing.id)} aria-pressed={isSaved} className="btn-primary w-full">
                <IconHeart size={16} filled={isSaved} /> {isSaved ? 'Saved' : 'Save'}
              </button>
              <button type="button" onClick={() => toggleCompare(listing.id)} aria-pressed={inCompare} disabled={compareFull} className="btn-secondary w-full">
                <IconCompare size={16} /> {inCompare ? 'Added to compare' : compareFull ? `Compare is full (${MAX_COMPARE})` : 'Compare'}
              </button>
              <button type="button" onClick={() => setContactOpen(true)} className="btn-secondary w-full">
                <IconMessage size={16} /> Contact landlord
              </button>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} title={`Contact ${listing.landlord}`}>
        <div className="space-y-4 text-sm">
          <p className="text-ink-muted">This is a sample listing, so messages aren&rsquo;t sent. Before you sign anything sight-unseen, ask for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>A live video walkthrough of every room, including each bathroom</li>
            <li>Last winter&rsquo;s utility bills</li>
            <li>The full lease, including early termination and sublease clauses</li>
          </ul>
          <button type="button" className="btn-primary w-full" onClick={() => setContactOpen(false)}>Got it</button>
        </div>
      </Dialog>
      <CompareTray />
    </div>
  );
}
