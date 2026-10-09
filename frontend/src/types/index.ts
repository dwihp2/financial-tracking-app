/**
 * Shared types for the Financial Tracking App.
 *
 * Exercise note: these types are intentionally simple. Extend them freely
 * as you implement the TODO (exercise) tasks.
 */

/** A single financial transaction from the seed data. */
export interface Transaction {
  id: string
  cardName: string
  isCredit: boolean
  category: string
  amount: number
  date: string // ISO date string, e.g. "2025-07-30T16:00:00.000Z"
  currency: string
}

/**
 * The filter controls state.
 * - `month` is an ISO date string representing the FIRST day of the selected
 *   month (dayjs), e.g. "2026-03-01".
 * - `selectedCards` is the list of card names to include. An EMPTY array
 *   means "All cards" (no card filter applied). Multiple cards can be
 *   selected at once.
 */
export interface FilterState {
  month: string
  selectedCards: string[]
}

/** Money-in categories. Everything else is treated as money-out. */
export const MONEY_IN_CATEGORIES = ['transfer', 'interest'] as const

/** The summary numbers shown in FinancialSummary. */
export interface Summary {
  moneyIn: number
  moneyOut: number
  balance: number
}
