# Database Driver Abstraction

This directory contains the database driver abstraction layer for SQLite.

## Architecture Overview

The driver abstraction follows these principles:

1. **Single Point of Truth**: All database access goes through a unified interface (`DbConnection`)
2. **Driver Independence**: Repositories use generic database operations
3. **Graceful Defaults**: Uses sensible defaults if no configuration is provided

## Files

- **`types.ts`**: Core interfaces and types for the abstraction layer
- **`index.ts`**: Factory that creates and manages driver instances
- **`sqlite.driver.ts`**: SQLite implementation using `better-sqlite3`
- **`README.md`**: This file

## Usage

### Basic Usage

```typescript
import { getConnection, closeDatabase } from '@/app/db/drivers';

// Get a database connection
const db = getConnection();

// Execute SQL
db.exec('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY)');

// Prepare and run statements
const stmt = db.prepare('INSERT INTO users (id) VALUES (?)');
stmt.run('user-123');

// Query data
const users = db.prepare('SELECT * FROM users').all();

// Close when done
closeDatabase();
```

### Configuration

The driver is configured via environment variables:

```bash
# .env or .env.local
DB_PATH=./database/goals.db
DB_WAL_MODE=true
```

### Backward Compatibility

The old `connection.ts` module is maintained for backward compatibility:

```typescript
// Old way (still works)
import { getDatabase } from '@/app/db/connection';
const db = getDatabase(); // Returns better-sqlite3 Database instance

// New way (recommended)
import { getConnection } from '@/app/db/drivers';
const db = getConnection(); // Returns DbConnection interface
```

## Driver Interface

The driver implements the `DbDriver` interface:

```typescript
interface DbDriver {
  getConnection(): DbConnection;
  close(): void;
  runMigrations(): void;
  initializeTables(): void;
  getDriverType(): DbDriverType;
}
```

The `DbConnection` interface provides:

- `exec(sql: string)`: Execute SQL without results
- `prepare<T>(sql: string)`: Create prepared statements
- `pragma(pragma: string)`: Database-specific configuration
- `close()`: Close the connection
- `transaction<T>(fn: () => T)`: Execute in a transaction

## Migration System

Migrations are managed by the driver:

```typescript
// Automatically called on first access
const driver = getDbDriver();
driver.initializeTables(); // Creates schema
driver.runMigrations();    // Runs migrations
```

The migration system:
- Lives in `../migrations/index.ts`
- Uses the `DbConnection` interface
- Checks for existing columns/tables before adding
- Supports idempotent operations (safe to run multiple times)

## Testing

To test the abstraction layer:

```typescript
process.env.DB_PATH = ':memory:'; // In-memory database

const db = getConnection();
db.exec('CREATE TABLE test (id TEXT)');
db.prepare('INSERT INTO test (id) VALUES (?)').run('test-1');

const results = db.prepare('SELECT * FROM test').all();
console.assert(results.length === 1);

closeDatabase();
```

## Performance Considerations

### SQLite
- WAL mode enabled by default for concurrent reads
- Single writer, multiple readers
- Suitable for local development and small deployments

## Best Practices

1. **Use Prepared Statements**: Always use `prepare()` for queries with parameters
2. **Handle Errors**: Wrap database calls in try-catch blocks
3. **Close Connections**: Call `closeDatabase()` on app shutdown
4. **Avoid Direct SQL**: Use repository pattern to abstract database operations
5. **Test Migrations**: Test migrations with sample data before deploying

## Troubleshooting

### Connection Issues

If you see "Database driver not initialized" errors:
- Check that environment variables are set correctly
- Ensure the database file is accessible
- Verify file permissions

### Migration Failures

If migrations fail:
- Check the console for detailed error messages
- Ensure the database schema is compatible
- Try deleting the database file and reinitializing

### Performance Issues

If queries are slow:
- Enable WAL mode
- Add indexes on frequently queried columns
