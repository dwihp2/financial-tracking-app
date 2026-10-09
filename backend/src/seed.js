/**
 * Reset the live store from the pristine seed — `npm run seed`.
 *
 * Useful after poking at the API by hand: it puts `src/data/transactions.json`
 * back to exactly the 1209 seed rows, so the next experiment starts clean.
 * The rewrite goes through the same atomic path as every other write.
 */
import { resetStore, STORE_FILE } from './store.js'

const count = await resetStore()

console.log(`Reset ${STORE_FILE} to ${count} seed transactions`)
