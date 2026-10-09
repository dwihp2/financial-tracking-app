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
 * `.strict()` REJECTS unknown keys rather than stripping them, so a client
 * cannot smuggle in its own `id` — it gets a 400 instead.
 */
export const NewTransactionSchema = TransactionSchema.omit({ id: true }).strict()

/**
 * A `PATCH /api/transactions/:id` body: every field optional.
 *
 * `currency` is omitted ON PURPOSE. It carries a "USD" `.default()`, and a
 * default on a partial-update schema is injected into every parsed patch — so
 * `PATCH { amount: 5 }` would quietly rewrite the row's currency to "USD".
 * Defaults belong on create, not on update.
 *
 * Consequence: `currency` is immutable after creation, and sending it is
 * rejected as an unknown key (400) rather than silently ignored. That is the
 * intended behaviour — relabelling a recorded amount in a different currency
 * would misrepresent what actually happened.
 *
 * TODO: if you ever add another `.default()` to NewTransactionSchema, omit that
 * field here too, or the same bug returns for it.
 */
export const UpdateTransactionSchema = NewTransactionSchema.omit({ currency: true }).partial()

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
