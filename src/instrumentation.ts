/**
 * Next.js Instrumentation — runs once when the server process starts,
 * before any request is served (dev and production).
 *
 * Owns database initialization: tables, indexes, migrations, and the
 * hot-writes aggregation worker all run here, NOT as a module side effect
 * of importing the @/app/db barrel. This keeps the schema/migrations
 * subtree out of every API route's module graph (it loads as one shared
 * async chunk) and guarantees the DB is ready before the first request —
 * including for the ~50 lib modules that import repositories directly
 * without going through the barrel.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureDbReady } = await import('./app/db/init');
    await ensureDbReady();
  }
}
