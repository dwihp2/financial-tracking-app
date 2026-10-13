/**
 * Transaction routes, mounted at `/api` by src/index.js.
 *
 *   GET    /api/transactions       list, newest first, with optional filters
 *   GET    /api/transactions/:id   one row, or 404
 *   POST   /api/transactions       create (201), validated by NewTransactionSchema
 *   PATCH  /api/transactions/:id   TODO (exercise — update): 501 for now
 *   DELETE /api/transactions/:id   TODO (exercise — delete): 501 for now
 *   GET    /api/cards              distinct card names, sorted
 *   GET    /api/categories         distinct categories, sorted
 *
 * The filters below mirror `applyFilters()` in frontend/src/App.tsx so the
 * two can be swapped without the UI changing behaviour. They combine with AND;
 * repeated params (`?card=A&card=B`) are OR-ed inside their own filter. A query
 * value that is not recognised is IGNORED rather than rejected — a filter is a
 * narrowing hint, not input worth erroring over.
 */
import { Router } from 'express'
import { NewTransactionSchema, UpdateTransactionSchema } from '../schema.js'
import { createTransaction, deleteTransaction, getTransaction, listTransactions, updateTransaction } from '../store.js'

const router = Router()

/** Money-in categories — the same rule as `MONEY_IN_CATEGORIES` in the frontend. */
const MONEY_IN_CATEGORIES = new Set(['transfer', 'interest'])

/** `YYYY-MM`, months 01–12 only. */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

/**
 * Express gives a repeated query param as an array, a single one as a string,
 * and a missing one as undefined. Normalise all three to an array of non-empty
 * trimmed strings.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
function toArray(value) {
  const values = Array.isArray(value) ? value : [value]

  return values
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
}

/**
 * Turn the raw query object into a normalised filter set. Anything unusable
 * (a malformed month, `direction=sideways`, a number where text was expected)
 * becomes "no filter" instead of a 400.
 *
 * @param {import('express').Request['query']} query
 */
function parseFilters(query) {
  const month = typeof query.month === 'string' && MONTH_PATTERN.test(query.month) ? query.month : ''

  return {
    month,
    cards: toArray(query.card),
    categories: toArray(query.category),
    // "all" (and anything unknown) means "both directions".
    direction: query.direction === 'in' || query.direction === 'out' ? query.direction : '',
    // A repeated ?search= is a client bug; the first value wins.
    search: toArray(query.search)[0]?.toLowerCase() ?? '',
  }
}

/**
 * Does one transaction survive every active filter?
 *
 * The month check uses the server's LOCAL calendar month, matching dayjs in
 * the browser (which also parses without a UTC plugin). The seed timestamps
 * are midday-adjacent UTC, so both agree on the month in practice.
 *
 * @param {import('../schema.js').Transaction} tx
 * @param {ReturnType<typeof parseFilters>} filters
 */
function matchesFilters(tx, filters) {
  if (filters.month !== '') {
    const date = new Date(tx.date)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (month !== filters.month) return false
  }

  // An unknown card/category name is not an error — it just matches nothing.
  if (filters.cards.length > 0 && !filters.cards.includes(tx.cardName)) return false
  if (filters.categories.length > 0 && !filters.categories.includes(tx.category)) return false

  if (filters.direction !== '') {
    const moneyIn = MONEY_IN_CATEGORIES.has(tx.category)
    if (filters.direction === 'in' ? !moneyIn : moneyIn) return false
  }

  if (filters.search !== '') {
    const haystack = `${tx.cardName} ${tx.category}`.toLowerCase()
    if (!haystack.includes(filters.search)) return false
  }

  return true
}

/**
 * Turn a ZodError into a readable list for the client: one entry per problem,
 * naming the offending field. `details` is an array (not a nested object) so
 * the frontend can render it line by line without guessing at the shape.
 *
 * @param {import('zod').ZodError} error
 * @returns {{ field: string, message: string }[]}
 */
function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(body)',
    message: issue.message,
  }))
}

/** GET /api/transactions — every row (optionally filtered), newest first. */
router.get('/transactions', (req, res) => {
  const filters = parseFilters(req.query)
  res.json(listTransactions().filter((tx) => matchesFilters(tx, filters)))
})

/** GET /api/cards — distinct card names, alphabetically sorted. */
router.get('/cards', (_req, res) => {
  const cards = [...new Set(listTransactions().map((tx) => tx.cardName))].sort()
  res.json(cards)
})

/** GET /api/categories — distinct categories, alphabetically sorted. */
router.get('/categories', (_req, res) => {
  const categories = [...new Set(listTransactions().map((tx) => tx.category))].sort()
  res.json(categories)
})

/** GET /api/transactions/:id — one row, or 404 with the shared error shape. */
router.get('/transactions/:id', (req, res) => {
  const found = getTransaction(req.params.id)

  if (!found) {
    return res.status(404).json({ error: { message: `No transaction with id "${req.params.id}"` } })
  }

  res.json(found)
})

/**
 * POST /api/transactions — create one row.
 *
 * This is the worked reference for a write endpoint: validate first, then hand
 * the parsed data to the store, then reply 201 with what was actually stored
 * (including the server-generated `id`). The 400 body carries `details` so the
 * client can show which field was wrong instead of a generic failure.
 */
router.post('/transactions', async (req, res) => {
  const parsed = NewTransactionSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        message: 'Invalid transaction',
        details: formatIssues(parsed.error),
      },
    })
  }

  const created = await createTransaction(parsed.data)
  res.status(201).json(created)
})

router.patch('/transactions/:id', async (req, res) => {
  const parsed = UpdateTransactionSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: { message: 'Invalid transaction', details: formatIssues(parsed.error) } })
  }

  const updated = await updateTransaction(req.params.id, parsed.data)

  if (!updated) {
    return res.status(404).json({ error: { message: `No transaction with id "${req.params.id}"` } })
  }

  res.status(200).json(updated)
})

router.delete('/transactions/:id', async (req, res) => {
  const deleted = await deleteTransaction(req.params.id)

  if (!deleted) {
    return res.status(404).json({ error: { message: `No transaction with id "${req.params.id}"` } })
  }

  // 200 + the removed row (rather than 204 + no body) so the client receives
  // what was removed without a second GET. Keep frontend/src/lib/api.ts in step.
  res.status(200).json(deleted)
})

export default router
