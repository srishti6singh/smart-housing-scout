import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...rest,
  };
}

export const IconSearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconHeart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const IconClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconBus = (p: P) => (
  <svg {...base(p)}><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M5 11h14M8 18v2M16 18v2" /><circle cx="8.5" cy="14.5" r=".8" fill="currentColor" /><circle cx="15.5" cy="14.5" r=".8" fill="currentColor" /></svg>
);
export const IconWalk = (p: P) => (
  <svg {...base(p)}><circle cx="13" cy="4" r="1.6" /><path d="m9 21 2.5-6 2.5 2v4M8 12l2-4 4 1 2 3 2 1M11.5 15 10 9" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconAlert = (p: P) => (
  <svg {...base(p)}><path d="M12 3 2.5 20h19z" /><path d="M12 10v4M12 17.2v.1" /></svg>
);
export const IconFlag = (p: P) => (
  <svg {...base(p)}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
);
export const IconMap = (p: P) => (
  <svg {...base(p)}><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></svg>
);
export const IconList = (p: P) => (
  <svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>
);
export const IconChevron = ({ dir = 'right', ...p }: P & { dir?: 'left' | 'right' | 'down' | 'up' }) => {
  const r = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return (
    <svg {...base(p)} style={{ transform: `rotate(${r}deg)` }}><path d="m9 6 6 6-6 6" /></svg>
  );
};
export const IconX = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconCompare = (p: P) => (
  <svg {...base(p)}><rect x="3" y="4" width="7" height="16" rx="1.5" /><rect x="14" y="4" width="7" height="16" rx="1.5" /></svg>
);
export const IconMessage = (p: P) => (
  <svg {...base(p)}><path d="M4 5h16v11H8l-4 4z" /></svg>
);
export const IconCamera = (p: P) => (
  <svg {...base(p)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const IconGrid = (p: P) => (
  <svg {...base(p)}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
);
export const IconStar = ({ filled = true, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.5}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
  </svg>
);
export const IconShield = (p: P) => (
  <svg {...base(p)}><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const IconBath = (p: P) => (
  <svg {...base(p)}><path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2" /></svg>
);
export const IconDollar = (p: P) => (
  <svg {...base(p)}><path d="M12 3v18M16.5 7.5C16 6 14.4 5 12 5c-2.8 0-4.5 1.3-4.5 3.3 0 4.7 9 2.4 9 7.2 0 2-1.8 3.5-4.5 3.5-2.6 0-4.3-1.1-4.8-2.8" /></svg>
);
export const IconLogo = (p: P) => (
  <svg {...base(p)} viewBox="0 0 32 32" stroke="none">
    <rect width="32" height="32" rx="9" fill="#0E9F6E" />
    <path d="M8 15.5 16 9l8 6.5V24a1 1 0 0 1-1 1h-4.5v-5h-5v5H9a1 1 0 0 1-1-1z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
    <circle cx="24" cy="9" r="3" fill="#F5A524" />
  </svg>
);
