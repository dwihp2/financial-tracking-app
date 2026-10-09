/**
 * Express backend for the Financial Tracking App.
 *
 *   GET  /api/health                     liveness probe
 *   GET  /api/transactions[?filters]     list, newest first
 *   GET  /api/transactions/:id           one row
 *   POST /api/transactions               create
 *   PATCH/DELETE /api/transactions/:id   501 — TODO (exercise)
 *   GET  /api/cards                      distinct card names
 *   GET  /api/categories                 distinct categories
 *
 * Routes live in src/routes/transactions.js, the data layer in src/store.js.
 * The Vite dev server proxies `/api` here, so the frontend can call these on
 * its own origin (see frontend/src/lib/api.ts).
 *
 * Run with `npm run dev` (watch mode) or `npm start`.
 */
import cors from 'cors'
import express from 'express'
import transactionsRouter from './routes/transactions.js'
import { initStore } from './store.js'

const app = express()
const PORT = process.env.PORT ?? 3001

// The frontend is served from another origin in dev, so CORS stays open in
// this demo. Tighten it to the Vite origin if this ever leaves localhost.
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', transactionsRouter)

// Anything that fell through the routes above is a 404. Same error shape as
// the handlers in src/routes/transactions.js, so the client only parses one.
app.use((req, res) => {
  res.status(404).json({ error: { message: `Not found: ${req.method} ${req.originalUrl}` } })
})

/**
 * Final error handler — four arguments, which is how Express recognises it.
 * Everything an async route throws (Express 5 forwards rejected promises) ends
 * up here, as does a malformed JSON body from `express.json()`.
 */
app.use((error, _req, res, _next) => {
  // body-parser tags its SyntaxError with `status`/`statusCode` = 400.
  const status = error.status ?? error.statusCode ?? 500

  // A 4xx is the caller's problem and safe to describe; a 5xx is ours and its
  // message may leak internals, so log the detail and answer generically.
  if (status >= 500) console.error(error)

  res.status(status).json({
    error: { message: status >= 500 ? 'Internal server error' : error.message },
  })
})

// Load the store BEFORE listening: the first request must never see an empty
// list, and a broken store should fail loudly at boot rather than per request.
try {
  const count = await initStore()
  console.log(`Store ready: ${count} transactions`)
} catch (error) {
  console.error('Could not load the transaction store:', error)
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
