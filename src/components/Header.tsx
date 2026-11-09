import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CAMPUSES, getCampus } from '../../shared/campuses';
import { formatDay, nextWeekdayAt } from '../../shared/time';
import type { CampusId } from '../../shared/types';
import { useApp } from '../state/AppState';
import { IconClock, IconCompare, IconHeart, IconLogo, IconSearch } from './icons';

export const ARRIVE_OPTIONS = (() => {
  const out: { value: string; label: string }[] = [];
  for (let m = 7 * 60; m <= 11 * 60; m += 15) {
    const h = Math.floor(m / 60);
    const mm = String(m % 60).padStart(2, '0');
    out.push({ value: `${String(h).padStart(2, '0')}:${mm}`, label: `${h}:${mm} AM` });
  }
  return out;
})();

export function ArriveByPicker({ dark = false, id = 'arrive-by' }: { dark?: boolean; id?: string }) {
  const { arriveBy, setArriveBy, arriveByIso } = useApp();
  let day = '';
  try {
    day = formatDay(arriveByIso ?? nextWeekdayAt(arriveBy));
  } catch {
    day = '';
  }
  return (
    <label
      htmlFor={id}
      className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm ${
        dark ? 'border-white/15 bg-white/5 text-white hover:bg-white/10' : 'border-hairline bg-white text-ink hover:border-ink/40'
      }`}
    >
      <IconClock size={16} className={dark ? 'text-[#8DDDD5]' : 'text-seg-walk'} />
      <span className={dark ? 'text-white/70' : 'text-ink-muted'}>Arrive by</span>
      <select
        id={id}
        value={arriveBy}
        onChange={(e) => setArriveBy(e.target.value)}
        className={`num cursor-pointer appearance-none bg-transparent font-semibold focus:outline-none ${dark ? 'text-white [&>option]:text-ink' : 'text-ink'}`}
      >
        {ARRIVE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {day && <span className={`hidden xl:inline ${dark ? 'text-white/60' : 'text-ink-faint'}`}>{day}</span>}
    </label>
  );
}

export function CampusPicker({ dark = false, id = 'campus' }: { dark?: boolean; id?: string }) {
  const { campusId, setCampusId } = useApp();
  const campus = getCampus(campusId);
  return (
    <label
      htmlFor={id}
      className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm ${
        dark ? 'border-white/15 bg-white/5 text-white hover:bg-white/10' : 'border-hairline bg-white text-ink hover:border-ink/40'
      }`}
      title={`Trips end at ${campus.building.name}`}
    >
      <span className={dark ? 'text-white/70' : 'text-ink-muted'}>To</span>
      <select
        id={id}
        value={campusId}
        onChange={(e) => setCampusId(e.target.value as CampusId)}
        className={`cursor-pointer appearance-none bg-transparent font-semibold focus:outline-none ${dark ? 'text-white [&>option]:text-ink' : 'text-ink'}`}
        aria-label="Campus"
      >
        {CAMPUSES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.short} · {c.building.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function useNarrow() {
  const query = "(max-width: 480px)";
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

function SearchField() {
  const { query, setQuery, setCampusId } = useApp();
  const [value, setValue] = useState(query);
  const navigate = useNavigate();
  const location = useLocation();
  const narrow = useNarrow();
  useEffect(() => setValue(query), [query]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    const lower = q.toLowerCase();
    const campus = CAMPUSES.find(
      (c) => lower && (c.name.toLowerCase().includes(lower) || c.short.toLowerCase() === lower || (lower.length > 3 && c.building.name.toLowerCase().includes(lower))),
    );
    if (campus) {
      setCampusId(campus.id);
      setQuery('');
      setValue('');
    } else {
      setQuery(q);
    }
    if (location.pathname !== '/') navigate('/');
  };

  return (
    <form role="search" onSubmit={submit} className="relative min-w-0 flex-1">
      <label htmlFor="search" className="sr-only">
        Search by neighborhood, address, or campus
      </label>
      <input
        id="search"
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value === '') setQuery('');
        }}
        placeholder={narrow ? "Search" : "Neighborhood, address, or campus"}
        className="h-12 w-full rounded-full border border-transparent bg-white pl-5 pr-14 text-sm text-ink shadow-lift placeholder:text-ink-faint focus:border-transit focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-scout-dark text-white hover:bg-[#096a49]"
      >
        <IconSearch size={16} />
      </button>
    </form>
  );
}

export function Header() {
  const { saved, compare } = useApp();
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'
    }`;
  return (
    <header className="dark-surface sticky top-0 z-[1000] bg-midnight text-white">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 md:gap-4 md:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Smart Housing Scout, home">
          <IconLogo size={32} />
          <span className="hidden leading-tight lg:block">
            <span className="block text-base font-semibold">Smart Housing Scout</span>
            <span className="block text-xs text-white/60">Rent with evidence, not claims.</span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:max-w-3xl">
          <SearchField />
          <div className="hidden md:block">
            <ArriveByPicker dark id="arrive-by-header" />
          </div>
        </div>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1">
          <NavLink to="/saved" className={navCls} aria-label={`Saved homes, ${saved.length}`}>
            <IconHeart size={18} />
            <span className="hidden sm:inline">Saved</span>
            {saved.length > 0 && <span className="evidence rounded-full bg-white/15 px-1.5 text-xs">{saved.length}</span>}
          </NavLink>
          <NavLink to="/compare" className={navCls} aria-label={`Compare, ${compare.length} homes`}>
            <IconCompare size={18} />
            <span className="hidden sm:inline">Compare</span>
            {compare.length > 0 && <span className="evidence rounded-full bg-white/15 px-1.5 text-xs">{compare.length}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
