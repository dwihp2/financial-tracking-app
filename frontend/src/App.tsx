import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Plus, EllipsisVertical } from 'lucide-react'
import { toast } from 'sonner'
import AddTransactionDialog from '@/components/AddTransactionDialog'
import FinancialSummary from '@/components/FinancialSummary'
import Filter from '@/components/Filter'
import TransactionTable from '@/components/TransactionTable'
import ThemeToggle from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createTransaction, deleteTransaction, listTransactions, updateTransaction } from '@/lib/api'
import { isMoneyIn, isMoneyOut, summarize } from '@/lib/money'
import { DEFAULT_FILTERS } from '@/types'
import type { FilterState, NewTransaction, Transaction, TransactionPatch } from '@/types'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './components/ui/dropdown-menu'
import { DeleteTransactionDialog } from './components/DeleteTransactionDialog'


type Theme = 'light' | 'dark'

/** The shared transaction dialog: creating a row, editing one, or closed. */
type TransactionDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; transaction: Transaction }

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


  /**
   * Which flavour the shared transaction dialog is in — `null` means closed.
   * App owns this state (not the dialog) because the row menu unmounts the
   * moment an item is picked; the dialog used to live inside that menu and
   * closed itself in the same click.
   */
  const [dialogState, setDialogState] = useState<TransactionDialogState | null>(null)
  /** Filter state. See DEFAULT_FILTERS in types. */
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTERS)

  /**
   * The row pending deletion — `null` means the confirm dialog is closed.
   * Storing the row (not just a boolean) is what lets the dialog delete the
   * row the user actually picked.
   */
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)

  /** UI chrome state — also owned here so there is a single source of truth. */
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // ---- Global calculation: load the data ----
  // Routed through lib/api.ts so that swapping the bundled JSON for the
  // Express backend later is a one-file change.
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

  const handleAddTransaction = async (input: NewTransaction) => {
    try {
      const created = await createTransaction(input)
      // App stays the single owner of `transactions`.
      setTransactions((previous) => [created, ...previous])
      toast.success('Transaction added', {
        description: `${created.cardName} · ${created.category}`,
      })
    } catch (error) {
      toast.error('Could not add the transaction', {
        description: error instanceof Error ? error.message : undefined,
      })
      // Re-throw so the dialog knows to stay open and keep the user's input.
      throw error
    }
  }

  const handleUpdateTransaction = async (id: string, input: NewTransaction) => {
    // `currency` is immutable on the backend (see TransactionPatch), so the
    // patch carries the editable fields only.
    const patch: TransactionPatch = {
      date: input.date,
      cardName: input.cardName,
      category: input.category,
      amount: input.amount,
      isCredit: input.isCredit,
    }

    try {
      const updated = await updateTransaction(id, patch)
      setTransactions((previous) => previous.map((t) => (t.id === id ? updated : t)))
      toast.success('Transaction updated', {
        description: `${updated.cardName} · ${updated.category}`,
      })
    } catch (error) {
      toast.error('Could not update the transaction', {
        description: error instanceof Error ? error.message : undefined,
      })
      // Re-throw so the dialog knows to stay open and keep the user's changes.
      throw error
    }
  }

  /** Routed to the shared dialog: edit updates the row, create adds one. */
  const handleDialogSubmit = async (input: NewTransaction) => {
    if (dialogState?.mode === 'edit') {
      await handleUpdateTransaction(dialogState.transaction.id, input)
    } else {
      await handleAddTransaction(input)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id)
      setTransactions((previous) => previous.filter((t) => t.id !== id))
      toast.success('Transaction deleted', {
        description: 'The transaction has been removed.',
      })
    } catch (error) {
      toast.error('Could not delete the transaction', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setTransactionToDelete(null)
    }
  }

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
              <p className="font-medium">Could not load transactions</p>
              <p className="mt-1 text-destructive/90">{loadError}</p>
              <p className="mt-2 text-destructive/80">
                The app normally falls back to the bundled seed data. If you started
                the backend, check that <code>GET /api/transactions</code> exists.
              </p>
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

              <TransactionTable
                transactions={filteredTransactions}
                actions={
                  <Button size="sm" onClick={() => setDialogState({ mode: 'create' })}>
                    <Plus data-icon="inline-start" />
                    Add transaction
                  </Button>
                }
                rowActions={(transaction) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {/* Opens the shared dialog pre-filled with this row. */}
                      <DropdownMenuItem
                        onSelect={() => setDialogState({ mode: 'edit', transaction })}
                      >
                        Edit
                      </DropdownMenuItem>
                      {/* Opens the confirm dialog for this specific row. */}
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setTransactionToDelete(transaction)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              />

              {/* One dialog instance serves the header button AND the row
                  menu — the menu can close without taking the dialog with it. */}
              <AddTransactionDialog
                cards={cards}
                categories={categories}
                open={dialogState !== null}
                onOpenChange={(next) => {
                  if (!next) setDialogState(null)
                }}
                initialValue={dialogState?.mode === 'edit' ? dialogState.transaction : undefined}
                onSubmit={handleDialogSubmit}
              />

              {/* Delete dialog — acts on the row stored in `transactionToDelete`. */}
              <DeleteTransactionDialog
                open={transactionToDelete !== null}
                onDelete={() => {
                  if (transactionToDelete) handleDeleteTransaction(transactionToDelete.id)
                }}
                onCancel={() => setTransactionToDelete(null)}
              />
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
