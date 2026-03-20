//! Database module - SQLite via rusqlite
//!
//! Opens the existing SQLite database created by the Next.js app.
//! Schema is already materialized; Rust reads/writes directly.

mod connection;
mod models;

pub use connection::Database;
pub use models::*;
