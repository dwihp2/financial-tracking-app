import { useState } from 'react'
import type { FormEvent } from 'react'
import dayjs from 'dayjs'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { NewTransaction, Transaction } from '@/types'

/**
 * AddTransactionDialog — the shared transaction form, used for BOTH create
 * and edit (the reuse CRUD-EXERCISE.md Task D asks for, instead of a
 * copy-pasted twin):
 *
 *  - create: no `initialValue`; the form starts empty and App's onSubmit POSTs.
 *  - edit:   `initialValue` is the row; the form starts pre-filled and App's
 *            onSubmit PATCHes that row.
 *
 * OPEN STATE belongs to App (`open` / `onOpenChange`), not to this component:
 * the row menu unmounts its content the moment an item is picked, and a
 * dialog rendered inside that menu flicked open and died in the same click.
 * One controlled instance, mounted outside the menu, fixes that.
 *
 * STATE NOTE: the draft below is deliberately component-local. It is
 * ephemeral form state, discarded the moment the dialog closes — it is not
 * app data. The transaction itself still lives in App (see the exercise rule
 * in requirements.md §3), and App remains the only owner of `transactions`.
 */
interface AddTransactionDialogProps {
  /** Existing card names, used to populate the card select. */
  cards: string[]
  /** Existing categories, used to populate the category select. */
  categories: string[]
  /** Called with a validated payload. App persists it and updates its state. */
  onSubmit: (input: NewTransaction) => Promise<void>
  /** Controlled open state — owned by App so the row menu can close without unmounting the dialog. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The row being edited. Set for edit mode (form opens pre-filled); omit to create. */
  initialValue?: Transaction
  /** Optional override for the heading. Defaults by mode: "Add transaction" / "Edit transaction". */
  title?: string
  /** Optional override for the submit button. Defaults by mode: "Save transaction" / "Save changes". */
  submitLabel?: string
}

interface TransactionFormProps {
  cards: string[]
  categories: string[]
  initialValue?: Transaction
  submitLabel: string
  onSubmit: (input: NewTransaction) => Promise<void>
  isSubmitting: boolean
  onSubmittingChange: (isSubmitting: boolean) => void
  /** Close the dialog — used by Cancel and after a successful save. */
  onClose: () => void
}

/** The starting draft: empty for create, a copy of the row for edit. */
function draftFrom(transaction?: Transaction): Draft {
  if (!transaction) return emptyDraft()
  return {
    date: dayjs(transaction.date).format('YYYY-MM-DD'),
    cardName: transaction.cardName,
    category: transaction.category,
    amount: String(transaction.amount),
    isCredit: transaction.isCredit,
  }
}

interface Draft {
  date: string // "YYYY-MM-DD"
  cardName: string
  category: string
  amount: string // kept as a string so the input can be empty
  isCredit: boolean
}

interface DraftErrors {
  date?: string
  cardName?: string
  category?: string
  amount?: string
}

function emptyDraft(): Draft {
  return {
    date: dayjs().format('YYYY-MM-DD'),
    cardName: '',
    category: '',
    amount: '',
    isCredit: true,
  }
}

/** Local (internal) validation — mirrors NewTransactionSchema on the backend. */
function validate(draft: Draft): DraftErrors {
  const errors: DraftErrors = {}

  if (!draft.date) errors.date = 'Pick a date.'
  if (!draft.cardName) errors.cardName = 'Pick a card.'
  if (!draft.category) errors.category = 'Pick a category.'

  const amount = Number(draft.amount)
  if (draft.amount.trim() === '') {
    errors.amount = 'Enter an amount.'
  } else if (!Number.isFinite(amount)) {
    errors.amount = 'Amount must be a number.'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than zero.'
  }

  return errors
}

