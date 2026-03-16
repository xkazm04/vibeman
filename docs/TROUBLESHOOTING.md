# Troubleshooting Guide

Common issues and solutions for Vibeman development. Each section is titled with the error symptom for easy searching.

---

## Table of Contents

- [Installation & Build](#installation--build)
  - [`better-sqlite3` build failure](#better-sqlite3-build-failure)
  - [`npm install` hangs or times out](#npm-install-hangs-or-times-out)
  - [Node.js version mismatch](#nodejs-version-mismatch)
  - [`node-gyp` rebuild errors](#node-gyp-rebuild-errors)
- [Database](#database)
  - [Database file not created](#database-file-not-created)
  - [SQLITE_BUSY: database is locked](#sqlite_busy-database-is-locked)
  - [Migration failed or stuck](#migration-failed-or-stuck)
  - [SQLITE_CONSTRAINT: foreign key violation](#sqlite_constraint-foreign-key-violation)
  - [Database corruption or reset](#database-corruption-or-reset)
- [Environment & Configuration](#environment--configuration)
  - [Missing environment variables](#missing-environment-variables)
  - [`server-only variable accessed on client` error](#server-only-variable-accessed-on-client-error)
  - [LLM provider returns 401 Unauthorized](#llm-provider-returns-401-unauthorized)
  - [Port 3000 already in use](#port-3000-already-in-use)
- [Development Server](#development-server)
  - [Next.js dev server won't start](#nextjs-dev-server-wont-start)
  - [Hot reload not working](#hot-reload-not-working)
  - [API routes returning 500](#api-routes-returning-500)
  - [CORS errors in browser console](#cors-errors-in-browser-console)
- [Testing](#testing)
  - [Tests fail with database errors](#tests-fail-with-database-errors)
  - [Tests hang or timeout](#tests-hang-or-timeout)
  - [Import alias `@/` not resolving in tests](#import-alias--not-resolving-in-tests)
- [CLI Providers](#cli-providers)
  - [Claude CLI not found](#claude-cli-not-found)
  - [Gemini CLI OAuth failure](#gemini-cli-oauth-failure)
  - [Ollama connection refused](#ollama-connection-refused)
- [CI/CD](#cicd)
  - [CI build fails on `better-sqlite3`](#ci-build-fails-on-better-sqlite3)
  - [CI tests fail with SQLITE_BUSY](#ci-tests-fail-with-sqlite_busy)
  - [CI TypeScript compilation errors](#ci-typescript-compilation-errors)
  - [CI environment variables not set](#ci-environment-variables-not-set)
  - [CI disk space issues](#ci-disk-space-issues)
- [File Permissions](#file-permissions)
  - [EACCES: permission denied on database](#eacces-permission-denied-on-database)
  - [EPERM: operation not permitted on Windows](#eperm-operation-not-permitted-on-windows)

---

## Installation & Build

### `better-sqlite3` build failure

**Symptom:** `npm install` fails with errors related to `better-sqlite3`, `node-gyp`, or native compilation.

**Cause:** Missing C/C++ build tools required to compile the native SQLite addon.

**Solution by platform:**

<details>
<summary><strong>Windows</strong></summary>

```bash
# Option 1: Install Visual Studio Build Tools
# Download from https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Select "Desktop development with C++" workload

# Option 2: Use npm helper
npm install -g windows-build-tools
```

After installing, retry:
```bash
npm install
```

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
xcode-select --install
npm install
```

</details>

<details>
<summary><strong>Linux</strong></summary>

```bash
sudo apt install build-essential python3   # Debian/Ubuntu
sudo dnf groupinstall "Development Tools"  # Fedora
sudo pacman -S base-devel python           # Arch

npm install
```

</details>

If the issue persists, try clearing the npm cache:
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

---

### `npm install` hangs or times out

**Symptom:** `npm install` appears to hang during the `better-sqlite3` postinstall step.

**Cause:** Native compilation can take 1-3 minutes on slower machines. If it hangs beyond 5 minutes, it's likely a network or toolchain issue.

**Solution:**
```bash
# Check if node-gyp can find your compiler
npx node-gyp configure

# If that fails, explicitly set the Python path
npm config set python /usr/bin/python3

# Retry install
npm install
```

---

### Node.js version mismatch

**Symptom:** Errors like `Unsupported engine` or unexpected syntax errors during build.

**Cause:** Vibeman requires Node.js 20+.

**Solution:**
```bash
node -v  # Check current version

# Use nvm to install the correct version
nvm install 20
nvm use 20
```

---

### `node-gyp` rebuild errors

**Symptom:** `node-gyp rebuild` fails during `npm install` with compiler errors.

**Cause:** Incompatible node-gyp version or missing build dependencies.

**Solution:**
```bash
# Update node-gyp globally
npm install -g node-gyp

# Clear build cache
rm -rf node_modules
npm install
```

---

## Database

### Database file not created

**Symptom:** The app starts but API calls fail with "database not found" errors.

**Cause:** The `database/` directory couldn't be created, or the process lacks write permissions.

**Solution:**
```bash
# Create the directory manually
mkdir -p database

# Restart the dev server
npm run dev
```

The database file (`goals.db`) is created automatically on first API call.

---

### SQLITE_BUSY: database is locked

**Symptom:** API calls intermittently fail with `SQLITE_BUSY` errors.

**Cause:** Multiple processes are trying to write to the same database file simultaneously. This commonly happens when running multiple dev server instances or when tests run alongside the dev server.

**Solution:**

1. Ensure only one dev server is running:
   ```bash
   # Find and kill existing processes on port 3000
   # macOS/Linux:
   lsof -i :3000
   kill <PID>

   # Windows:
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. Ensure WAL mode is enabled (default):
   ```env
   DB_WAL_MODE=true
   ```

3. If running on a network drive, move the database to a local disk. SQLite doesn't work reliably over network filesystems.

---

### Migration failed or stuck

**Symptom:** Server logs show migration errors on startup, or the database appears to be missing tables.

**Cause:** A migration partially applied, or the tracking table `_migrations_applied` is out of sync.

**Solution:**

1. Check which migrations have applied:
   ```bash
   # Using sqlite3 CLI (or any SQLite browser)
   sqlite3 database/goals.db "SELECT * FROM _migrations_applied ORDER BY applied_at;"
   ```

2. If a specific migration failed, you can reset by deleting the database:
   ```bash
   rm database/goals.db
   npm run dev  # Recreates everything from scratch
   ```

> **Warning:** This deletes all local data. Back up `goals.db` first if you have important data.

---

### SQLITE_CONSTRAINT: foreign key violation

**Symptom:** API calls fail with `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`.

**Cause:** Attempting to reference a record that doesn't exist (e.g., creating an idea with a non-existent `project_id`).

**Solution:** Ensure the parent record exists before creating child records. Check that the `projectId` you're passing matches an existing project.

---

### Database corruption or reset

**Symptom:** Queries return unexpected results, or the app crashes on database access.

**Solution:**
```bash
# 1. Stop the dev server
# 2. Back up the current database
cp database/goals.db database/goals.db.backup

# 3. Delete and recreate
rm database/goals.db

# 4. Restart — migrations will recreate all tables
npm run dev
```

---

## Environment & Configuration

### Missing environment variables

**Symptom:** Server logs show warnings about missing API keys, or LLM features don't work.

**Cause:** `.env.local` is not configured or is missing required keys.

**Solution:**
```bash
# Verify .env.local exists
ls -la .env.local

# If missing, create from template
cp .env.example .env.local

# Edit and add at least one LLM provider key
```

All environment variables are read through `src/lib/config/envConfig.ts`. Missing optional variables return `undefined` — only LLM provider keys are functionally required for AI features.

---

### `server-only variable accessed on client` error

**Symptom:** Error: `[envConfig] "VARIABLE_NAME" is a server-only variable and cannot be accessed on the client.`

**Cause:** A server-only environment variable (anything without `NEXT_PUBLIC_` prefix) was imported in a client component.

**Solution:** Only use `env.anthropicApiKey()` and similar server-only getters in:
- API route handlers (`src/app/api/`)
- Server components
- Server actions

For client-side use, only `NEXT_PUBLIC_*` variables are available.

---

### LLM provider returns 401 Unauthorized

**Symptom:** LLM API calls fail with 401 status.

**Cause:** Invalid or expired API key.

**Solution:**
1. Verify your API key in `.env.local` has no extra whitespace or quotes
2. Test the key directly:
   ```bash
   # Anthropic
   curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     https://api.anthropic.com/v1/messages \
     -d '{"model":"claude-sonnet-4-20250514","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}'
   ```
3. Regenerate the key if expired

---

### Port 3000 already in use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Option 1: Kill the existing process
# macOS/Linux:
lsof -i :3000 | grep LISTEN
kill <PID>

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Option 2: Use a different port
PORT=3001 npm run dev
```

---

## Development Server

### Next.js dev server won't start

**Symptom:** `npm run dev` fails immediately.

**Common causes and fixes:**

1. **Missing dependencies:**
   ```bash
   rm -rf node_modules .next
   npm install
   npm run dev
   ```

2. **TypeScript errors:**
   ```bash
   npx tsc --noEmit  # Check for type errors
   ```

3. **Corrupted `.next` cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

---

### Hot reload not working

**Symptom:** Changes to source files don't trigger a page refresh.

**Solution:**
1. Turbopack (used by `npm run dev`) occasionally misses file changes. Restart the dev server.
2. On Windows with WSL, ensure the project is on a native Windows filesystem (not `/mnt/c/`), or configure polling:
   ```env
   WATCHPACK_POLLING=true
   ```

---

### API routes returning 500

**Symptom:** All or most API routes return 500 Internal Server Error.

**Diagnosis:**
1. Check the terminal running `npm run dev` for error stack traces
2. Common causes:
   - Database not initialized (restart the server)
   - Missing environment variables
   - Import errors in shared modules

**Solution:** Fix the error shown in the server console. If no error is visible, enable debug logging:
```env
LOG_LEVEL=debug
```

---

### CORS errors in browser console

**Symptom:** Browser console shows CORS-related errors when calling API routes.

**Cause:** Vibeman is localhost-only. CORS errors usually mean you're accessing the app from a different origin.

**Solution:** Access the app at the same origin as the API (`http://localhost:3000` by default). If using a different port, set:
```env
NEXT_PUBLIC_APP_URL=http://localhost:YOUR_PORT
NEXT_PUBLIC_API_URL=http://localhost:YOUR_PORT
```

---

## Testing

### Tests fail with database errors

**Symptom:** Tests fail with SQLite errors like "table not found" or "database is locked."

**Solution:**
```bash
# 1. Remove the test database
rm -f database/test.db

# 2. Ensure dev server is stopped (shared file lock)

# 3. Re-run tests
npm test
```

Tests use a separate database at `./database/test.db` and run sequentially to avoid lock contention.

---

### Tests hang or timeout

**Symptom:** Tests appear to hang indefinitely or hit the Vitest timeout.

**Cause:** Tests run in `singleFork` mode for SQLite safety. A stuck test blocks all subsequent tests.

**Solution:**
```bash
# Run a specific test file to isolate the issue
npx vitest run tests/api/goals/route.test.ts

# Increase timeout if needed (default: 5000ms)
npx vitest run --testTimeout=30000
```

---

### Import alias `@/` not resolving in tests

**Symptom:** Tests fail with `Cannot find module '@/...'`.

**Cause:** Path aliases are configured in `vitest.config.ts`. If you're running tests differently, aliases may not resolve.

**Solution:** Always run tests via the configured command:
```bash
npm test
# or
npx vitest run
```

The aliases are defined in `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@tests': path.resolve(__dirname, './tests'),
  },
}
```

---

## CLI Providers

### Claude CLI not found

**Symptom:** Task Runner fails with "claude: command not found."

**Solution:**
```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

On Windows, ensure the npm global bin directory is in your PATH.

---

### Gemini CLI OAuth failure

**Symptom:** Gemini CLI prompts fail or return authentication errors.

**Solution:**
```bash
# Run interactively once to complete OAuth
gemini

# Or skip OAuth by setting the API key
# In .env.local:
GEMINI_API_KEY=your-key-here
```

---

### Ollama connection refused

**Symptom:** LLM calls to Ollama fail with "ECONNREFUSED."

**Solution:**
```bash
# Ensure Ollama is running
ollama serve

# Verify it's accessible
curl http://localhost:11434/api/tags

# Pull a model if none are available
ollama pull qwen3.5:cloud
```

Check that `OLLAMA_BASE_URL` in `.env.local` matches the Ollama server address (default: `http://localhost:11434`).

---

## CI/CD

### CI build fails on `better-sqlite3`

**Symptom:** CI pipeline fails during `npm install` with native compilation errors.

**Solution:** Ensure your CI image has build tools installed. Example for GitHub Actions:

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: sudo apt-get install -y build-essential python3
      - run: npm ci
```

For Alpine-based Docker images:
```dockerfile
RUN apk add --no-cache build-base python3
```

---

### CI tests fail with SQLITE_BUSY

**Symptom:** Tests intermittently fail in CI with `SQLITE_BUSY`.

**Cause:** CI runners may have slower disk I/O, exacerbating lock contention.

**Solution:** Tests already run in `singleFork` mode. If issues persist:
1. Ensure no background processes access the test database
2. Use a tmpfs/ramdisk for the database in CI:
   ```yaml
   - run: |
       mkdir -p /tmp/vibeman-db
       DB_PATH=/tmp/vibeman-db/test.db npm test
   ```

---

### CI TypeScript compilation errors

**Symptom:** `npx tsc --noEmit` fails in CI but passes locally.

**Cause:** TypeScript version mismatch or missing `node_modules`.

**Solution:**
```yaml
- run: npm ci          # Use ci instead of install for deterministic builds
- run: npx tsc --noEmit
```

Ensure `package-lock.json` is committed and up to date.

---

### CI environment variables not set

**Symptom:** CI build or tests fail because API keys or config variables are missing.

**Solution:** For CI, you typically don't need LLM API keys (tests use mocks). Set only what's required:

```yaml
env:
  DB_PATH: ./database/test.db
  DB_WAL_MODE: 'true'
  NODE_ENV: test
  LOG_LEVEL: warn
```

For integration tests that need real API keys, use CI secrets:
```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

### CI disk space issues

**Symptom:** CI builds fail with "No space left on device."

**Solution:**
```yaml
# Clean up before build
- run: |
    npm cache clean --force
    rm -rf .next
```

The SQLite database is small (typically < 50MB), so this is usually a `node_modules` or `.next` cache issue.

---

## File Permissions

### EACCES: permission denied on database

**Symptom:** `EACCES: permission denied, open 'database/goals.db'`

**Solution:**
```bash
# Fix directory permissions
chmod 755 database/
chmod 644 database/goals.db

# If the directory doesn't exist
mkdir -p database
chmod 755 database/
```

Ensure the user running the dev server has read/write access to the `database/` directory.

---

### EPERM: operation not permitted on Windows

**Symptom:** File operations fail with `EPERM` on Windows.

**Common causes:**
1. **Antivirus:** Windows Defender or other antivirus software may lock files. Add the project directory to exclusions.
2. **File in use:** Another process has the file open. Close VS Code, other terminals, or SQLite browsers.
3. **OneDrive:** If the project is in a OneDrive-synced folder, move it to a non-synced location.

---

## Getting More Help

1. Check the server console output for detailed error messages
2. Enable debug logging: `LOG_LEVEL=debug` in `.env.local`
3. Check the [System Status endpoint](API.md#system-status): `GET /api/system-status`
4. File an issue at the project's GitHub Issues page
