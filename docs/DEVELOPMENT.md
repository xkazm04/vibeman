# Development Guide

Everything you need to contribute to Vibeman: project structure, coding conventions, testing, and development workflows.

---

## Quick Start

```bash
git clone https://github.com/your-username/vibeman.git
cd vibeman
npm install
cp .env.example .env.local
# Edit .env.local — set at least one LLM provider key (or use Ollama for free local inference)
npm run dev
```

See [SETUP.md](SETUP.md) for detailed prerequisites and platform-specific instructions.

---

## Project Structure

```
vibeman/
├── src/
│   ├── app/
│   │   ├── api/                    # Next.js API routes (App Router)
│   │   │   ├── goals/              # Goals CRUD
│   │   │   ├── ideas/              # AI-generated ideas
│   │   │   ├── projects/           # Project registration
│   │   │   ├── conductor/          # Adaptive AI pipeline
│   │   │   ├── claude-code/        # CLI task execution
│   │   │   ├── structure-scan/     # Code structure analysis
│   │   │   ├── brain/              # Behavioral learning signals
│   │   │   └── ...                 # Additional endpoint groups
│   │   ├── db/
│   │   │   ├── connection.ts       # SQLite via better-sqlite3
│   │   │   └── migrations/         # Auto-run migration files
│   │   └── features/
│   │       ├── Conductor/          # Pipeline UI + logic
│   │       └── ...                 # Feature-specific components
│   ├── components/                 # Shared React components
│   ├── hooks/                      # Custom React hooks
│   ├── lib/
│   │   ├── api-errors.ts           # Centralized error handling
│   │   ├── api-helpers/            # Rate limiting, access control, route factory
│   │   ├── validation/             # Input validators + sanitizers
│   │   ├── api/schemas/            # Zod schemas for request validation
│   │   ├── config/envConfig.ts     # Typed environment variable access
│   │   ├── logger.ts               # Structured logging
│   │   └── observability/          # API call tracking middleware
│   └── types/                      # Shared TypeScript types
├── tests/
│   ├── setup/                      # Test DB init, factories
│   └── api/                        # API route integration tests
├── database/                       # SQLite files (gitignored)
├── docs/                           # Documentation
└── .env.example                    # Environment variable template
```

---

## Key Conventions

### API Routes

All API endpoints live in `src/app/api/` using Next.js App Router conventions.

**Route pattern:** Each endpoint exports named HTTP method handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

**Validation approaches** (use one per endpoint, not both):

1. **`validateRequestBody`** — Declarative field validation with custom validators. Used for most endpoints.
   ```typescript
   const result = await validateRequestBody(request, {
     required: [{ field: 'projectId', validator: validateUUID }],
     optional: [{ field: 'limit', validator: validateScore }],
   });
   if (!result.success) return result.error;
   ```

2. **`withValidation`** — Zod schema middleware. Used for conductor and goals endpoints.
   ```typescript
   export const POST = withValidation(MySchema, async (_req, body) => {
     // body is typed and validated
   });
   ```

**Error handling:** Use `createApiErrorResponse()` and `handleApiError()` from `@/lib/api-errors`. Never return raw error objects to the client.

**Middleware composition:** Use `createRouteHandler` for new routes:
```typescript
export const POST = createRouteHandler(handler, {
  endpoint: '/api/my-route',
  method: 'POST',
  middleware: { rateLimit: { tier: 'standard' }, observability: true },
});
```

### Database

- **Engine:** SQLite via `better-sqlite3`
- **Connection:** `getDatabase()` from `@/app/db/connection`
- **Migrations:** Auto-run via `_migrations_applied` tracking table
- **New columns:** Must be nullable or have defaults (existing data on other devices must not break)
- **Never drop/recreate tables** in migrations — use `addColumnIfNotExists()` only

### TypeScript

- No `any` types unless absolutely necessary
- Use the typed `env` module for all environment variable access
- Sanitize all user input before database operations
- Error responses must use typed `ApiErrorCode` enum values

### Testing

- **Framework:** Vitest with a separate test database (`./database/test.db`)
- **Run sequentially** to avoid SQLite concurrency issues
- **Mock factories** in `tests/setup/factories/` for test data generation

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run Vitest test suite |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting |

---

## Development Workflow

### Adding a New API Endpoint

1. Create route file at `src/app/api/<name>/route.ts`
2. Define request validation (Zod schema or `validateRequestBody`)
3. Use `createRouteHandler` for middleware (rate limiting, observability)
4. Return errors via `createApiErrorResponse()` with proper `ApiErrorCode`
5. Add tests in `tests/api/<name>/`

### Adding a Database Migration

1. Create migration function in `src/app/db/migrations/`
2. Wrap with `once('mXXX', fn)` in `runMigrations()` — each runs exactly once
3. New columns must be nullable or have defaults
4. Never use `DROP TABLE` — use `addColumnIfNotExists()` only

### Testing API Endpoints

See [API_TESTING.md](API_TESTING.md) for curl examples and expected responses for all critical endpoints.

---

## Related Documentation

| Doc | Description |
|-----|-------------|
| [SETUP.md](SETUP.md) | First-time installation and prerequisites |
| [API.md](API.md) | Full API endpoint reference |
| [API_TESTING.md](API_TESTING.md) | Hands-on testing guide with curl examples |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Complete environment variable reference |
| [DATABASE.md](DATABASE.md) | Database schema and migration details |
| [FEATURES.md](FEATURES.md) | Feature documentation |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and fixes |
