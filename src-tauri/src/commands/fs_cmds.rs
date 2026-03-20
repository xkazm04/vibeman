use serde::Deserialize;

use crate::fs::{FileScanner, ScannedFile};

#[derive(Debug, Deserialize)]
pub struct ScanDirectoryArgs {
    pub path: String,
    pub extensions: Option<Vec<String>>,
    pub ignore: Option<Vec<String>>,
}

/// Scan a directory for files, optionally filtered by extension
#[tauri::command]
pub async fn scan_directory(args: ScanDirectoryArgs) -> Result<Vec<ScannedFile>, String> {
    let path = std::path::Path::new(&args.path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", args.path));
    }

    let mut scanner = FileScanner::new();
    if let Some(ignore) = args.ignore {
        scanner = scanner.with_ignore(ignore);
    }

    let ext_refs: Vec<&str> = args
        .extensions
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();

    let extensions = if ext_refs.is_empty() {
        None
    } else {
        Some(ext_refs.as_slice())
    };

    Ok(scanner.scan(path, extensions))
}

/// Read a file's contents
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    // Security: prevent path traversal
    let path = std::path::Path::new(&path);
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }

    std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    let path = std::path::Path::new(&path);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    std::fs::write(path, content)
        .map_err(|e| format!("Failed to write {}: {}", path.display(), e))
}
