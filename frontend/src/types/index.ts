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

/** The shape used to create a new transaction (the API assigns `id`). */
export type NewTransaction = Omit<Transaction, 'id'>

/** Which money direction to show. `all` applies no direction filter. */
export type Direction = 'all' | 'in' | 'out'

/**
 * The filter controls state.
 * - `month` is an ISO date string representing the FIRST day of the selected
 *   month (dayjs), e.g. "2026-03-01". An EMPTY string means "no month filter".
 * - `selectedCards` is the list of card names to include. An EMPTY array
 *   means "All cards" (no card filter applied). Multiple cards can be
 *   selected at once.
 * - `selectedCategories` works the same way as `selectedCards`, for categories.
 * - `direction` filters to money in / money out / everything.
 * - `search` is a free-text match against the card name and category.
 */
export interface FilterState {
  month: string
  selectedCards: string[]
  selectedCategories: string[]
  direction: Direction
  search: string
}

/** The filter state with nothing applied — also what "Clear filters" resets to. */
export const DEFAULT_FILTERS: FilterState = {
  month: '',
  selectedCards: [],
  selectedCategories: [],
  direction: 'all',
  search: '',
}

/** Money-in categories. Everything else is treated as money-out. */
export const MONEY_IN_CATEGORIES = ['transfer', 'interest'] as const

/** The summary numbers shown in FinancialSummary. */
export interface Summary {
  moneyIn: number
  moneyOut: number
  balance: number
}
