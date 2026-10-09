/**
 * Reset the live store from the pristine seed — `npm run seed`.
 *
 * Useful after poking at the API by hand: it puts `src/data/transactions.json`
 * back to exactly the 1209 seed rows, so the next experiment starts clean.
 * The rewrite goes through the same atomic path as every other write.
 *
 * NOTE: this runs in its OWN process. The store is held in memory, so a server
 * that is already running keeps serving its own copy until it restarts — the
 * file on disk is reset, the already-running process is not. Hence the
 * reminder below. (`node --watch` does not help: the JSON is read with
 * `fs.readFile`, not imported, so it is not a watched module.)
 */
import { resetStore, STORE_FILE } from './store.js'

const count = await resetStore()

console.log(`Reset ${STORE_FILE} to ${count} seed transactions`)
console.log('Restart the server (Ctrl-C, then `npm run dev`) to pick this up.')

