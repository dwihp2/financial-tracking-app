import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import FinancialSummary from '@/components/FinancialSummary'
import Filter from '@/components/Filter'
import TransactionTable from '@/components/TransactionTable'
import ThemeToggle from '@/components/ThemeToggle'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { listTransactions } from '@/lib/api'
import { isMoneyIn, isMoneyOut, summarize } from '@/lib/money'
import { DEFAULT_FILTERS } from '@/types'
import type { FilterState, Transaction } from '@/types'

type Theme = 'light' | 'dark'

/** Local: saved theme wins, otherwise follow the OS preference. */
function getInitialTheme(): Theme {
  const stored = localStorage.getItem('fta-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * App is the ROOT component. Per the exercise rules:
 *  - ALL state lives here and is passed down to components via props.
 *  - GLOBAL calculations (totals, filtering) happen here.
 *  - Components only do internal/local calculations (e.g. formatting).
 */
export default function App() {
  // ---- Root state ----
  /** All transactions. The setter is currently only used by the create flow. */
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  /** Filter state. See DEFAULT_FILTERS in types. */
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTERS)

  /** UI chrome state — also owned here so there is a single source of truth. */
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // ---- Global calculation: load the data ----
  // Routed through lib/api.ts so that swapping the bundled JSON for the
  // Express backend later is a one-file change. See CRUD-EXERCISE.md.
  useEffect(() => {
    let cancelled = false

    listTransactions()
      .then((rows) => {
        if (cancelled) return
        setTransactions(rows)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(
          error instanceof Error ? error.message : 'Failed to load transactions',
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // ---- Global calculation: apply the theme class ----
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('fta-theme', theme)
  }, [theme])

  // ---- Global calculation: distinct option lists for the filters ----
  const cards = useMemo(
    () => [...new Set(transactions.map((t) => t.cardName))].sort(),
    [transactions],
  )
  const categories = useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort(),
    [transactions],
  )
  // Newest month first — "YYYY-MM" sorts correctly as a string.
  const months = useMemo(
    () =>
      [...new Set(transactions.map((t) => dayjs(t.date).format('YYYY-MM')))].sort().reverse(),
    [transactions],
  )

  // ---- Global calculation: apply filters ----
  // Passed to TransactionTable AND used to compute the summary totals.
  const filteredTransactions = useMemo(
    () => applyFilters(transactions, filterState),
    [transactions, filterState],
  )

  // ---- Global calculation: summary numbers ----
  // Derived during render. The original version kept moneyIn/moneyOut/balance
  // in useState and recomputed them in a useEffect keyed on
  // `filteredTransactions` — which was a new array on every render, so the
  // effect re-ran constantly and set state it did not need to. Deriving is
  // both correct and cheaper (oxlint: `set-state-in-effect`).
  const summary = useMemo(() => summarize(filteredTransactions), [filteredTransactions])

  // ---- Handlers (called by the child components) ----
  const handleFilterChange = (next: FilterState) => setFilterState(next)
  const handleClearFilters = () => setFilterState(DEFAULT_FILTERS)
  const handleToggleTheme = () =>
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))

  return (
    <TooltipProvider>
      <div className="min-h-svh bg-background text-foreground">
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                Financial Tracking
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Money in, money out, and your balance at a glance.
              </p>
            </div>
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          </header>

          {loadError ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              Could not load transactions: {loadError}
            </div>
          ) : isLoading ? (
            <LoadingState />
          ) : (
            <>
              <FinancialSummary
                moneyIn={summary.moneyIn}
                moneyOut={summary.moneyOut}
                balance={summary.balance}
                transactionCount={filteredTransactions.length}
              />

              <Filter
                filterState={filterState}
                cards={cards}
                categories={categories}
                months={months}
                resultCount={filteredTransactions.length}
                totalCount={transactions.length}
                onFilterChange={handleFilterChange}
                onClear={handleClearFilters}
              />

              <TransactionTable transactions={filteredTransactions} />
            </>
          )}
        </main>

        <Toaster theme={theme} />
      </div>
    </TooltipProvider>
  )
}

/** Local: skeleton that mirrors the real layout while the data loads. */
function LoadingState() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading transactions">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[188px] rounded-xl" />
      <Skeleton className="h-[420px] rounded-xl" />
    </div>
  )
}

/**
 * Apply the active filters to the transactions. All filters combine with AND.
 *
 * Empty selections mean "no filter":
 *   - month ''            -> every month
 *   - selectedCards []    -> every card
 *   - selectedCategories [] -> every category
 *   - direction 'all'     -> both money in and money out
 *   - search ''           -> no text narrowing
 */
function applyFilters(transactions: Transaction[], filter: FilterState): Transaction[] {
  const selectedMonth = dayjs(filter.month)
  const search = filter.search.trim().toLowerCase()

  return transactions.filter((tx) => {
    const matchesMonth =
      filter.month === '' ? true : dayjs(tx.date).isSame(selectedMonth, 'month')

    const matchesCard =
      filter.selectedCards.length === 0
        ? true
        : filter.selectedCards.includes(tx.cardName)

    const matchesCategory =
      filter.selectedCategories.length === 0
        ? true
        : filter.selectedCategories.includes(tx.category)

    const matchesDirection =
      filter.direction === 'all'
        ? true
        : filter.direction === 'in'
          ? isMoneyIn(tx.category)
          : isMoneyOut(tx.category)

    const matchesSearch =
      search === ''
        ? true
        : tx.cardName.toLowerCase().includes(search) ||
          tx.category.toLowerCase().includes(search)

    return matchesMonth && matchesCard && matchesCategory && matchesDirection && matchesSearch
  })
}
