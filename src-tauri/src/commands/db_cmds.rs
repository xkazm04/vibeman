use tauri::State;

use crate::state::AppState;

/// Execute a read query and return results as JSON
#[tauri::command]
pub async fn db_query(
    sql: String,
    params: Option<Vec<serde_json::Value>>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;

    let sqlite_params: Vec<Box<dyn rusqlite::types::ToSql>> = params
        .unwrap_or_default()
        .into_iter()
        .map(json_to_sql)
        .collect();

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        sqlite_params.iter().map(|p| p.as_ref()).collect();

    db.query_map(&sql, param_refs.as_slice(), |row| {
        // Get column names and build JSON object
        let count = row.as_ref().column_count();
        let mut obj = serde_json::Map::new();
        for i in 0..count {
            let col_name = row.as_ref().column_name(i).unwrap_or("?").to_string();
            let value: serde_json::Value = match row.get_ref(i) {
                Ok(rusqlite::types::ValueRef::Null) => serde_json::Value::Null,
                Ok(rusqlite::types::ValueRef::Integer(n)) => serde_json::json!(n),
                Ok(rusqlite::types::ValueRef::Real(f)) => serde_json::json!(f),
                Ok(rusqlite::types::ValueRef::Text(s)) => {
                    let s = String::from_utf8_lossy(s).to_string();
                    serde_json::Value::String(s)
                }
                Ok(rusqlite::types::ValueRef::Blob(b)) => {
                    serde_json::Value::String(format!("<blob:{} bytes>", b.len()))
                }
                Err(_) => serde_json::Value::Null,
            };
            obj.insert(col_name, value);
        }
        Ok(serde_json::Value::Object(obj))
    })
    .map_err(|e| format!("Query failed: {}", e))
}

/// Execute a write statement (INSERT/UPDATE/DELETE)
#[tauri::command]
pub async fn db_execute(
    sql: String,
    params: Option<Vec<serde_json::Value>>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;

    let sqlite_params: Vec<Box<dyn rusqlite::types::ToSql>> = params
        .unwrap_or_default()
        .into_iter()
        .map(json_to_sql)
        .collect();

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        sqlite_params.iter().map(|p| p.as_ref()).collect();

    let changes = db
        .execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Execute failed: {}", e))?;

    Ok(serde_json::json!({ "changes": changes }))
}

/// Check database health
#[tauri::command]
pub async fn db_health(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let db = state.db()?;

    let table_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
            &[],
            |row| row.get(0),
        )
        .map_err(|e| format!("Health check failed: {}", e))?;

    let db_path = db.path().to_string_lossy().to_string();

    Ok(serde_json::json!({
        "status": "ok",
        "path": db_path,
        "table_count": table_count,
    }))
}

/// Convert JSON value to SQLite parameter
fn json_to_sql(value: serde_json::Value) -> Box<dyn rusqlite::types::ToSql> {
    match value {
        serde_json::Value::Null => Box::new(rusqlite::types::Null),
        serde_json::Value::Bool(b) => Box::new(b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Box::new(i)
            } else if let Some(f) = n.as_f64() {
                Box::new(f)
            } else {
                Box::new(rusqlite::types::Null)
            }
        }
        serde_json::Value::String(s) => Box::new(s),
        other => Box::new(other.to_string()),
    }
}
