import type { Campus, CampusId } from './types';

// One default building per campus: the trip ends at its door.
export const CAMPUSES: Campus[] = [
  {
    id: 'cmu',
    name: 'Carnegie Mellon University',
    short: 'CMU',
    building: { name: 'Gates Hillman Center', lat: 40.44349, lng: -79.94456 },
    mock: {
      stopName: 'Forbes Ave at Morewood Ave',
      finalWalkMin: 5,
      hubLine: { name: '61C', headwayMin: 10, kmh: 16, phase: 4 },
    },
  },
  {
    id: 'pitt',
    name: 'University of Pittsburgh',
    short: 'Pitt',
    building: { name: 'Cathedral of Learning', lat: 40.44425, lng: -79.95318 },
    mock: {
      stopName: 'Fifth Ave at Bigelow Blvd',
      finalWalkMin: 3,
      hubLine: { name: '71A', headwayMin: 10, kmh: 15, phase: 2 },
    },
  },
  {
    id: 'duq',
    name: 'Duquesne University',
    short: 'Duquesne',
    building: { name: 'Old Main', lat: 40.43695, lng: -79.99055 },
    mock: {
      stopName: 'Forbes Ave at Magee St',
      finalWalkMin: 6,
      hubLine: { name: '61C', headwayMin: 10, kmh: 17, phase: 7 },
    },
  },
];

export const DEFAULT_CAMPUS: CampusId = 'cmu';

export function getCampus(id: CampusId | string | undefined): Campus {
  return CAMPUSES.find((c) => c.id === id) ?? CAMPUSES[0];
}

export const OAKLAND_HUB = { name: 'Fifth Ave at Bellefield Ave', lat: 40.4455, lng: -79.9505, walkMin: 2 };
