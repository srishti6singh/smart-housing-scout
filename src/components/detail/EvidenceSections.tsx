import { bathMismatch, bathMismatchText, describeBaths, leaseFlexibility, verifiedBathCount } from '../../../shared/insights';
import type { Listing } from '../../../shared/types';
import { money, shortDate } from '../../lib/format';
import { IconAlert, IconBath, IconCheck, IconChevron } from '../icons';

export function BathroomDetective({ listing }: { listing: Listing }) {
  const b = listing.bathroom;
  const mismatch = bathMismatch(b);
  return (
    <section id="baths" aria-labelledby="baths-title" className="space-y-4">
      <div>
        <p className="eyebrow text-scout-dark">Bathroom Detective</p>
        <h2 id="baths-title" className="mt-1 text-xl font-semibold">Listed baths vs. verified baths</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-ink-muted">Listing says</p>
          <p className="mt-1 text-xl font-semibold">{b.listed} {b.listed === 1 ? 'bath' : 'baths'}</p>
        </div>
        <div className={`rounded-card border p-5 ${mismatch ? 'border-mismatch/40 bg-mismatch-soft' : 'border-scout/30 bg-scout-soft'}`}>
          <p className="flex items-center gap-1.5 text-sm text-ink-muted"><IconBath size={14} /> Verified</p>
          <p className="evidence mt-1 text-xl font-medium">{describeBaths(b)} <span className="text-base text-ink-muted">({verifiedBathCount(b)})</span></p>
        </div>
      </div>
      {mismatch ? (
        <p role="note" className="flex items-start gap-2 rounded-input bg-mismatch px-4 py-3 text-sm font-medium text-white">
          <IconAlert size={18} className="mt-0.5 shrink-0" /> Mismatch. {bathMismatchText(b)}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-scout-dark"><IconCheck size={16} /> Matches the listing.</p>
      )}
      <p className="text-xs text-ink-faint">Checked by: {b.method}, {shortDate(b.verifiedOn)}. Full bath = toilet, sink, and shower or tub. Half bath = toilet and sink.</p>
    </section>
  );
}

export function LeaseTermsPanel({ listing }: { listing: Listing }) {
  const l = listing.lease;
  const flex = leaseFlexibility(l);
  const rows: [string, string][] = [
    ['Lease length', l.lengthsMonths.map((m) => `${m} months`).join(' or ')],
    ['Security deposit', money(l.deposit)],
    ['Early termination', l.earlyTermination ?? 'Not stated in lease'],
    ['Sublease', l.sublease === 'yes' ? 'Allowed' : l.sublease === 'no' ? 'Not allowed' : 'Allowed with landlord approval'],
    ['Notice to move out', `${l.noticeDays} days`],
    ['Available from', shortDate(l.availableFrom)],
  ];
  return (
    <section id="lease" aria-labelledby="lease-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="lease-title" className="text-xl font-semibold">Lease terms</h2>
        <p className="text-sm text-ink-muted">Flexibility <span className="evidence text-ink">{flex.score} of {flex.max}</span></p>
      </div>
      <dl className="card divide-y divide-hairline">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,180px)_1fr] gap-4 px-5 py-3 text-sm">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const RIGHTS: [string, string][] = [
  ['Security deposits', 'Most places limit how long a landlord can hold a deposit after you move out and require a written list of any deductions. Ask the landlord, in writing, how and when the deposit is returned. Take dated photos on move-in and move-out day.'],
  ['Repairs and safe housing', 'Rentals are generally expected to be safe and livable, with working heat, water, and electricity. Report problems in writing and keep a copy. Do not stop paying rent on your own; ask for local advice first.'],
  ['Landlord entry', 'Landlords usually must give reasonable notice before entering, except in emergencies. Your lease may set the notice period. Check it before you sign.'],
  ['Ending a lease early', 'Read the early termination and sublease clauses before signing. Get any agreement to end early or to sublet in writing, signed by the landlord.'],
  ['Discrimination', 'Federal fair housing law prohibits housing discrimination based on race, color, religion, sex, national origin, familial status, or disability. Some state and local rules protect more groups.'],
  ['Where to get help', 'Your university’s off-campus housing office and international student office can review a lease with you. Local legal aid organizations offer free tenant advice.'],
];

export function TenantRights() {
  return (
    <section id="rights" aria-labelledby="rights-title" className="space-y-4">
      <div>
        <h2 id="rights-title" className="text-xl font-semibold">Tenant basics</h2>
        <p className="mt-1 text-sm text-ink-muted">General information, not legal advice. Rules differ by state and city; confirm with a local source.</p>
      </div>
      <div className="card divide-y divide-hairline">
        {RIGHTS.map(([q, a]) => (
          <details key={q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium marker:hidden">
              {q}
              <span className="transition-transform group-open:rotate-180"><IconChevron dir="down" size={16} /></span>
            </summary>
            <p className="max-w-prose px-5 pb-4 text-sm leading-relaxed text-ink-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
