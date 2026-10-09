/**
 * Prisma client — a single instance shared by the whole process.
 *
 * Each PrismaClient owns a connection pool, so creating one per request (or
 * per module that needs it) would exhaust Postgres connections under load.
 * Import `prisma` from here instead of constructing your own.
 *
 * TODO (exercise — schema): this file is finished, but it cannot RUN until
 * `prisma/schema.prisma` defines a model and you have run:
 *
 *   npm run db:generate
 *
 * Nothing imports this module yet — that is why the server still starts
 * happily without it. Wiring `src/store.js` onto Prisma is the last task in
 * DATABASE-EXERCISE.md.
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and try again.',
  )
}

// Prisma 7 reaches Postgres through a driver adapter rather than a bundled
// query-engine binary. `@prisma/adapter-pg` wraps the standard `pg` driver.
const adapter = new PrismaPg({ connectionString })

export const prisma = new PrismaClient({ adapter })

/** Close the pool. Useful in scripts and tests so the process can exit. */
export function disconnectPrisma() {
  return prisma.$disconnect()
}
