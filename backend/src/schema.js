/**
 * Zod schemas for the transaction API.
 *
 * `frontend/src/types/index.ts` already declares the matching TypeScript
 * types (`Transaction` / `NewTransaction`). These schemas are the runtime
 * version of that same contract — the frontend types are erased at build
 * time, the schemas actually reject bad requests.
 *
 *  - TransactionSchema        a complete stored row (`id` included)
 *  - NewTransactionSchema     a POST body — the server assigns the `id`
 *  - UpdateTransactionSchema  a PATCH body — every field optional
 */
import { z } from 'zod'

/** ISO-4217-style currency code: exactly three letters, e.g. "USD". */
const currency = z
  .string()
  .regex(/^[A-Za-z]{3}$/, 'currency must be a 3-letter code, e.g. "USD"')
  .default('USD')

/**
 * A calendar date-time. `offset: true` accepts a UTC "Z" *and* an explicit
 * offset such as "+07:00", both of which are valid ISO 8601 instants.
 * A bare "2025-07-30" is rejected on purpose — we store instants, not days.
 */
const date = z.string().datetime({ offset: true })

/** A money amount: a finite number, strictly greater than zero. */
const amount = z.number().positive().finite()

/** A complete transaction, as stored and as returned by the API. */
export const TransactionSchema = z.object({
  id: z.string().min(1),
  cardName: z.string().trim().min(1),
  isCredit: z.boolean(),
  category: z.string().trim().min(1),
  amount,
  date,
  currency,
})

/**
 * A `POST /api/transactions` body: the same fields, minus `id` (the server
 * generates it). `currency` is optional and defaults to "USD".
 * Unknown keys are stripped, so a client cannot smuggle in its own `id`.
 */
export const NewTransactionSchema = z.object({
  cardName: z.string().trim().min(1),
  isCredit: z.boolean(),
  category: z.string().trim().min(1),
  amount,
  date,
  currency,
})

/**
 * A `PATCH /api/transactions/:id` body: every field optional.
 *
 * Gotcha worth knowing: `currency` keeps its "USD" default, so a successfully
 * parsed patch ALWAYS has a `currency` key, even when the request omitted it.
 * Spread the patch over the existing row deliberately — see the
 * TODO (exercise — update) note in src/routes/transactions.js.
 */
export const UpdateTransactionSchema = NewTransactionSchema.partial()

/**
 * Types inferred from the schemas above. This is a JavaScript project, so the
 * types travel in JSDoc; other modules import them like this:
 *
 *   @type {import('../schema.js').Transaction}
 *
 * @typedef {import('zod').infer<typeof TransactionSchema>} Transaction
 * @typedef {import('zod').infer<typeof NewTransactionSchema>} NewTransaction
 * @typedef {import('zod').infer<typeof UpdateTransactionSchema>} UpdateTransaction
 */
