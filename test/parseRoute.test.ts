import { describe, expect, it } from 'vitest';
import fixture from './fixtures/routes-transfer.json';
import { parseDurationSeconds, parseRoutesResponse, type RoutesApiResponse } from '../shared/parseRoute';

const ARRIVE_BY = '2026-11-10T13:45:00.000Z'; // 8:45 AM in Pittsburgh

describe('parseDurationSeconds', () => {
  it('reads Google duration strings', () => {
    expect(parseDurationSeconds('123s')).toBe(123);
    expect(parseDurationSeconds('3.5s')).toBe(3.5);
    expect(parseDurationSeconds(undefined)).toBe(0);
  });
});

describe('parseRoutesResponse: one transfer (fixture)', () => {
  const r = parseRoutesResponse(fixture as RoutesApiResponse, ARRIVE_BY)!;

  it('derives departure from final arrival minus route duration', () => {
    // final arrival 13:31 + 4 min walk = 13:35; minus 29 min = 13:06
    expect(r.departAt).toBe('2026-11-10T13:06:00.000Z');
    expect(r.arriveAt).toBe('2026-11-10T13:35:00.000Z');
  });

  it('splits the trip into journey parts', () => {
    expect(r.walkToStop).toBe(5); // two WALK steps grouped
    expect(r.wait).toBe(5); // 1 min initial + 4 min transfer wait
    expect(r.ride).toBe(13); // 9 + 4
    expect(r.transferWalk).toBe(2);
    expect(r.walkToBuilding).toBe(4);
    expect(r.earlyArrival).toBe(10); // arrives 8:35 for 8:45
  });

  it('counts lines and transfers', () => {
    expect(r.lines).toEqual(['61B', '71A']);
    expect(r.transfers).toBe(1);
    expect(r.walkOnly).toBe(false);
  });

  it('defines total as arrive-by minus departure, including early arrival', () => {
    expect(r.totalMinutes).toBe(39);
    expect(r.travelMinutes).toBe(29);
    const sum = r.segments.reduce((s, x) => s + x.minutes, 0);
    expect(sum).toBe(r.totalMinutes);
  });

  it('keeps segments in trip order', () => {
    expect(r.segments.map((s) => `${s.kind}:${s.minutes}`)).toEqual([
      'walk:5',
      'wait:1',
      'ride:9',
      'transferWalk:2',
      'wait:4',
      'ride:4',
      'finalWalk:4',
      'early:10',
    ]);
    expect(r.segments[2]).toMatchObject({ line: '61B', from: 'Forbes Ave at Murray Ave', to: 'Fifth Ave at Bellefield Ave', stopCount: 7 });
  });
});

describe('parseRoutesResponse: edge cases', () => {
  it('assumes no initial wait when route duration is missing', () => {
    const noDuration = structuredClone(fixture) as RoutesApiResponse;
    delete noDuration.routes![0].duration;
    const r = parseRoutesResponse(noDuration, ARRIVE_BY)!;
    expect(r.departAt).toBe('2026-11-10T13:07:00.000Z');
    expect(r.wait).toBe(4);
    expect(r.totalMinutes).toBe(38);
  });

  it('never produces a negative initial wait if duration is too short', () => {
    const short = structuredClone(fixture) as RoutesApiResponse;
    short.routes![0].duration = '600s';
    const r = parseRoutesResponse(short, ARRIVE_BY)!;
    expect(r.segments.every((s) => s.minutes >= 0)).toBe(true);
    expect(r.departAt).toBe('2026-11-10T13:07:00.000Z');
  });

  it('handles a walk-only route', () => {
    const r = parseRoutesResponse({ routes: [{ duration: '1080s', legs: [{ steps: [{ travelMode: 'WALK', staticDuration: '1080s' }] }] }] }, ARRIVE_BY)!;
    expect(r.walkOnly).toBe(true);
    expect(r.totalMinutes).toBe(18);
    expect(r.ride).toBe(0);
    expect(r.lines).toEqual([]);
  });

  it('rounds boundaries so odd seconds still add up', () => {
    const odd = structuredClone(fixture) as RoutesApiResponse;
    const steps = odd.routes![0].legs![0].steps!;
    steps[0].staticDuration = '175s';
    steps[6].staticDuration = '215s';
    const r = parseRoutesResponse(odd, ARRIVE_BY)!;
    expect(r.segments.reduce((s, x) => s + x.minutes, 0)).toBe(r.totalMinutes);
  });

  it('returns null when there is no route', () => {
    expect(parseRoutesResponse({ routes: [] }, ARRIVE_BY)).toBeNull();
    expect(parseRoutesResponse({}, ARRIVE_BY)).toBeNull();
  });
});
