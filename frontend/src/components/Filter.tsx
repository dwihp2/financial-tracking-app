import type { ChangeEvent } from 'react'
import dayjs from 'dayjs'
import type { FilterState } from '../types'

/**
 * Filter — month picker (dayjs) + credit card multi-select + clear button.
 *
 * Exercise rule: this component does NOT own state. The filter state lives
 * in App; this component renders the controls and reports changes back up
 * through the callback props (`onMonthChange`, `onCardChange`, `onClear`).
 */
interface FilterProps {
  filterState: FilterState
  cards: string[]
  onMonthChange: (month: string) => void
  onCardChange: (cards: string[]) => void
  onClear: () => void
}

export default function Filter({
  filterState,
  cards,
  onMonthChange,
  onCardChange,
  onClear,
}: FilterProps) {
  // Local (internal) calculation: the month input expects "YYYY-MM",
  // but our state stores the first day of the month "YYYY-MM-DD".
  const monthInputValue = dayjs(filterState.month).isValid() ? dayjs(filterState.month).format('YYYY-MM') : ''

  const handleMonthInput = (e: ChangeEvent<HTMLInputElement>) => {
    // e.target.value is "YYYY-MM" — normalize to the first day "YYYY-MM-01".
    const firstDayOfMonth = e.target.value
      ? dayjs(`${e.target.value}-01`).format('YYYY-MM-DD')
      : ''
    onMonthChange(firstDayOfMonth)
  }

  /**
   * Local (internal) logic: toggle one card in the multi-select and report
   * the resulting list up to App. An empty list means "all cards".
   */
  const toggleCard = (card: string) => {
    const isSelected = filterState.selectedCards.includes(card)
    const next = isSelected
      ? filterState.selectedCards.filter((c) => c !== card)
      : [...filterState.selectedCards, card]
    onCardChange(next)
  }

  return (
    <section
      aria-label="Filters"
      className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      {/* Month filter */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Month
        </span>
        <input
          type="month"
          value={monthInputValue}
          onChange={handleMonthInput}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      {/* Credit card filter (multi-select) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Credit Cards
        </span>
        <div className="flex max-w-xl flex-wrap gap-2">
          {cards.map((card) => {
            const isSelected = filterState.selectedCards.includes(card)
            return (
              <button
                key={card}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleCard(card)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {isSelected ? (
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4 4 8-8" />
                  </svg>
                ) : (
                  <span
                    className="h-3.5 w-3.5 rounded-sm border border-slate-300"
                    aria-hidden="true"
                  />
                )}
                {card}
              </button>
            )
          })}
        </div>
        <span className="text-xs text-slate-400">
          {filterState.selectedCards.length === 0
            ? 'All cards selected — showing every card.'
            : `${filterState.selectedCards.length} card${filterState.selectedCards.length > 1 ? 's' : ''
            } selected.`}
        </span>
      </div>

      {/* Clear filters */}
      <button
        type="button"
        onClick={onClear}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Clear filters
      </button>
    </section>
  )
}
