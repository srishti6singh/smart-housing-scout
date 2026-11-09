import { UTILITY_LABELS } from '../../shared/cost';
import type { UtilityKey } from '../../shared/types';
import { money } from '../lib/format';
import { DEFAULT_FILTERS, SORT_LABELS, useApp, type Filters, type SortKey } from '../state/AppState';
import { ArriveByPicker, CampusPicker } from './Header';
import { Popover } from './Popover';

const BUDGETS = [1000, 1250, 1500, 1750, 2000, 2500];
const COMMUTES = [20, 25, 30, 40];
const UTILS: UtilityKey[] = ['electricity', 'gas', 'water', 'internet'];

function Choice<T extends string | number | null>({
  options,
  value,
  onChange,
  name,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`pill ${value === o.value ? 'pill-active' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FilterBar({ resultCount }: { resultCount: number }) {
  const { filters, setFilters, sort, setSort } = useApp();
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="sticky top-[72px] z-[900] border-b border-hairline bg-white">
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto px-4 py-3 md:px-6 [&::-webkit-scrollbar]:hidden">
        <div className="md:hidden">
          <ArriveByPicker id="arrive-by-bar" />
        </div>
        <CampusPicker />
        <span className="mx-1 h-6 w-px shrink-0 bg-hairline" aria-hidden />

        <Popover
          active={filters.maxBudget !== null}
          label={filters.maxBudget ? `Under ${money(filters.maxBudget)}` : 'Budget'}
        >
          {(close) => (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Monthly budget</p>
              <Choice
                name="Maximum monthly cost"
                value={filters.maxBudget}
                onChange={(v) => {
                  set({ maxBudget: v });
                  close();
                }}
                options={[{ value: null, label: 'Any' }, ...BUDGETS.map((b) => ({ value: b as number | null, label: `Under ${money(b)}` }))]}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.budgetUsesTrueCost}
                  onChange={(e) => set({ budgetUsesTrueCost: e.target.checked })}
                  className="h-4 w-4 accent-[#0B7F58]"
                />
                Compare against true monthly cost, not rent
              </label>
            </div>
          )}
        </Popover>

        <Popover active={filters.minBeds > 0} label={filters.minBeds ? `${filters.minBeds}+ beds` : 'Beds'}>
          {(close) => (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Bedrooms</p>
              <Choice
                name="Minimum bedrooms"
                value={filters.minBeds}
                onChange={(v) => {
                  set({ minBeds: v });
                  close();
                }}
                options={[
                  { value: 0, label: 'Any' },
                  { value: 1, label: '1+' },
                  { value: 2, label: '2+' },
                  { value: 3, label: '3+' },
                ]}
              />
            </div>
          )}
        </Popover>

        <Popover active={filters.minFullBaths > 0} label={filters.minFullBaths ? `${filters.minFullBaths}+ full baths` : 'Baths'}>
          {(close) => (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Verified full baths</p>
              <p className="text-xs text-ink-muted">Counts only baths with a shower or tub, as verified by tenants.</p>
              <Choice
                name="Minimum verified full baths"
                value={filters.minFullBaths}
                onChange={(v) => {
                  set({ minFullBaths: v });
                  close();
                }}
                options={[
                  { value: 0, label: 'Any' },
                  { value: 1, label: '1+' },
                  { value: 2, label: '2+' },
                ]}
              />
            </div>
          )}
        </Popover>

        <Popover active={filters.maxCommute !== null} label={filters.maxCommute ? `Under ${filters.maxCommute} min` : 'Max commute'}>
          {(close) => (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Door-to-campus time</p>
              <p className="text-xs text-ink-muted">Includes walking, waiting, riding, and arriving early.</p>
              <Choice
                name="Maximum commute"
                value={filters.maxCommute}
                onChange={(v) => {
                  set({ maxCommute: v });
                  close();
                }}
                options={[{ value: null, label: 'Any' }, ...COMMUTES.map((m) => ({ value: m as number | null, label: `${m} min` }))]}
              />
            </div>
          )}
        </Popover>

        <Popover active={filters.mustInclude.length > 0} label={filters.mustInclude.length ? `${filters.mustInclude.length} utilities included` : 'Utilities'}>
          {() => (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Must be included in rent</legend>
              {UTILS.map((u) => (
                <label key={u} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#0B7F58]"
                    checked={filters.mustInclude.includes(u)}
                    onChange={(e) =>
                      set({ mustInclude: e.target.checked ? [...filters.mustInclude, u] : filters.mustInclude.filter((x) => x !== u) })
                    }
                  />
                  {UTILITY_LABELS[u]}
                </label>
              ))}
            </fieldset>
          )}
        </Popover>

        {!isDefault && (
          <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="shrink-0 px-2 text-sm font-medium text-ink underline underline-offset-4">
            Clear filters
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3 pl-2">
          <span className="num hidden text-sm text-ink-muted lg:inline" aria-live="polite">
            {resultCount} {resultCount === 1 ? 'home' : 'homes'}
          </span>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-ink-muted">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-input border border-hairline bg-white px-3 py-2 font-medium focus:border-transit focus:outline-none"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
