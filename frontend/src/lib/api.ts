/**
 * Data-access seam.
 *
 * Right now every function reads the bundled JSON seed, so the app works
 * with no backend running — handy for a demo.
 *
 * TODO (exercise — backend): when the Express API is ready (see
 * CRUD-EXERCISE.md), swap each body for a `fetch('/api/...')` call. App.tsx
 * talks only to this module, so it should not need to change.
 * The Vite dev server already proxies `/api` to http://localhost:3001.
 */
import transactionsData from '@/data/transactions.json'
import type { NewTransaction, Transaction } from '@/types'

/** Simulate a little network latency so loading states are visible in dev. */
const LATENCY_MS = 150

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** All transactions, newest first. */
export async function listTransactions(): Promise<Transaction[]> {
  await delay(LATENCY_MS)
  return transactionsData as Transaction[]
}

/**
 * TODO (exercise — create): POST the new transaction to the backend and
 * return the saved row (with the server-assigned `id`).
 *
 * This is the worked reference for the create path — see
 * AddTransactionDialog.tsx and CRUD-EXERCISE.md.
 */
export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  await delay(LATENCY_MS)
  return { ...input, id: crypto.randomUUID() }
}

/**
 * TODO (exercise — update): PATCH /api/transactions/:id
 * TODO (exercise — delete): DELETE /api/transactions/:id
 */
