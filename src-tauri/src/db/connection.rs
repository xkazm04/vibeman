use rusqlite::{params, Connection, Result as SqliteResult};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Thread-safe database wrapper
pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
}

impl Database {
    /// Open existing database or create new one at the given path.
    /// Configures WAL mode, foreign keys, and other pragmas to match
    /// the Node.js better-sqlite3 configuration.
    pub fn open(db_path: &Path) -> SqliteResult<Self> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(db_path)?;

        // Match the Node.js SQLite configuration
        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA cache_size = -65536;
            PRAGMA busy_timeout = 5000;
            PRAGMA synchronous = NORMAL;
            ",
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
            path: db_path.to_path_buf(),
        })
    }

    /// Execute a SQL statement with no return value
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> SqliteResult<usize> {
        let conn = self.conn.lock().unwrap();
        conn.execute(sql, params)
    }

    /// Execute a batch of SQL statements
    pub fn execute_batch(&self, sql: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(sql)
    }

    /// Query a single row
    pub fn query_row<T, F>(&self, sql: &str, params: &[&dyn rusqlite::ToSql], f: F) -> SqliteResult<T>
    where
        F: FnOnce(&rusqlite::Row<'_>) -> SqliteResult<T>,
    {
        let conn = self.conn.lock().unwrap();
        conn.query_row(sql, params, f)
    }

    /// Query multiple rows
    pub fn query_map<T, F>(
        &self,
        sql: &str,
        params: &[&dyn rusqlite::ToSql],
        f: F,
    ) -> SqliteResult<Vec<T>>
    where
        F: FnMut(&rusqlite::Row<'_>) -> SqliteResult<T>,
    {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params, f)?;
        rows.collect()
    }

    /// Execute within a transaction
    pub fn transaction<T, F>(&self, f: F) -> SqliteResult<T>
    where
        F: FnOnce(&Connection) -> SqliteResult<T>,
    {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        let result = f(&tx)?;
        tx.commit()?;
        Ok(result)
    }

    /// Get database file path
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Check if a table exists
    pub fn table_exists(&self, table_name: &str) -> SqliteResult<bool> {
        self.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
            params![table_name],
            |row| row.get::<_, i64>(0),
        )
        .map(|count| count > 0)
    }
}
