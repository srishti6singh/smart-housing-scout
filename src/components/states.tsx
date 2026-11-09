import type { ReactNode } from 'react';
import { IconAlert } from './icons';

export function CardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="skeleton aspect-[4/3] w-full rounded-img" />
      <div className="skeleton h-5 w-1/3 rounded-full" />
      <div className="skeleton h-4 w-2/3 rounded-full" />
      <div className="skeleton h-4 w-1/2 rounded-full" />
      <div className="skeleton h-2 w-full rounded-full" />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 px-8 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-prose text-sm text-ink-muted">{body}</p>
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-input border border-mismatch/30 bg-mismatch-soft p-4 text-sm text-mismatch-dark">
      <IconAlert size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Commute times didn&rsquo;t load</p>
        <p className="mt-1 text-ink">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary shrink-0 px-4 py-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function SampleLabel({ children = 'Sample commute data', dark = false }: { children?: ReactNode; dark?: boolean }) {
  return (
    <span
      className={`badge border ${dark ? 'border-amber/50 bg-amber/15 text-amber' : 'border-amber/40 bg-amber-soft text-amber-dark'}`}
      title="No Google API key is set, so commutes come from a deterministic sample model."
    >
      {children}
    </span>
  );
}
