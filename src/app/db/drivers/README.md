# Database Driver Abstraction

This directory contains the database driver abstraction layer that allows swapping between different database backends (SQLite, PostgreSQL) without modifying business logic.

## Architecture Overview

The driver abstraction follows these principles:

1. **Single Point of Truth**: All database access goes through a unified interface (`DbConnection`)
2. **Driver Independence**: Repositories use generic database operations that work across drivers
3. **Configuration-Based Selection**: The active driver is selected via environment variables
4. **Graceful Degradation**: Falls back to SQLite if no configuration is provided

## Files

- **`types.ts`**: Core interfaces and types for the abstraction layer
- **`index.ts`**: Factory that creates and manages driver instances
- **`sqlite.driver.ts`**: SQLite implementation using `better-sqlite3`
- **`postgresql.driver.ts`**: PostgreSQL stub (not yet implemented)
- **`README.md`**: This file

## Usage

### Basic Usage

```typescript
import { getConnection, closeDatabase } from '@/app/db/drivers';

// Get a database connection (driver-agnostic)
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

The driver is selected via environment variables:

#### SQLite (Default)

```bash
# .env or .env.local
DB_DRIVER=sqlite
DB_PATH=./database/goals.db
DB_WAL_MODE=true
```

#### PostgreSQL (Future)

```bash
# .env or .env.local
DB_DRIVER=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vibeman
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_MAX_CONNECTIONS=10
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

All drivers must implement the `DbDriver` interface:

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

## Adding a New Driver

To add support for a new database:

1. Create a new driver file (e.g., `mysql.driver.ts`)
2. Implement the `DbDriver` interface
3. Create wrapper classes for `DbConnection` and `DbStatement`
4. Add configuration types to `types.ts`
5. Register the driver in `index.ts` factory
6. Update environment variable handling

Example stub:

```typescript
export class MySqlDriver implements DbDriver {
  private connection: MySqlConnection | null = null;

  getConnection(): DbConnection {
    if (!this.connection) {
      // Initialize MySQL connection
      this.connection = new MySqlConnection(this.config);
    }
    return this.connection;
  }

  // ... implement other methods
}
```

## PostgreSQL Implementation Notes

The PostgreSQL driver is currently a stub. When implementing:

1. **Install Dependencies**:
   ```bash
   npm install pg @types/pg
   ```

2. **Key Differences**:
   - Use connection pooling instead of single connection
   - Convert SQLite syntax to PostgreSQL:
     - `INTEGER` → `SERIAL` or `BIGSERIAL` for auto-increment
     - `TEXT` → `VARCHAR` or `TEXT`
     - `datetime('now')` → `NOW()` or `CURRENT_TIMESTAMP`
     - JSON columns should use `JSONB` type
   - Map `pragma` calls to equivalent `SET` commands
   - Handle transactions with `BEGIN`, `COMMIT`, `ROLLBACK`

3. **Migration Conversion**:
   - Create a separate PostgreSQL migration module
   - Convert all SQLite-specific syntax
   - Handle schema differences (e.g., `AUTOINCREMENT` → `SERIAL`)

4. **Connection Pooling**:
   ```typescript
   import { Pool } from 'pg';

   const pool = new Pool({
     host: config.host,
     port: config.port,
     database: config.database,
     user: config.user,
     password: config.password,
     max: config.maxConnections || 10
   });
   ```

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
- Uses the driver-agnostic `DbConnection` interface
- Checks for existing columns/tables before adding
- Supports idempotent operations (safe to run multiple times)

## Testing

To test the abstraction layer:

```typescript
// Test with SQLite
process.env.DB_DRIVER = 'sqlite';
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

### PostgreSQL (Future)
- Connection pooling for concurrent access
- Multiple readers and writers
- Suitable for production deployments with high concurrency

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
- Ensure the database file/server is accessible
- Verify file permissions (SQLite) or network access (PostgreSQL)

### Migration Failures

If migrations fail:
- Check the console for detailed error messages
- Ensure the database schema is compatible
- Try deleting the database file and reinitializing (SQLite only)
- For PostgreSQL, check that the user has CREATE/ALTER permissions

### Performance Issues

If queries are slow:
- Enable WAL mode (SQLite)
- Add indexes on frequently queried columns
- Use connection pooling (PostgreSQL)
- Consider upgrading from SQLite to PostgreSQL for high-concurrency workloads

## Future Enhancements

Planned improvements:

- [ ] Complete PostgreSQL driver implementation
- [ ] Add MySQL driver support
- [ ] Implement automatic schema conversion tools
- [ ] Add query builder for cross-database compatibility
- [ ] Support database-agnostic migrations
- [ ] Add performance monitoring hooks
- [ ] Implement automatic failover between replicas
- [ ] Add connection health checks
