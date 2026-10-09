/**
 * Data-access seam.
 *
 * Every component talks to the backend only through this module, so the rest
 * of the app never knows (or cares) where the rows come from.
 *
 * Two modes:
 *  - LIVE      — the Express backend in `backend/` is reachable, so reads and
 *                writes go through `/api/...` (proxied by Vite in dev).
 *  - OFFLINE   — nothing is listening on :3001, so reads fall back to the
 *                bundled JSON seed and writes are applied locally. This keeps
 *                the demo working with a single `npm run dev`.
 *
 * TODO (exercise — update): add `updateTransaction(id, patch)` -> PATCH /api/transactions/:id
 * TODO (exercise — delete): add `deleteTransaction(id)`       -> DELETE /api/transactions/:id
 *                            Both already have backend stubs and store helpers. See CRUD-EXERCISE.md.
 */
import transactionsData from '@/data/transactions.json'
import type { NewTransaction, Transaction } from '@/types'

const API_BASE = '/api'

/** Simulated latency for the offline path, so loading states stay visible. */
const LATENCY_MS = 300

/** null = not probed yet. Cached so we only ping /api/health once. */
let backendReachable: boolean | null = null

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Is the Express backend up? Probed once and memoised.
 * The app is designed to be demo-able with or without it.
 */
async function isBackendReachable(): Promise<boolean> {
  if (backendReachable !== null) return backendReachable

  try {
    const response = await fetch(`${API_BASE}/health`)
    backendReachable = response.ok
  } catch {
    backendReachable = false
  }

  if (!backendReachable) {
    console.info(
      '[api] Backend not reachable — falling back to the bundled seed data. ' +
        'Run `npm run dev` in backend/ to use the live API.',
    )
  }

  return backendReachable
}

/** Pull a readable message out of the backend's `{ error: { message } }` shape. */
async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null
  return body?.error?.message ?? `${fallback} (HTTP ${response.status})`
}

/** All transactions, newest first. */
export async function listTransactions(): Promise<Transaction[]> {
  if (await isBackendReachable()) {
    const response = await fetch(`${API_BASE}/transactions`)
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Could not load transactions'))
    }
    return (await response.json()) as Transaction[]
  }

  await delay(LATENCY_MS)
  return transactionsData as Transaction[]
}

/**
 * Create a transaction.
 *
 * This is the WORKED REFERENCE for the update/delete tasks you are about to
 * write: same shape as the backend's POST handler, same error handling.
 */
export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  if (await isBackendReachable()) {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Could not save the transaction'))
    }

    return (await response.json()) as Transaction
  }

  // Offline: apply it locally so the UI still demos end to end.
  await delay(LATENCY_MS)
  return { ...input, id: crypto.randomUUID() }
}
