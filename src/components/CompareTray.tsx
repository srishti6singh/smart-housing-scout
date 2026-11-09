import { Link } from 'react-router-dom';
import { getListing, photoUrl } from '../../shared/listings';
import { MAX_COMPARE, useApp } from '../state/AppState';
import { IconX } from './icons';

/** Floating tray that appears once a home is added to Compare. */
export function CompareTray({ hidden = false }: { hidden?: boolean }) {
  const { compare, toggleCompare, setCompare } = useApp();
  if (hidden || compare.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[970] flex justify-center px-4 lg:bottom-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-midnight py-2 pl-3 pr-2 text-white shadow-float">
        <ul className="flex -space-x-2" aria-label="Homes to compare">
          {compare.map((id) => {
            const l = getListing(id);
            if (!l) return null;
            return (
              <li key={id} className="relative">
                <img src={photoUrl(l.photos[0].url, 80)} alt="" className="h-9 w-9 rounded-full border-2 border-midnight object-cover" />
                <button
                  type="button"
                  aria-label={`Remove ${l.street} from compare`}
                  onClick={() => toggleCompare(id)}
                  className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-ink"
                >
                  <IconX size={10} />
                </button>
              </li>
            );
          })}
        </ul>
        <span className="num hidden text-sm sm:inline">
          {compare.length} of {MAX_COMPARE}
        </span>
        <button type="button" onClick={() => setCompare([])} className="hidden text-sm text-white/70 underline-offset-4 hover:underline sm:inline">
          Clear
        </button>
        {compare.length >= 2 ? (
          <Link to="/compare" className="btn-primary px-4 py-2">
            Compare {compare.length}
          </Link>
        ) : (
          <span className="px-3 text-sm text-white/70">Add one more to compare</span>
        )}
      </div>
    </div>
  );
}
