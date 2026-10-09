/**
 * FinancialSummary — the "Money In / Money Out / Balance" cards.
 *
 * Exercise rule: this component does NOT own any state. It receives the
 * three summary numbers as props from App and only handles local
 * presentation (formatting, colors, layout).
 */
import type { ReactNode } from 'react'

interface FinancialSummaryProps {
  moneyIn: number
  moneyOut: number
  balance: number
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
}: FinancialSummaryProps) {
  return (
    <section
      aria-label="Financial summary"
      className="grid gap-4 sm:grid-cols-3"
    >
      <SummaryCard
        label="Money In"
        amount={moneyIn}
        accent="text-emerald-600"
        icon={<ArrowUpIcon />}
      />
      <SummaryCard
        label="Money Out"
        amount={moneyOut}
        accent="text-rose-600"
        icon={<ArrowDownIcon />}
      />
      <SummaryCard
        label="Balance"
        amount={balance}
        accent="text-slate-900"
        icon={<WalletIcon />}
      />
    </section>
  )
}

interface SummaryCardProps {
  label: string
  amount: number
  accent: string
  icon: ReactNode
}

function SummaryCard({ label, amount, accent, icon }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-2xl font-bold tabular-nums ${accent}`}>
        {formatCurrency(amount)}
      </p>
    </div>
  )
}

// Inline icons (small, dependency-free).
function ArrowUpIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l5-5 5 5"
      />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 7l-5 5-5-5"
      />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5.5Z"
      />
      <path strokeLinecap="round" d="M3 8h14" />
    </svg>
  )
}
