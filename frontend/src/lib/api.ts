/**
 * Data-access seam.
 *
 * Every component talks to the backend only through this module, so the rest
 * of the app never knows (or cares) where the rows come from.
 *
 * Two modes:
 *  - LIVE      the Express backend in `backend/` is reachable, so reads and
 *              writes go through `/api/...` (proxied by Vite in dev).
 *  - OFFLINE   nothing is listening on :3001, so reads use the bundled JSON
 *              seed. Create and update are applied in memory. Delete throws,
 *              because the seed is read-only and there is nothing to delete.
 *
 * API surface: listTransactions, createTransaction, updateTransaction,
 * deleteTransaction.
 */
import transactionsData from '@/data/transactions.json'
import type { NewTransaction, Transaction, TransactionPatch } from '@/types'

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

/**
 * Update a transaction.
 *
 * Offline: returns the patched fields merged over `id`, which is NOT the same
 * shape the live API returns. The API echoes the whole row; this drops
 * `currency`, because a TransactionPatch never carries it. The table survives
 * only because `formatCurrency(amount, currency = 'USD')` has a default.
 *
 * TODO (exercise): offline updates should return a complete row. Pass the
 * existing transaction in, or keep a local copy of the seed to patch.
 */
export async function updateTransaction(
  id: string,
  patch: TransactionPatch,
): Promise<Transaction> {
  if (await isBackendReachable()) {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Could not update the transaction'))
    }

    return (await response.json()) as Transaction
  }

  await delay(LATENCY_MS)
  return { ...patch, id } as Transaction
}

/**
 * Delete a transaction and return the removed row.
 *
 * The API answers `200` with the row (not `204`), deliberately: the caller
 * gets back exactly what was removed, without a re-fetch.
 *
 * Offline: throws. The bundled seed is read-only, so there is nothing to
 * delete from. This is the one operation that does not work without the
 * backend, which is why the module header lists it as an exception.
 */
export async function deleteTransaction(id: string): Promise<Transaction> {
  if (await isBackendReachable()) {
    const response = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' })

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Could not delete the transaction'))
    }

    return (await response.json()) as Transaction
  }

  await delay(LATENCY_MS)
  throw new Error('Cannot delete a transaction while the backend is offline.')
}
