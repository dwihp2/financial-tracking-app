/**
 * Shared money logic.
 *
 * These helpers used to live inside TransactionTable.tsx while App.tsx
 * imported them back out — a layering smell. They are GLOBAL calculations
 * (money direction + totals), so they belong here, not in a component.
 *
 * Per the exercise rules, purely local presentation helpers (currency and
 * date formatting) still live inside each component.
 */
import { MONEY_IN_CATEGORIES } from '@/types'
import type { Summary, Transaction } from '@/types'

/** Whether a category counts as money in (see types). */
export function isMoneyIn(category: string): boolean {
  return (MONEY_IN_CATEGORIES as readonly string[]).includes(category)
}

/** Everything that is not money in is money out. */
export function isMoneyOut(category: string): boolean {
  return !isMoneyIn(category)
}

export interface ComputeMoneyArgs {
  trx: Transaction[]
  type: 'in' | 'out'
}

/**
 * Sum the amounts of transactions whose direction matches `type`.
 * Money-in = isMoneyIn(category); money-out = its complement.
 */
export function computeMoney({ trx, type }: ComputeMoneyArgs): number {
  return trx.reduce((total, item) => {
    const matches = type === 'in' ? isMoneyIn(item.category) : isMoneyOut(item.category)
    return matches ? total + item.amount : total
  }, 0)
}

/** Roll a transaction list up into the three summary numbers. */
export function summarize(trx: Transaction[]): Summary {
  const moneyIn = computeMoney({ trx, type: 'in' })
  const moneyOut = computeMoney({ trx, type: 'out' })
  return { moneyIn, moneyOut, balance: moneyIn - moneyOut }
}
