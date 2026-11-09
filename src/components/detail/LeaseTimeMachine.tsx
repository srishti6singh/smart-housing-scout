import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { computeTrueCost, UTILITY_FACTORS } from '../../../shared/cost';
import { photoUrl } from '../../../shared/listings';
import type { Listing, Season, UtilityKey } from '../../../shared/types';
import { money, monthYear, shortDate } from '../../lib/format';
import { IconCamera, IconShield, IconStar } from '../icons';
import { Img } from '../Img';

type Tab = 'photos' | 'cost' | 'tenants';
const TABS: { id: Tab; label: string }[] = [
  { id: 'photos', label: 'Real photos' },
  { id: 'cost', label: 'True monthly cost' },
  { id: 'tenants', label: 'Past tenants' },
];

// Simulated phone-camera look for the illustrative "unstaged" side of each pair.
const PHONE_LOOK = 'saturate(0.7) contrast(0.88) brightness(0.9) sepia(0.12)';

export function LeaseTimeMachine({ listing }: { listing: Listing }) {
  const [tab, setTab] = useState<Tab>('photos');
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <section id="time-machine" aria-labelledby="ltm-title" className="space-y-5">
      <div>
        <p className="eyebrow text-scout-dark">Lease Time Machine</p>
        <h2 id="ltm-title" className="mt-1 text-xl font-semibold">What the listing doesn&rsquo;t show</h2>
      </div>
      <div role="tablist" aria-label="Lease Time Machine" className="inline-flex rounded-full border border-hairline bg-white p-1">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => (refs.current[i] = el)}
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-midnight text-white' : 'text-ink-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel-${tab}`} aria-labelledby={`${base}-tab-${tab}`} tabIndex={0} className="focus-visible:outline-offset-4">
        {tab === 'photos' && <RealPhotos listing={listing} />}
        {tab === 'cost' && <TrueCost listing={listing} />}
        {tab === 'tenants' && <PastTenants listing={listing} />}
      </div>
    </section>
  );
}

/* ---------- Real photos ---------- */

function BeforeAfter({ before, after, room, date }: { before: string; after: string; room: string; date: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-img bg-hairline">
        <Img src={photoUrl(after, 1000)} alt={`${room}, tenant photo`} room={room} style={{ filter: PHONE_LOOK }} />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <Img src={photoUrl(before, 1000)} alt={`${room}, listing photo`} room={room} />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} aria-hidden>
          <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs font-semibold text-ink shadow-lift">⇆</span>
        </div>
        <span className="badge absolute left-3 top-3 bg-white/95 text-ink">Listing photo</span>
        <span className="badge absolute right-3 top-3 bg-midnight text-white">Tenant photo · {shortDate(date)}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`Compare listing photo and tenant photo of the ${room.toLowerCase()}`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <p className="text-xs text-ink-faint">Drag, or use the arrow keys, to compare.</p>
    </div>
  );
}

function RealPhotos({ listing }: { listing: Listing }) {
  const pairs = listing.tenantPhotos.filter((t) => t.pairsWith);
  const [pairId, setPairId] = useState(pairs[0]?.id);
  const pair = pairs.find((p) => p.id === pairId) ?? pairs[0];
  const listingPhoto = listing.photos.find((p) => p.id === pair?.pairsWith);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-input border border-scout/30 bg-scout-soft p-4 text-sm">
        <IconShield size={18} className="mt-0.5 shrink-0 text-scout-dark" />
        <div>
          <p className="font-semibold text-ink">Unstaged photos from past tenants. Not edited, filtered, or AI-generated.</p>
          <p className="mt-1 text-ink-muted">
            Sample data: these are stock photos. The &ldquo;tenant&rdquo; side of each pair is the same stock image with a simulated phone-camera look, to show how the comparison works. Real tenant uploads would replace them.
          </p>
        </div>
      </div>

      {pair && listingPhoto && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Room to compare">
            {pairs.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={p.id === pair.id} onClick={() => setPairId(p.id)} className={`pill ${p.id === pair.id ? 'pill-active' : ''}`}>
                {p.room}
              </button>
            ))}
          </div>
          <BeforeAfter key={pair.id} before={listingPhoto.url} after={pair.url} room={pair.room} date={pair.date} />
        </div>
      )}

      <div>
        <h3 className="mb-3 text-base font-semibold">All tenant photos</h3>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {listing.tenantPhotos.map((t) => (
            <li key={t.id}>
              <div className="aspect-square overflow-hidden rounded-img bg-hairline">
                <Img src={photoUrl(t.url, 480)} alt={`${t.room}, ${t.angle}, tenant photo`} room={t.room} loading="lazy" style={{ filter: PHONE_LOOK }} />
              </div>
              <p className="mt-2 text-sm font-medium">{t.room}</p>
              <p className="text-xs text-ink-muted">
                <IconCamera size={12} className="mr-1 inline" />
                {t.angle} · {shortDate(t.date)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- True monthly cost ---------- */

const COST_COLORS: Record<'rent' | UtilityKey, string> = {
  rent: '#0B1B2B',
  electricity: '#F5A524',
  gas: '#E07B00',
  water: '#2F6FED',
  internet: '#0B7F7F',
  insurance: '#8E9AA8',
};

const SEASONS: { id: Season; label: string }[] = [
  { id: 'average', label: '12-month average' },
  { id: 'winter', label: 'Winter' },
  { id: 'summer', label: 'Summer' },
];

export function TrueCost({ listing }: { listing: Listing }) {
  const [season, setSeason] = useState<Season>('average');
  const [override, setOverride] = useState<Partial<Record<UtilityKey, boolean>>>({});
  const cost = computeTrueCost(listing, season, override);
  const paid = cost.items.filter((i) => !i.included);

  return (
    <div className="space-y-6">
      <p className="text-xl font-semibold leading-snug">
        Listed <span className="evidence">{money(cost.rent)}</span>. True monthly cost{' '}
        <span className="evidence text-scout-dark">{money(cost.total)}</span>.
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Season">
        {SEASONS.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={season === s.id} onClick={() => setSeason(s.id)} className={`pill ${season === s.id ? 'pill-active' : ''}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div>
        <div
          role="img"
          aria-label={`Rent ${money(cost.rent)}${paid.map((i) => `, ${i.label} ${money(i.amount)}`).join('')}. Total ${money(cost.total)}.`}
          className="flex h-6 w-full gap-[2px] overflow-hidden rounded-full"
        >
          <div style={{ flexGrow: cost.rent, background: COST_COLORS.rent }} />
          {paid.map((i) => (
            <div key={i.key} style={{ flexGrow: i.amount, minWidth: 4, background: COST_COLORS[i.key] }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
          <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: COST_COLORS.rent }} />Rent</li>
          {paid.map((i) => (
            <li key={i.key} className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: COST_COLORS[i.key] }} />{i.label}</li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Monthly cost breakdown</caption>
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">Based on</th>
              <th className="py-2 text-right font-medium">Per month</th>
              <th className="py-2 pl-4 text-right font-medium">Included in rent</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-hairline">
              <td className="py-3 font-medium">Rent</td>
              <td className="py-3 text-ink-muted">Listing price</td>
              <td className="evidence py-3 text-right">{money(cost.rent)}</td>
              <td />
            </tr>
            {cost.items.map((i) => (
              <tr key={i.key} className="border-b border-hairline">
                <td className="py-3 font-medium">
                  {i.label} <span className="badge ml-1 bg-amber-soft text-amber-dark">estimate</span>
                </td>
                <td className="py-3 text-ink-muted">{i.basis}</td>
                <td className={`evidence py-3 text-right ${i.included ? 'text-ink-faint line-through' : ''}`}>{money(i.amount)}</td>
                <td className="py-3 pl-4 text-right">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={i.included}
                    aria-label={`${i.label} included in rent`}
                    onClick={() => setOverride({ ...override, [i.key]: !i.included })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${i.included ? 'bg-scout-dark' : 'bg-[#C3CCD6]'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${i.included ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-3 font-semibold">True monthly cost</td>
              <td className="py-3 text-ink-muted">Rent + utilities you pay</td>
              <td className="evidence py-3 text-right font-semibold text-scout-dark">{money(cost.total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="max-w-prose text-xs text-ink-faint">
        Estimates use sample factors, not utility quotes: electricity ${UTILITY_FACTORS.electricity.winter}–${UTILITY_FACTORS.electricity.summer} per sq ft,
        gas heat ${UTILITY_FACTORS.gas.summer}–${UTILITY_FACTORS.gas.winter} per sq ft by season, water ${UTILITY_FACTORS.water.base} + ${UTILITY_FACTORS.water.perBedroom} per bedroom,
        internet ${UTILITY_FACTORS.internet}, insurance ${UTILITY_FACTORS.insurance}. Drafty buildings ×{UTILITY_FACTORS.efficiency.drafty} on heating. Toggles show what changes if the landlord includes a utility.
      </p>
    </div>
  );
}

/* ---------- Past tenants ---------- */

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex text-ink" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar key={n} size={14} filled={n <= Math.round(value)} />
      ))}
    </span>
  );
}

function PastTenants({ listing }: { listing: Listing }) {
  const r = listing.ratings;
  const overall = Math.round(((r.responsiveness + r.maintenance + r.noise + r.heating) / 4) * 10) / 10;
  const cats: [string, number][] = [
    ['Landlord responsiveness', r.responsiveness],
    ['Maintenance', r.maintenance],
    ['Noise (5 = quiet)', r.noise],
    ['Winter heating', r.heating],
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div>
          <p className="evidence text-2xl font-medium">{overall.toFixed(1)}</p>
          <Stars value={overall} />
          <p className="mt-1 text-sm text-ink-muted">{listing.reviews.length} verified tenants</p>
        </div>
        <dl className="space-y-3">
          {cats.map(([label, v]) => (
            <div key={label} className="grid grid-cols-[1fr_120px_32px] items-center gap-3 text-sm">
              <dt>{label}</dt>
              <dd className="h-1.5 overflow-hidden rounded-full bg-hairline">
                <div className={`h-full rounded-full ${v < 3 ? 'bg-amber' : 'bg-midnight'}`} style={{ width: `${(v / 5) * 100}%` }} />
              </dd>
              <dd className="evidence text-right">{v.toFixed(1)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {listing.reviews.map((rev) => (
          <li key={rev.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{rev.author}</p>
                <p className="text-xs text-ink-muted">
                  Lived here {monthYear(rev.tenancyFrom)} – {monthYear(rev.tenancyTo)}
                </p>
              </div>
              {rev.verified && (
                <span className="badge shrink-0 bg-scout-soft text-scout-dark">
                  <IconShield size={12} /> Verified tenant
                </span>
              )}
            </div>
            <div className="mt-2"><Stars value={rev.rating} /></div>
            <p className="mt-2 max-w-prose text-sm leading-relaxed">{rev.text}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-faint">Sample reviews. In production, tenancy is verified against a lease or utility bill before a review is published.</p>
    </div>
  );
}
