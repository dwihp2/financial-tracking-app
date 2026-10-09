/**
 * FinancialSummary — the "Money In / Money Out / Balance" cards.
 *
 * Exercise rule: this component does NOT own any state. It receives the
 * three summary numbers as props from App and only handles local
 * presentation (formatting, colours, layout).
 */
import type { ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FinancialSummaryProps {
  moneyIn: number
  moneyOut: number
  balance: number
  /** How many transactions the totals were computed from (after filtering). */
  transactionCount: number
}

/** Local (internal) formatting — lives in the component, not App. */
function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export default function FinancialSummary({
  moneyIn,
  moneyOut,
  balance,
  transactionCount,
}: FinancialSummaryProps) {
  // Local (internal) calculation: each direction's share of total movement.
  const totalMovement = moneyIn + moneyOut
  const shareOf = (part: number) =>
    totalMovement === 0 ? 0 : Math.round((part / totalMovement) * 100)

  return (
    <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-3">
      <SummaryCard
        label="Money In"
        amount={moneyIn}
        note={`${shareOf(moneyIn)}% of all movement`}
        icon={<ArrowUpRight />}
        valueClassName="text-income"
        chipClassName="bg-income-muted text-income"
      />
      <SummaryCard
        label="Money Out"
        amount={moneyOut}
        note={`${shareOf(moneyOut)}% of all movement`}
        icon={<ArrowDownLeft />}
        valueClassName="text-expense"
        chipClassName="bg-expense-muted text-expense"
      />
      <SummaryCard
        label="Balance"
        amount={balance}
        note={`Money in minus money out · ${transactionCount.toLocaleString()} transactions`}
        icon={<Wallet />}
        valueClassName="text-foreground"
        chipClassName="bg-muted text-muted-foreground"
      />
    </section>
  )
}

interface SummaryCardProps {
  label: string
  amount: number
  note: string
  icon: ReactNode
  valueClassName: string
  chipClassName: string
}

function SummaryCard({
  label,
  amount,
  note,
  icon,
  valueClassName,
  chipClassName,
}: SummaryCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="font-medium">{label}</CardDescription>
        <CardAction>
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-lg [&_svg]:size-4',
              chipClassName,
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        </CardAction>
        <CardTitle className={cn('text-2xl font-semibold tabular-nums', valueClassName)}>
          {formatCurrency(amount)}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardHeader>
    </Card>
  )
}
