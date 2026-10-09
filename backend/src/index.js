/**
 * Express backend for the Financial Tracking App.
 *
 * ⚠️ OUT OF SCOPE — this is a placeholder for a LATER exercise.
 * See requirements.md §6. The frontend currently imports its data from a
 * local JSON file and does NOT call this server yet.
 *
 * TODO (later exercise):
 *  - Serve the transaction data from a REST endpoint:
 *      GET /api/transactions  ->  JSON array of transactions
 *  - Optionally support query params for filtering:
 *      ?month=YYYY-MM&card=CardName
 *  - Add CORS (cors package is already listed) or use a Vite dev proxy.
 *  - Move a copy of transactions.json into src/data/.
 */
import express from 'express'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// TODO (later exercise): app.get('/api/transactions', ...)

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
