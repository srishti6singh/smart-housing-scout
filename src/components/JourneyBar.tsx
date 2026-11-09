import type { CommuteResult, JourneySegment, SegmentKind } from '../../shared/types';
import { formatClock } from '../../shared/time';

export const SEGMENT_STYLE: Record<SegmentKind, { label: string; bg: string; text: string }> = {
  walk: { label: 'Walk to stop', bg: 'bg-seg-walk', text: 'text-white' },
  wait: { label: 'Wait', bg: 'bg-seg-wait', text: 'text-ink' },
  ride: { label: 'Ride', bg: 'bg-seg-ride', text: 'text-white' },
  transferWalk: { label: 'Transfer walk', bg: 'bg-seg-walk', text: 'text-white' },
  finalWalk: { label: 'Walk to building', bg: 'bg-seg-final', text: 'text-ink' },
  early: { label: 'Early arrival', bg: 'seg-early', text: 'text-ink' },
};

export function describeSegment(s: JourneySegment): string {
  switch (s.kind) {
    case 'ride':
      return `ride ${s.line ?? ''} ${s.minutes} min`.replace('  ', ' ');
    case 'early':
      return `arrive ${s.minutes} min early`;
    default:
      return `${SEGMENT_STYLE[s.kind].label.toLowerCase()} ${s.minutes} min`;
  }
}

export function journeyAriaLabel(r: CommuteResult): string {
  return `${r.totalMinutes} minutes door to campus: ${r.segments.map(describeSegment).join(', ')}.`;
}

interface Props {
  result: CommuteResult;
  size?: 'mini' | 'full';
  /** Scale the bar against this many minutes (to compare homes side by side). */
  scaleTo?: number;
  animate?: boolean;
}

/**
 * Proportional Journey Bar. Segment widths are scaled to minutes; every
 * segment keeps a minimum width so a 1-minute wait is still visible.
 */
export function JourneyBar({ result, size = 'full', scaleTo, animate = true }: Props) {
  const total = Math.max(result.totalMinutes, 1);
  const scale = scaleTo ? Math.min(1, total / scaleTo) : 1;
  const full = size === 'full';
  const height = full ? 'h-9' : 'h-2';
  const minWidth = full ? 10 : 3;

  return (
    <div className="w-full" style={{ width: `${scale * 100}%` }}>
      <div
        role="img"
        aria-label={journeyAriaLabel(result)}
        className={`flex ${height} w-full gap-[2px] overflow-hidden rounded-full`}
      >
        {result.segments.map((s, i) => {
          const st = SEGMENT_STYLE[s.kind];
          const pct = (s.minutes / total) * 100;
          const showLabel = full && pct >= 7;
          return (
            <div
              key={i}
              className={`${st.bg} ${st.text} flex items-center justify-center overflow-hidden ${animate ? 'origin-left motion-safe:animate-grow' : ''}`}
              style={{ flexGrow: s.minutes, flexBasis: 0, minWidth, animationDelay: animate ? `${i * 60}ms` : undefined }}
              title={`${st.label}${s.line ? ` (${s.line})` : ''}: ${s.minutes} min`}
            >
              {showLabel && (
                <span className="evidence whitespace-nowrap px-1 text-xs font-medium">
                  {s.kind === 'ride' && s.line ? `${s.line} · ` : ''}
                  {s.minutes}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Legend with minutes so color is never the only cue. */
export function JourneyLegend({ result, dark = false }: { result: CommuteResult; dark?: boolean }) {
  const rows: { kind: SegmentKind; label: string; minutes: number }[] = [
    { kind: 'walk', label: 'Walk to stop', minutes: result.walkToStop + result.transferWalk },
    { kind: 'wait', label: 'Wait', minutes: result.wait },
    { kind: 'ride', label: 'Ride', minutes: result.ride },
    { kind: 'finalWalk', label: 'Walk to building', minutes: result.walkToBuilding },
    { kind: 'early', label: 'Early arrival', minutes: result.earlyArrival },
  ];
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-sm ${dark ? 'text-white/80' : 'text-ink-muted'}`}>
      {rows
        .filter((r) => r.minutes > 0 || r.kind !== 'early')
        .map((r) => (
          <li key={r.kind} className="flex items-center gap-2">
            <span className={`inline-block h-3 w-3 rounded-sm ${SEGMENT_STYLE[r.kind].bg}`} aria-hidden />
            <span>{r.label}</span>
            <span className={`evidence ${dark ? 'text-white' : 'text-ink'}`}>{r.minutes} min</span>
          </li>
        ))}
    </ul>
  );
}

export function commuteSummary(r: CommuteResult): string {
  if (r.walkOnly) return 'Walk the whole way';
  const lines = r.lines.join(' → ');
  const transfers = r.transfers === 0 ? 'no transfers' : r.transfers === 1 ? '1 transfer' : `${r.transfers} transfers`;
  return `${lines} · ${transfers}`;
}

export function leaveAtText(r: CommuteResult): string {
  return `Leave ${formatClock(r.departAt)}, arrive ${formatClock(r.arriveAt)}`;
}
