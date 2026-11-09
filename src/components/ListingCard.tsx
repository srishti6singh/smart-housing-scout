import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { formatDistance } from '../../shared/geo';
import { bathMismatch, describeBaths, verifiedBathCount } from '../../shared/insights';
import { photoUrl } from '../../shared/listings';
import type { ListingPhoto } from '../../shared/types';
import { bathLabel, money } from '../lib/format';
import { useApp, type ListingView } from '../state/AppState';
import { IconAlert, IconCamera, IconCheck, IconChevron, IconHeart } from './icons';
import { JourneyBar, commuteSummary } from './JourneyBar';
import { Img } from './Img';

export function SaveButton({ id, label, className = '' }: { id: string; label: string; className?: string }) {
  const { saved, toggleSaved } = useApp();
  const isSaved = saved.includes(id);
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${label} from saved homes` : `Save ${label}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isSaved) setPop(true);
        toggleSaved(id);
      }}
      onAnimationEnd={() => setPop(false)}
      className={`grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-lift backdrop-blur transition-colors hover:bg-white ${className}`}
    >
      <IconHeart
        size={20}
        filled={isSaved}
        className={`${isSaved ? 'text-mismatch' : 'text-ink'} ${pop ? 'motion-safe:animate-pop' : ''}`}
      />
    </button>
  );
}

export function Carousel({ photos, title, rounded = 'rounded-img' }: { photos: ListingPhoto[]; title: string; rounded?: string }) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  };
  const dots = Math.min(count, 5);
  return (
    <div
      className={`group/carousel relative aspect-[4/3] overflow-hidden ${rounded} bg-hairline`}
      role="group"
      aria-roledescription="carousel"
      aria-label={`Photos of ${title}`}
      onKeyDown={onKey}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {photos.map((p, i) => (
          <div key={p.id} className="h-full w-full shrink-0" aria-hidden={i !== index}>
            <Img src={photoUrl(p.url, 640)} alt={p.alt} room={p.room} loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        Photo {index + 1} of {count}: {photos[index]?.room}
      </span>
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-lift transition-opacity focus-visible:opacity-100 group-hover/carousel:opacity-100"
          >
            <IconChevron dir="left" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-lift transition-opacity focus-visible:opacity-100 group-hover/carousel:opacity-100"
          >
            <IconChevron dir="right" />
          </button>
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
            {Array.from({ length: dots }).map((_, i) => {
              const active = Math.min(index, dots - 1) === i;
              return <span key={i} className={`h-1.5 rounded-full bg-white transition-all ${active ? 'w-4 opacity-100' : 'w-1.5 opacity-60'}`} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface CardProps {
  view: ListingView;
  active?: boolean;
  onHover?: (id: string | null) => void;
  compact?: boolean;
}

export function ListingCard({ view, active, onHover, compact }: CardProps) {
  const { listing, commute, cost, insight, distanceKm } = view;
  const mismatch = bathMismatch(listing.bathroom);
  const verifiedBaths = verifiedBathCount(listing.bathroom);
  const extraPct = cost.extra / cost.rent;

  return (
    <article
      id={`card-${listing.id}`}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(listing.id)}
      className={`group relative rounded-card p-2 transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-white hover:shadow-lift ${
        active ? 'bg-white shadow-lift ring-2 ring-ink' : ''
      }`}
    >
      <div className="relative">
        <Carousel photos={listing.photos} title={listing.title} />
        <SaveButton id={listing.id} label={listing.street} className="absolute right-3 top-3 z-10" />
        {listing.tenantPhotos.length > 0 && !compact && (
          <span className="badge absolute left-3 top-3 z-10 bg-white/95 text-ink shadow-lift">
            <IconCamera size={12} /> Unstaged photos
          </span>
        )}
      </div>

      <div className="space-y-2 px-1 pb-1 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="num text-lg font-semibold">
            {money(listing.rent)}
            <span className="text-sm font-normal text-ink-muted">/mo</span>
          </p>
          <p className="text-sm text-ink-muted">
            True cost <span className="evidence font-medium text-ink">{money(cost.total)}</span>
          </p>
        </div>

        <p className="num text-sm text-ink">
          {listing.beds} bd · {bathLabel(verifiedBaths)} · {listing.sqft.toLocaleString('en-US')} sq ft
        </p>
        <h3 className="text-sm font-normal text-ink-muted">
          <Link
            to={`/listing/${listing.id}`}
            className="after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-[3px] focus-visible:after:outline-offset-2 focus-visible:after:outline-transit"
          >
            {listing.address.replace(', Pittsburgh, PA', ',')}
          </Link>
        </h3>

        {/* Commute Truth-Teller */}
        <div className="space-y-1.5 pt-1">
          {commute.status === 'loading' && <div className="skeleton h-6 w-40 rounded-full" aria-label="Loading commute" />}
          {commute.status === 'error' && (
            <p className="text-xs text-mismatch-dark">Commute unavailable</p>
          )}
          {commute.status === 'ok' && (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-midnight px-3 py-1 text-xs font-medium text-white">
                  <span className="evidence text-sm">{commute.result.totalMinutes} min</span> door to campus
                </span>
                <span className="text-xs text-ink-faint">{formatDistance(distanceKm)} away</span>
              </div>
              <JourneyBar result={commute.result} size="mini" />
              <p className="text-xs text-ink-muted">{commuteSummary(commute.result)}</p>
              {insight && (
                <p className={`text-xs font-medium ${insight.kind === 'closerButSlower' ? 'text-amber-dark' : 'text-scout-dark'}`}>
                  {insight.text}
                </p>
              )}
            </>
          )}
        </div>

        {!compact && (
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Verification">
            {mismatch ? (
              <li className="badge bg-mismatch-soft text-mismatch-dark">
                <IconAlert size={12} /> Baths: {listing.bathroom.listed} listed, {describeBaths(listing.bathroom)}
              </li>
            ) : (
              <li className="badge bg-scout-soft text-scout-dark">
                <IconCheck size={12} /> Baths verified
              </li>
            )}
            <li className={`badge ${extraPct >= 0.2 ? 'bg-amber-soft text-amber-dark' : 'bg-mist text-ink-muted'}`}>
              True cost <span className="evidence">+{money(cost.extra)}</span>
            </li>
          </ul>
        )}
      </div>
    </article>
  );
}
