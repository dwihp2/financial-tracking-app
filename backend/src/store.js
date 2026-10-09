/**
 * Transaction store — one in-memory array plus JSON persistence.
 *
 * Two data files, both in `src/data/`:
 *  - `seed.json`          the pristine seed: committed, never written to
 *  - `transactions.json`  the LIVE store: gitignored, written after every
 *                         change, created from the seed on first run
 *
 * Two guarantees the rest of the app leans on:
 *
 *  1. Writes are atomic. The new JSON goes to a temp file in the SAME
 *     directory and is then `fs.rename`d over the store. rename(2) is atomic
 *     on POSIX, so a reader (or a crash) sees either the whole old file or the
 *     whole new one — never a half-written store.
 *
 *  2. Writes are serialised. Every mutation is chained onto one promise queue,
 *     so two concurrent POSTs cannot interleave: the file always ends up
 *     matching the last mutation, not an arbitrary one of them.
 *
 * Reads are synchronous and cheap (the data is already in memory). Writes are
 * async because they touch the disk.
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** `src/data/` — resolved from this file, not from the process cwd. */
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')

/** Pristine, committed seed data. */
const SEED_FILE = path.join(DATA_DIR, 'seed.json')

/** The live store. Gitignored; re-created from SEED_FILE whenever it is missing. */
export const STORE_FILE = path.join(DATA_DIR, 'transactions.json')

/** @type {import('./schema.js').Transaction[]} */
let transactions = []

/** The first load, in flight or done — so the disk is read exactly once. */
let loading = null

/** Tail of the write queue; see `serialise()`. */
let writeQueue = Promise.resolve()

/**
 * Read the live store into memory, seeding it from `seed.json` the first time.
 * Idempotent: call it as often as you like, the work happens once.
 *
 * @returns {Promise<number>} how many transactions are in the store
 */
export function initStore() {
  loading ??= load()
  return loading
}

/**
 * Throw the live store away and rebuild it from the seed. This is what
 * `npm run seed` runs, to undo whatever manual testing did to the data.
 *
 * @returns {Promise<number>} how many transactions the store holds afterwards
 */
export function resetStore() {
  return mutate(async () => {
    transactions = parse(await fs.readFile(SEED_FILE, 'utf8'), SEED_FILE)
    return transactions.length
  })
}

/**
 * Every transaction, newest first.
 * Returns copies, so callers may sort/filter/mutate the result freely without
 * touching what the store holds.
 *
 * @returns {import('./schema.js').Transaction[]}
 */
export function listTransactions() {
  return transactions
    .map((tx) => ({ ...tx }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}

/**
 * One transaction by id.
 *
 * @param {string} id
 * @returns {import('./schema.js').Transaction | undefined} a copy, or
 *          `undefined` when no row has that id
 */
export function getTransaction(id) {
  const found = transactions.find((tx) => tx.id === id)
  return found ? { ...found } : undefined
}

/**
 * Append a transaction, assigning a fresh `id`.
 * Fields are copied explicitly so the stored row always has the canonical key
 * order (and so nothing the caller passes in can override the new `id`).
 *
 * @param {import('./schema.js').NewTransaction} input already validated
 * @returns {Promise<import('./schema.js').Transaction>} the stored row
 */
export function createTransaction(input) {
  const row = {
    id: randomUUID(),
    cardName: input.cardName,
    isCredit: input.isCredit,
    category: input.category,
    amount: input.amount,
    date: input.date,
    currency: input.currency ?? 'USD',
  }

  return mutate(() => {
    transactions.push(row)
    return { ...row }
  })
}

/**
 * Merge `patch` into the transaction with `id`.
 * `id` itself is immutable — a patch cannot re-key a row.
 *
 * @param {string} id
 * @param {import('./schema.js').UpdateTransaction} patch
 * @returns {Promise<import('./schema.js').Transaction | undefined>} the
 *          updated row, or `undefined` when no row has that id (nothing is
 *          written in that case)
 */
export function updateTransaction(id, patch) {
  return mutate(() => {
    const index = transactions.findIndex((tx) => tx.id === id)
    if (index === -1) return undefined

    const { id: _ignored, ...rest } = patch ?? {}
    const updated = { ...transactions[index], ...rest, id }
    transactions[index] = updated
    return { ...updated }
  })
}

/**
 * Remove the transaction with `id`.
 *
 * @param {string} id
 * @returns {Promise<import('./schema.js').Transaction | undefined>} the
 *          removed row, or `undefined` when no row has that id
 */
export function deleteTransaction(id) {
  return mutate(() => {
    const index = transactions.findIndex((tx) => tx.id === id)
    if (index === -1) return undefined

    const [removed] = transactions.splice(index, 1)
    return removed
  })
}

/**
 * First-run load: the live file when it exists, otherwise a copy of the seed.
 *
 * @returns {Promise<number>}
 */
async function load() {
  try {
    transactions = parse(await fs.readFile(STORE_FILE, 'utf8'), STORE_FILE)
  } catch (error) {
    // Only a missing live file is expected — anything else (bad JSON, bad
    // permissions) should stop the server rather than silently reset data.
    if (error.code !== 'ENOENT') throw error

    transactions = parse(await fs.readFile(SEED_FILE, 'utf8'), SEED_FILE)
    await writeStore()
    console.log(`Seeded ${transactions.length} transactions into ${STORE_FILE}`)
  }

  return transactions.length
}

/**
 * Parse a store/seed file. Kept separate so both files get the same guard.
 *
 * @param {string} raw
 * @param {string} file used in the error message
 * @returns {import('./schema.js').Transaction[]}
 */
function parse(raw, file) {
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`${file} must contain a JSON array of transactions`)
  }
  return parsed
}

/**
 * Save the whole in-memory array, atomically.
 *
 * `JSON.stringify` runs here, inside the write queue, so the snapshot written
 * is always the state at the moment this write got its turn — not a stale one.
 */
async function writeStore() {
  const payload = `${JSON.stringify(transactions, null, 2)}\n`
  const tempFile = `${STORE_FILE}.${process.pid}.${Date.now()}.tmp`

  await fs.writeFile(tempFile, payload, 'utf8')
  await fs.rename(tempFile, STORE_FILE)
}

/**
 * Run `task` after every previously queued task, so two writes never overlap.
 * A rejected task does not wedge the queue — the caller still sees the error.
 *
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
function serialise(task) {
  const result = writeQueue.then(task)
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

/**
 * Apply `change` to the in-memory array, then persist the result.
 * A change that returns `undefined` means "nothing happened" (e.g. the id did
 * not exist), so the file is left alone.
 *
 * @template T
 * @param {() => T | Promise<T>} change
 * @returns {Promise<T>}
 */
function mutate(change) {
  return serialise(async () => {
    // A write before initStore() would persist an empty array over real data.
    await initStore()

    const result = await change()
    if (result !== undefined) await writeStore()
    return result
  })
}