export default function AddTransactionDialog({
  cards,
  categories,
  onSubmit,
  open,
  onOpenChange,
  initialValue,
  title,
  submitLabel,
}: AddTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = initialValue !== undefined

  // Ignore dismissal while a save is in flight: the write cannot be aborted,
  // so letting Escape close now would save edits the user tried to cancel.
  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {title ?? (isEdit ? 'Edit transaction' : 'Add transaction')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this movement. Saving replaces the existing row.'
              : 'Record a new movement. It is added to the top of the list.'}
          </DialogDescription>
        </DialogHeader>

        <TransactionForm
          cards={cards}
          categories={categories}
          initialValue={initialValue}
          submitLabel={submitLabel ?? (isEdit ? 'Save changes' : 'Save transaction')}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onSubmittingChange={setIsSubmitting}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * The form body. It lives inside DialogContent on purpose: Radix unmounts
 * that subtree when the dialog closes, so the draft, the errors and the
 * pending state are discarded with it — the next open always starts from a
 * clean (or freshly pre-filled) draft, with no reset bookkeeping and no
 * flash of stale values during the close animation.
 */
function TransactionForm({
  cards,
  categories,
  initialValue,
  submitLabel,
  onSubmit,
  isSubmitting,
  onSubmittingChange,
  onClose,
}: TransactionFormProps) {
  // Seeded once per mount: empty for create, the edited row for edit.
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initialValue))
  const [errors, setErrors] = useState<DraftErrors>({})

  const patch = (changes: Partial<Draft>) =>
    setDraft((previous) => ({ ...previous, ...changes }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const nextErrors = validate(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmittingChange(true)
    try {
      await onSubmit({
        date: dayjs(draft.date).toISOString(),
        cardName: draft.cardName,
        category: draft.category,
        amount: Number(draft.amount),
        isCredit: draft.isCredit,
        currency: 'USD',
      })
      onClose()
    } catch {
      // App already surfaced the failure with a toast. Keep the dialog open
      // so the user does not lose what they typed.
    } finally {
      onSubmittingChange(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.date) || undefined}>
          <FieldLabel htmlFor="tx-date">Date</FieldLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="tx-date"
                type="button"
                variant="outline"
                className="w-full justify-start font-normal"
              >
                <CalendarIcon data-icon="inline-start" />
                {draft.date ? dayjs(draft.date).format('MMM D, YYYY') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={draft.date ? dayjs(draft.date).toDate() : undefined}
                onSelect={(date) =>
                  patch({ date: date ? dayjs(date).format('YYYY-MM-DD') : '' })
                }
                autoFocus
              />
            </PopoverContent>
          </Popover>
          {errors.date && <FieldError>{errors.date}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(errors.cardName) || undefined}>
          <FieldLabel htmlFor="tx-card">Card</FieldLabel>
          <Select
            value={draft.cardName}
            onValueChange={(value) => patch({ cardName: value })}
          >
            <SelectTrigger id="tx-card" className="w-full">
              <SelectValue placeholder="Select a card" />
            </SelectTrigger>
            <SelectContent>
              {cards.map((card) => (
                <SelectItem key={card} value={card}>
                  {card}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.cardName && <FieldError>{errors.cardName}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(errors.category) || undefined}>
          <FieldLabel htmlFor="tx-category">Category</FieldLabel>
          <Select
            value={draft.category}
            onValueChange={(value) => patch({ category: value })}
          >
            <SelectTrigger id="tx-category" className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <FieldError>{errors.category}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(errors.amount) || undefined}>
          <FieldLabel htmlFor="tx-amount">Amount (USD)</FieldLabel>
          <Input
            id="tx-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={draft.amount}
            onChange={(event) => patch({ amount: event.target.value })}
            aria-invalid={Boolean(errors.amount) || undefined}
          />
          {errors.amount && <FieldError>{errors.amount}</FieldError>}
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="tx-credit">Credit account</FieldLabel>
          <Switch
            id="tx-credit"
            checked={draft.isCredit}
            onCheckedChange={(checked) => patch({ isCredit: checked })}
          />
        </Field>
      </FieldGroup>

      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" data-icon="inline-start" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
