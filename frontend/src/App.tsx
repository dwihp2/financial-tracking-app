import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import FinancialSummary from './components/FinancialSummary'
import Filter from './components/Filter'
import TransactionTable, { isMoneyIn, isMoneyOut } from './components/TransactionTable'
import type { FilterState, Transaction } from './types'
import transactionsData from './data/transactions.json'

type ComputeMoneyT = {
  trx: Transaction[]
  type: 'in' | 'out'
}

/**
 * Sum the amounts of transactions whose direction matches `type`.
 * Money-in = isMoneyIn(category); money-out = its complement.
 */
function computeMoney({ trx, type }: ComputeMoneyT): number {
  return trx.reduce((total, item) => {
    const data = type === "in" ? isMoneyIn(item.category) : isMoneyOut(item.category)
    return data ? total + item.amount : total
  }, 0)
}

/**
 * App is the ROOT component. Per the exercise rules:
 *  - ALL state lives here and is passed down to components via props.
 *  - GLOBAL calculations (totals, filtering) happen here.
 *  - Components only do internal/local calculations (e.g. formatting).
 *
 * The core logic is left as `TODO (exercise)` for you to implement.
 */
export default function App() {
  // ---- Root state ----

  /** All transactions loaded from the seed data. */
  const [transactions] = useState<Transaction[]>(transactionsData)

  // Each summary number has its OWN state (defaults to 0).
  const [moneyIn, setMoneyIn] = useState(0)
  const [moneyOut, setMoneyOut] = useState(0)
  const [balance, setBalance] = useState(0)

  /**
   * Filter state.
   * - `month` defaults to the FIRST day of the current month via dayjs,
   *   e.g. "2026-03-01".
   * - `selectedCards` defaults to [] = "All cards" (no card filter).
   */
  const [filterState, setFilterState] = useState<FilterState>({
    // month: dayjs().startOf('month').format('YYYY-MM-DD'),
    month: '',
    selectedCards: [],
  })

  // Distinct card names, used to populate the Filter card options.
  const cards: string[] = [...new Set(transactions.map((t) => t.cardName))].sort()

  // ---- Global calculation: apply filters ----
  // Passed to TransactionTable AND used to compute the summary totals.
  const filteredTransactions: Transaction[] = applyFilters(transactions, filterState)

  // ---- Global calculation: summary numbers ----
  // Recompute moneyIn / moneyOut / balance whenever the filtered set changes.
  useEffect(() => {
    const totalIn = computeMoney({ trx: filteredTransactions, type: 'in' })
    const totalOut = computeMoney({ trx: filteredTransactions, type: 'out' })
    setMoneyIn(totalIn)
    setMoneyOut(totalOut)
    setBalance(totalIn - totalOut)
  }, [filteredTransactions])

  // ---- Handlers that update filter state in App (called by <Filter />) ----
  const handleMonthChange = (month: string) =>
    setFilterState((prev) => ({ ...prev, month }))

  const handleCardChange = (cards: string[]) =>
    setFilterState((prev) => ({ ...prev, selectedCards: cards }))

  const handleClearFilters = () =>
    setFilterState({
      month: "",
      selectedCards: [],
    })

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Financial Tracking
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Money in, money out, and your balance at a glance.
        </p>
      </header>

      <FinancialSummary moneyIn={moneyIn} moneyOut={moneyOut} balance={balance} />

      <Filter
        filterState={filterState}
        cards={cards}
        onMonthChange={handleMonthChange}
        onCardChange={handleCardChange}
        onClear={handleClearFilters}
      />

      <TransactionTable transactions={filteredTransactions} />
    </main>
  )
}

/**
 * Apply the active filters (month and/or credit card) to the transactions.
 *
 * TODO (exercise): implement the real filtering. For now it returns the full
 * list so the table renders — replace `return transactions` with the filtered
 * result. Remember:
 *   - month filter: keep rows in the same month as `filter.month`
 *     (use dayjs, e.g. dayjs(t.date).isSame(filter.month, 'month'))
 *   - card filter:  keep rows whose cardName is in `filter.selectedCards`
 *     (skip entirely when selectedCards is empty = "all cards")
 *   - both filters combine with AND.
 */
function applyFilters(transactions: Transaction[], filter: FilterState): Transaction[] {
  // TODO (exercise): implement filter logic here.

  const filteredTx = transactions.filter((tx) => {
    const selectedDate = dayjs(filter?.month)
    const dateFilter = filter.month !== "" ? dayjs(tx.date).isSame(selectedDate, 'month') : true
    const cardFilter = filter.selectedCards.length !== 0 ? filter.selectedCards.includes(tx.cardName) : true
    return dateFilter && cardFilter
  })

  const result = (filter.month === "" && filter.selectedCards.length === 0) ? transactions : filteredTx

  return result
}
