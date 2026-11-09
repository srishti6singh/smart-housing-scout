import { getCampus } from '../../../shared/campuses';
import { formatDistance } from '../../../shared/geo';
import { formatClock } from '../../../shared/time';
import type { CommuteResult, JourneySegment } from '../../../shared/types';
import { useApp, type ListingView } from '../../state/AppState';
import { ArriveByPicker, CampusPicker } from '../Header';
import { IconBus, IconClock, IconWalk } from '../icons';
import { JourneyBar, JourneyLegend, SEGMENT_STYLE, commuteSummary } from '../JourneyBar';
import { ErrorBanner, SampleLabel } from '../states';

function StepIcon({ s }: { s: JourneySegment }) {
  const cls = `grid h-8 w-8 shrink-0 place-items-center rounded-full ${SEGMENT_STYLE[s.kind].bg} ${SEGMENT_STYLE[s.kind].text}`;
  if (s.kind === 'ride') return <span className={cls}><IconBus size={16} /></span>;
  if (s.kind === 'wait' || s.kind === 'early') return <span className={cls}><IconClock size={16} /></span>;
  return <span className={cls}><IconWalk size={16} /></span>;
}

function stepText(s: JourneySegment, buildingName: string): { title: string; detail?: string } {
  switch (s.kind) {
    case 'walk':
      return { title: `Walk ${s.minutes} min`, detail: s.to ? `to ${s.to}` : undefined };
    case 'transferWalk':
      return { title: `Transfer: walk ${s.minutes} min`, detail: s.to ? `to ${s.to}` : undefined };
    case 'wait':
      return { title: `Wait ${s.minutes} min`, detail: 'at the stop' };
    case 'ride':
      return {
        title: `Ride the ${s.line}${s.headsign ? ` toward ${s.headsign}` : ''}`,
        detail: `${s.minutes} min${s.stopCount ? `, ${s.stopCount} stops` : ''}${s.to ? `. Get off at ${s.to}` : ''}`,
      };
    case 'finalWalk':
      return { title: `Walk ${s.minutes} min`, detail: `to ${buildingName}` };
    case 'early':
      return { title: `Arrive ${s.minutes} min early`, detail: 'The next bus would be late. This time is lost every day.' };
  }
}

function Steps({ r, buildingName }: { r: CommuteResult; buildingName: string }) {
  return (
    <ol className="space-y-0">
      <li className="flex gap-3 pb-3">
        <span className="evidence w-[68px] shrink-0 pt-1.5 text-right text-sm text-white/70">{formatClock(r.departAt)}</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-white/60" aria-hidden />
        <p className="pt-1 text-sm font-medium">Leave home</p>
      </li>
      {r.segments.map((s, i) => {
        const t = stepText(s, buildingName);
        return (
          <li key={i} className="flex gap-3 pb-3">
            <span className="evidence w-[68px] shrink-0 pt-1.5 text-right text-sm text-white/70">{formatClock(s.startsAt)}</span>
            <StepIcon s={s} />
            <div className="pt-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.detail && <p className="text-sm text-white/70">{t.detail}</p>}
            </div>
          </li>
        );
      })}
      <li className="flex gap-3">
        <span className="evidence w-[68px] shrink-0 pt-1.5 text-right text-sm text-white/70">{formatClock(r.arriveBy)}</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-scout text-white" aria-hidden>
          ✓
        </span>
        <p className="pt-1 text-sm font-medium">Class starts at {buildingName}</p>
      </li>
    </ol>
  );
}

export function CommuteSection({ view }: { view: ListingView }) {
  const { campusId, commuteSource, commuteError, retryCommutes } = useApp();
  const campus = getCampus(campusId);
  const { commute, insight, listing } = view;

  return (
    <section id="commute" aria-labelledby="commute-title" className="evidence-panel overflow-hidden">
      <div className="space-y-5 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[#8DDDD5]">Commute Truth-Teller</p>
            <h2 id="commute-title" className="mt-1 text-xl font-semibold">
              True door-to-campus time
            </h2>
          </div>
          {commuteSource === 'sample' && <SampleLabel dark />}
        </div>

        <div className="flex flex-wrap gap-2">
          <CampusPicker dark id="campus-detail" />
          <ArriveByPicker dark id="arrive-by-detail" />
        </div>

        {commute.status === 'loading' && (
          <div className="space-y-3" aria-label="Loading commute">
            <div className="h-10 w-48 animate-pulse rounded-full bg-white/10" />
            <div className="h-9 w-full animate-pulse rounded-full bg-white/10" />
          </div>
        )}
        {commute.status === 'error' && <ErrorBanner message={commuteError ?? commute.error} onRetry={retryCommutes} />}
        {commute.status === 'ok' && (
          <>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <p>
                <span className="evidence text-2xl font-medium">{commute.result.totalMinutes}</span>
                <span className="ml-2 text-base text-white/80">min door to {campus.building.name}</span>
              </p>
              <p className="pb-2 text-sm text-white/70">
                {formatDistance(view.distanceKm)} straight-line · {commuteSummary(commute.result)}
              </p>
            </div>
            <JourneyBar result={commute.result} />
            <JourneyLegend result={commute.result} dark />

            {(insight || commute.result.earlyArrival >= 5) && (
              <div className="space-y-1 rounded-input bg-white/5 p-4 text-sm">
                {insight && (
                  <p className={insight.kind === 'closerButSlower' ? 'text-amber' : 'text-[#8DDDD5]'}>{insight.text}.</p>
                )}
                {commute.result.earlyArrival >= 5 && (
                  <p className="text-white/80">
                    The latest trip that makes {formatClock(commute.result.arriveBy)} gets you there at{' '}
                    <span className="evidence text-white">{formatClock(commute.result.arriveAt)}</span>, so{' '}
                    <span className="evidence text-amber">{commute.result.earlyArrival} min</span> of every trip is spent waiting on campus.
                  </p>
                )}
              </div>
            )}

            <details className="group rounded-input border border-white/10">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:hidden">
                <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>
                  ›
                </span>{' '}
                Step-by-step trip
              </summary>
              <div className="px-4 pb-4 pt-1">
                <Steps r={commute.result} buildingName={campus.building.name} />
              </div>
            </details>
            <p className="text-xs text-white/60">
              Total = arrive-by time minus the time you leave home. It includes early arrival, because that time is spent commuting too.
              {listing.claims.some((c) => /walk|commute/i.test(c)) && (
                <> The listing says &ldquo;{listing.claims.find((c) => /walk|commute/i.test(c))}&rdquo;.</>
              )}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
