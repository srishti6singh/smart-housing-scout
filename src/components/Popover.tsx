import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevron } from './icons';

const PANEL_WIDTH = 296;
const GUTTER = 16;

/**
 * Pill that opens a small panel. The panel is positioned with fixed
 * coordinates so a horizontally scrolling filter row never clips it.
 * Closes on outside click, Escape, and page resize.
 */
export function Popover({
  label,
  active,
  children,
}: {
  label: ReactNode;
  active?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const maxLeft = window.innerWidth - PANEL_WIDTH - GUTTER;
    setPos({ top: r.bottom + 8, left: Math.max(GUTTER, Math.min(r.left, maxLeft)) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !panelRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className={`pill whitespace-nowrap ${active ? 'pill-active' : ''}`}
      >
        {label}
        <IconChevron dir={open ? 'up' : 'down'} size={14} />
      </button>
      {open && pos && (
        <div
          ref={panelRef}
          id={id}
          role="dialog"
          aria-label={typeof label === 'string' ? label : undefined}
          className="card fixed z-[1100] p-5 shadow-float"
          style={{ top: pos.top, left: pos.left, width: Math.min(PANEL_WIDTH, window.innerWidth - GUTTER * 2) }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
