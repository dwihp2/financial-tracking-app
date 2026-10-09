import dayjs from 'dayjs'
import { MONEY_IN_CATEGORIES } from '../types'
import type { Transaction } from '../types'

/**
 * TransactionTable — lists the (already filtered) transactions.
 *
 * Exercise rule: this component does NOT own state. App passes the
 * filtered list down as `transactions`. Filtering happens in App; this
 * component only handles local presentation (date/currency formatting,
 * sorting, colors).
 */
interface TransactionTableProps {
  transactions: Transaction[]
}

/** Local formatting — currency, e.g. "$12.00". */
function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/** Local formatting — date, e.g. "Jul 30, 2025". */
function formatDate(isoDate: string): string {
  return dayjs(isoDate).format('MMM D, YYYY')
}

/** Whether a category counts as money in (see types). */
export function isMoneyIn(category: string): boolean {
  return (MONEY_IN_CATEGORIES as readonly string[]).includes(category)
}

export function isMoneyOut(category: string): boolean {
  return !isMoneyIn(category)
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  // Local display concern: newest transactions first.
  const sorted = [...transactions].sort((a, b) =>
    dayjs(b.date).valueOf() - dayjs(a.date).valueOf(),
  )

  return (
    <section
      aria-label="Transactions"
      className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Card</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-slate-100 ${t.amount > 200 ? "bg-red-50" : "border-slate-100"} last:border-0 hover:bg-slate-50`}
              >
                <td className="px-5 py-3 text-slate-500">{formatDate(t.date)}</td>
                <td className="px-5 py-3 text-slate-700">{t.cardName}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                    {t.category}
                  </span>
                </td>
                <td
                  className={`px-5 py-3 text-right font-semibold tabular-nums ${isMoneyIn(t.category)
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                    }`}
                >
                  {isMoneyIn(t.category) ? '+' : '-'}
                  {formatCurrency(t.amount, t.currency)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                  No transactions found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
