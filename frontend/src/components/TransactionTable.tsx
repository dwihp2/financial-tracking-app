import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import { SearchX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { isMoneyIn } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

/**
 * TransactionTable — lists the (already filtered) transactions.
 *
 * DELIBERATELY a plain <table>: the brief asks for a hand-rolled table rather
 * than the shadcn DataTable recipe. Only the colours were moved onto the
 * theme's design tokens; the markup is unchanged.
 *
 * Exercise rule: this component does NOT own state. App passes the
 * filtered list down as `transactions`. Filtering happens in App; this
 * component only handles local presentation (date/currency formatting,
 * sorting, colours).
 */
interface TransactionTableProps {
  transactions: Transaction[]
  /** Optional header slot — used for the "Add transaction" button. */
  actions?: ReactNode
  rowActions?: (transaction: Transaction) => ReactNode
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

export default function TransactionTable({ transactions, actions, rowActions }: TransactionTableProps) {
  // Local display concern: newest transactions first.
  const sorted = [...transactions].sort(
    (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf(),
  )

  return (
    <section
      aria-label="Transactions"
      className="mt-6 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-sm font-medium">Transactions</h2>
          <Badge variant="secondary" className="tabular-nums">
            {sorted.length.toLocaleString()}
          </Badge>
        </div>
        {actions}
      </div>

      {/* Empty state */}
      {sorted.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No transactions found</EmptyTitle>
            <EmptyDescription>
              No rows match the selected filters. Try a different month or clear a
              filter.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          {/*
            min-w keeps the table readable on small screens: without it the
            cells squeeze and "Personal Debit Card" wraps onto three lines.
            With it, overflow-x-auto gives a normal horizontal scroll instead.
          */}
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-5 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Card
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Category
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const moneyIn = isMoneyIn(t.category)
                // Local presentation rule carried over from the original app:
                // flag unusually large movements (>= $200) with a neutral tint.
                // TODO (exercise): confirm this is still the intended rule —
                // it was undocumented and previously rendered as red-50.
                const isLarge = t.amount > 200

                return (
                  <tr
                    key={t.id}
                    className={cn(
                      'border-b border-border/40 transition-colors last:border-0',
                      isLarge ? 'bg-muted/50 hover:bg-muted' : 'hover:bg-muted/40',
                    )}
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-foreground">
                      {t.cardName}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="capitalize">
                        {t.category}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        'px-5 py-3 text-right font-semibold tabular-nums',
                        moneyIn ? 'text-income' : 'text-expense',
                      )}
                    >
                      {moneyIn ? '+' : '-'}
                      {formatCurrency(t.amount, t.currency)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {/*
                          The "Edit" and "Delete" buttons are passed down from App
                          as `actions` so that the table itself remains stateless.
                        */}
                        {rowActions?.(t)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
