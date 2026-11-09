import { Link, useNavigate } from 'react-router-dom';
import { ListingCard } from '../components/ListingCard';
import { EmptyState } from '../components/states';
import { MAX_COMPARE, useApp } from '../state/AppState';

export function SavedPage() {
  const { saved, viewById, setCompare } = useApp();
  const navigate = useNavigate();
  const views = saved.map((id) => viewById[id]).filter(Boolean);

  if (views.length === 0) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          title="No saved homes yet"
          body="Select the heart on any home to keep it here. Saved homes stay in this browser."
          action={<Link to="/" className="btn-primary">Browse homes</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Saved homes</h1>
          <p className="text-sm text-ink-muted">{views.length} saved in this browser</p>
        </div>
        {views.length >= 2 && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setCompare(views.slice(0, MAX_COMPARE).map((v) => v.listing.id));
              navigate('/compare');
            }}
          >
            Compare {Math.min(views.length, MAX_COMPARE)} saved homes
          </button>
        )}
      </div>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {views.map((v) => <ListingCard key={v.listing.id} view={v} />)}
      </div>
    </div>
  );
}
