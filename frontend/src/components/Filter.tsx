import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Direction, FilterState } from '@/types'

/**
 * Filter — month / direction / card / category / search controls + clear.
 *
 * Exercise rule: this component does NOT own state. The filter state lives
 * in App; this component renders the controls and reports the NEXT
 * FilterState back up through `onFilterChange`.
 *
 * NOTE: the original version had one callback per control (onMonthChange,
 * onCardChange, …). With five controls that became six props and six
 * handlers in App, so it was collapsed into a single `onFilterChange(next)`.
 * The rule is unchanged — state still lives in App, events still flow up.
 */
interface FilterProps {
  filterState: FilterState
  /** Distinct card names, alphabetically sorted. */
  cards: string[]
  /** Distinct categories, alphabetically sorted. */
  categories: string[]
  /** Months that actually contain transactions, as "YYYY-MM", newest first. */
  months: string[]
  /** Rows left after filtering. */
  resultCount: number
  /** Rows before filtering. */
  totalCount: number
  onFilterChange: (next: FilterState) => void
  onClear: () => void
}

/** Radix Select reserves "" for "cleared", so use a sentinel for "all months". */
const ALL_MONTHS = 'all'

/** Local (internal): how many filters are actually narrowing the data. */
function countActiveFilters(filter: FilterState): number {
  let count = 0
  if (filter.month !== '') count++
  if (filter.selectedCards.length > 0) count++
  if (filter.selectedCategories.length > 0) count++
  if (filter.direction !== 'all') count++
  if (filter.search.trim() !== '') count++
  return count
}

export default function Filter({
  filterState,
  cards,
  categories,
  months,
  resultCount,
  totalCount,
  onFilterChange,
  onClear,
}: FilterProps) {
  const activeCount = countActiveFilters(filterState)
  const isDirty = activeCount > 0

  // Rendered twice: inline on large screens, inside the sheet on small ones.
  // (`hidden` is display:none, so the inactive copy is out of the a11y tree.)
  const fields = (
    <FilterFields
      filterState={filterState}
      cards={cards}
      categories={categories}
      months={months}
      onFilterChange={onFilterChange}
    />
  )

  return (
    <section aria-label="Filters" className="mt-6">
      {/* Desktop / tablet: everything inline in one card. */}
      <Card className="hidden lg:block">
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm font-medium">Filters</h2>
              {activeCount > 0 && <Badge variant="secondary">{activeCount} active</Badge>}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground tabular-nums">
                {resultCount.toLocaleString()} of {totalCount.toLocaleString()} transactions
              </p>
              <Button variant="outline" size="sm" onClick={onClear} disabled={!isDirty}>
                <X data-icon="inline-start" />
                Clear
              </Button>
            </div>
          </div>
          {fields}
        </CardContent>
      </Card>

      {/* Mobile / small screens: same fields inside a slide-over sheet. */}
      <div className="flex items-center gap-3 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal data-icon="inline-start" />
              Filters
              {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Showing {resultCount.toLocaleString()} of {totalCount.toLocaleString()}{' '}
                transactions.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-5 px-4 pb-6">
              {fields}
              <Button variant="outline" onClick={onClear} disabled={!isDirty}>
                <X data-icon="inline-start" />
                Clear filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <p className="text-sm text-muted-foreground tabular-nums">
          {resultCount.toLocaleString()} of {totalCount.toLocaleString()} transactions
        </p>
      </div>
    </section>
  )
}

interface FilterFieldsProps {
  filterState: FilterState
  cards: string[]
  categories: string[]
  months: string[]
  onFilterChange: (next: FilterState) => void
}

/**
 * The actual controls. Shared by the desktop card and the mobile sheet so
 * the two can never drift apart.
 */
function FilterFields({
  filterState,
  cards,
  categories,
  months,
  onFilterChange,
}: FilterFieldsProps) {
  // Month is stored as the first day ("2025-07-01") but the picker works in
  // "YYYY-MM", so convert in both directions here.
  const monthValue =
    filterState.month === '' ? ALL_MONTHS : dayjs(filterState.month).format('YYYY-MM')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Control label="Month">
          <Select
            value={monthValue}
            onValueChange={(value) =>
              onFilterChange({
                ...filterState,
                month: value === ALL_MONTHS ? '' : dayjs(`${value}-01`).format('YYYY-MM-DD'),
              })
            }
          >
            <SelectTrigger className="w-full" aria-label="Filter by month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MONTHS}>All months</SelectItem>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {dayjs(`${month}-01`).format('MMM YYYY')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>

        <Control label="Direction">
          <ToggleGroup
            type="single"
            variant="outline"
            value={filterState.direction}
            // Radix reports "" when the active item is toggled off — treat
            // that as "all" so one option is always selected.
            onValueChange={(value) =>
              onFilterChange({ ...filterState, direction: (value || 'all') as Direction })
            }
            className="w-full"
            aria-label="Filter by money direction"
          >
            <ToggleGroupItem value="all" className="flex-1">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="in" className="flex-1">
              In
            </ToggleGroupItem>
            <ToggleGroupItem value="out" className="flex-1">
              Out
            </ToggleGroupItem>
          </ToggleGroup>
        </Control>

        <Control label="Search">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={filterState.search}
              onChange={(event) =>
                onFilterChange({ ...filterState, search: event.target.value })
              }
              placeholder="Card or category…"
              aria-label="Search by card or category"
              className="pl-8"
            />
          </div>
        </Control>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Control
          label="Cards"
          hint={
            filterState.selectedCards.length === 0
              ? 'All cards'
              : `${filterState.selectedCards.length} selected`
          }
        >
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={filterState.selectedCards}
            onValueChange={(value) =>
              onFilterChange({ ...filterState, selectedCards: value })
            }
            className="flex-wrap"
            aria-label="Filter by card"
          >
            {cards.map((card) => (
              <ToggleGroupItem key={card} value={card}>
                {card}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Control>

        <Control
          label="Categories"
          hint={
            filterState.selectedCategories.length === 0
              ? 'All categories'
              : `${filterState.selectedCategories.length} selected`
          }
        >
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={filterState.selectedCategories}
            onValueChange={(value) =>
              onFilterChange({ ...filterState, selectedCategories: value })
            }
            className="flex-wrap"
            aria-label="Filter by category"
          >
            {categories.map((category) => (
              <ToggleGroupItem key={category} value={category} className="capitalize">
                {category}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Control>
      </div>
    </div>
  )
}

interface ControlProps {
  label: string
  hint?: string
  children: ReactNode
}

/** Local layout helper: a small uppercase label above a control. */
function Control({ label, hint, children }: ControlProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
