import { useId } from 'react';
import { UTILITY_LABELS } from '../../shared/cost';
import type { UtilityKey } from '../../shared/types';
import { parseAmount } from '../lib/filters';
import { money } from '../lib/format';
import { DEFAULT_FILTERS, SORT_LABELS, useApp, type Filters, type SortKey } from '../state/AppState';
import { ArriveByPicker, CampusPicker } from './Header';
import { Popover } from './Popover';

const RENT_PRESETS = [1000, 1500, 2000];
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

/** Number box for a dollar or minute limit. Empty means no limit. */
function AmountInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 50,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      <span className="flex items-center gap-1 rounded-input border border-hairline bg-white px-3 focus-within:border-transit">
        {prefix && <span className="text-sm text-ink-faint">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          placeholder="No limit"
          value={value ?? ''}
          onChange={(e) => onChange(parseAmount(e.target.value))}
          className="num h-10 w-full bg-transparent text-sm focus:outline-none"
        />
        {suffix && <span className="text-sm text-ink-faint">{suffix}</span>}
      </span>
    </label>
  );
}

function PanelFooter({ onClear, onDone, clearLabel = 'Clear' }: { onClear: () => void; onDone: () => void; clearLabel?: string }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
      <button type="button" onClick={onClear} className="text-sm font-medium text-ink underline underline-offset-4">
        {clearLabel}
      </button>
      <button type="button" onClick={onDone} className="btn-primary px-4 py-2">
        Done
      </button>
    </div>
  );
}

function budgetLabel(f: Filters): string {
  const { maxRent, maxUtilities, matchTotal } = f;
  if (maxRent !== null && maxUtilities !== null) {
    return matchTotal ? `Up to ${money(maxRent + maxUtilities)} total` : `Rent ${money(maxRent)}, utilities ${money(maxUtilities)}`;
  }
  if (maxRent !== null) return `Rent up to ${money(maxRent)}`;
  if (maxUtilities !== null) return `Utilities up to ${money(maxUtilities)}`;
  return 'Budget';
}

export function FilterBar({ resultCount }: { resultCount: number }) {
  const { filters, setFilters, sort, setSort } = useApp();
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);
  const budgetActive = filters.maxRent !== null || filters.maxUtilities !== null;

  return (
    <div className="sticky top-[72px] z-[900] border-b border-hairline bg-white">
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto px-4 py-3 md:px-6 [&::-webkit-scrollbar]:hidden">
        <div className="md:hidden">
          <ArriveByPicker id="arrive-by-bar" />
        </div>
        <CampusPicker />
        <span className="mx-1 h-6 w-px shrink-0 bg-hairline" aria-hidden />

        <Popover active={budgetActive} label={budgetLabel(filters)}>
          {(close) => (
            <div>
              <p className="text-sm font-semibold">Monthly budget</p>
              <p className="mt-1 text-xs text-ink-muted">Type any amount. Leave a box empty for no limit.</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <AmountInput label="Rent up to" prefix="$" value={filters.maxRent} onChange={(v) => set({ maxRent: v })} />
                <AmountInput label="Utilities up to" prefix="$" value={filters.maxUtilities} onChange={(v) => set({ maxUtilities: v })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Quick rent limits">
                {RENT_PRESETS.map((r) => (
                  <button key={r} type="button" onClick={() => set({ maxRent: r })} className={`pill px-3 py-1 text-xs ${filters.maxRent === r ? 'pill-active' : ''}`}>
                    Rent {money(r)}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.matchTotal}
                  onChange={(e) => set({ matchTotal: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-[#0B7F58]"
                />
                <span>
                  Match on total
                  <span className="block text-xs text-ink-muted">
                    With both limits set, a home fits if rent + utilities is within your total. For example, $750 + $400 fits a $1,000 + $250 budget.
                  </span>
                </span>
              </label>
              <PanelFooter onClear={() => set({ maxRent: null, maxUtilities: null, matchTotal: true })} onDone={close} />
            </div>
          )}
        </Popover>

        <Popover active={filters.minBeds > 0} label={filters.minBeds ? `${filters.minBeds}+ beds` : 'Beds'}>
          {(close) => (
            <div>
              <p className="mb-3 text-sm font-semibold">Bedrooms</p>
              <Choice
                name="Minimum bedrooms"
                value={filters.minBeds}
                onChange={(v) => set({ minBeds: v })}
                options={[
                  { value: 0, label: 'Any' },
                  { value: 1, label: '1+' },
                  { value: 2, label: '2+' },
                  { value: 3, label: '3+' },
                ]}
              />
              <PanelFooter onClear={() => set({ minBeds: 0 })} onDone={close} />
            </div>
          )}
        </Popover>

        <Popover active={filters.minFullBaths > 0} label={filters.minFullBaths ? `${filters.minFullBaths}+ full baths` : 'Baths'}>
          {(close) => (
            <div>
              <p className="text-sm font-semibold">Verified full baths</p>
              <p className="mb-3 mt-1 text-xs text-ink-muted">Counts only baths with a shower or tub, as verified by tenants.</p>
              <Choice
                name="Minimum verified full baths"
                value={filters.minFullBaths}
                onChange={(v) => set({ minFullBaths: v })}
                options={[
                  { value: 0, label: 'Any' },
                  { value: 1, label: '1+' },
                  { value: 2, label: '2+' },
                ]}
              />
              <PanelFooter onClear={() => set({ minFullBaths: 0 })} onDone={close} />
            </div>
          )}
        </Popover>

        <Popover active={filters.maxCommute !== null} label={filters.maxCommute ? `Under ${filters.maxCommute} min` : 'Max commute'}>
          {(close) => (
            <div>
              <p className="text-sm font-semibold">Door-to-campus time</p>
              <p className="mb-3 mt-1 text-xs text-ink-muted">Includes walking, waiting, riding, and arriving early.</p>
              <Choice
                name="Maximum commute"
                value={filters.maxCommute}
                onChange={(v) => set({ maxCommute: v })}
                options={[{ value: null, label: 'Any' }, ...COMMUTES.map((m) => ({ value: m as number | null, label: `${m} min` }))]}
              />
              <div className="mt-3">
                <AmountInput label="Or type a limit" suffix="min" step={5} value={filters.maxCommute} onChange={(v) => set({ maxCommute: v })} />
              </div>
              <PanelFooter onClear={() => set({ maxCommute: null })} onDone={close} />
            </div>
          )}
        </Popover>

        <Popover active={filters.mustInclude.length > 0} label={filters.mustInclude.length ? `${filters.mustInclude.length} utilities included` : 'Utilities'}>
          {(close) => (
            <fieldset>
              <div className="mb-3 flex items-center justify-between gap-2">
                <legend className="text-sm font-semibold">Must be included in rent</legend>
                <button
                  type="button"
                  onClick={() => set({ mustInclude: filters.mustInclude.length === UTILS.length ? [] : [...UTILS] })}
                  className="text-xs font-medium text-ink underline underline-offset-4"
                >
                  {filters.mustInclude.length === UTILS.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-3">
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
              </div>
              <PanelFooter onClear={() => set({ mustInclude: [] })} onDone={close} />
            </fieldset>
          )}
        </Popover>

        <button
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          disabled={isDefault}
          className="shrink-0 px-2 text-sm font-medium text-ink underline underline-offset-4 disabled:cursor-default disabled:text-ink-faint disabled:no-underline"
        >
          Clear all
        </button>

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
