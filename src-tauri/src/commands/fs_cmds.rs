//! Filesystem commands
//!
//! Replaces: /api/disk/file, /api/disk/batch, /api/disk/search,
//!           /api/file-scanner, /api/file-dependencies,
//!           /api/structure-scan (scanning parts),
//!           /api/project/files, /api/project/structure

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use crate::fs::{FileScanner, ScannedFile};

// ============================================================================
// Directory scanning (replaces /api/file-scanner)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ScanDirectoryArgs {
    pub path: String,
    pub extensions: Option<Vec<String>>,
    pub ignore: Option<Vec<String>>,
}

#[tauri::command]
pub async fn scan_directory(args: ScanDirectoryArgs) -> Result<Vec<ScannedFile>, String> {
    let path = Path::new(&args.path);
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

// ============================================================================
// File read/write/check (replaces /api/disk/file)
// ============================================================================

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }
    std::fs::read_to_string(p)
        .map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    std::fs::write(p, content)
        .map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
pub async fn check_file_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

// ============================================================================
// Batch file operations (replaces /api/disk/batch)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct BatchReadArgs {
    pub paths: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct BatchReadResult {
    pub path: String,
    pub content: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn batch_read_files(args: BatchReadArgs) -> Result<Vec<BatchReadResult>, String> {
    let results: Vec<BatchReadResult> = args
        .paths
        .iter()
        .map(|path| {
            match std::fs::read_to_string(path) {
                Ok(content) => BatchReadResult {
                    path: path.clone(),
                    content: Some(content),
                    error: None,
                },
                Err(e) => BatchReadResult {
                    path: path.clone(),
                    content: None,
                    error: Some(e.to_string()),
                },
            }
        })
        .collect();
    Ok(results)
}

// ============================================================================
// File search (replaces /api/disk/search)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct FileSearchArgs {
    pub root: String,
    pub pattern: String,
    pub max_results: Option<usize>,
}

#[tauri::command]
pub async fn search_files(args: FileSearchArgs) -> Result<Vec<String>, String> {
    let root = Path::new(&args.root);
    if !root.exists() {
        return Err(format!("Root path does not exist: {}", args.root));
    }

    let pattern = args.pattern.to_lowercase();
    let max = args.max_results.unwrap_or(100);

    let scanner = FileScanner::new();
    let files = scanner.scan(root, None);

    let matches: Vec<String> = files
        .into_iter()
        .filter(|f| !f.is_dir && f.relative_path.to_lowercase().contains(&pattern))
        .take(max)
        .map(|f| f.relative_path)
        .collect();

    Ok(matches)
}

// ============================================================================
// File dependency analysis (replaces /api/file-dependencies)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct FileDependencyArgs {
    pub file_path: String,
    pub project_path: String,
    pub max_depth: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileDependency {
    pub file_path: String,
    pub relative_path: String,
    pub depth: usize,
}

#[derive(Debug, Serialize)]
pub struct DependencyResult {
    pub success: bool,
    pub dependencies: Vec<FileDependency>,
    pub total_files: usize,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn analyze_file_dependencies(args: FileDependencyArgs) -> Result<DependencyResult, String> {
    let max_depth = args.max_depth.unwrap_or(3);
    let project_path = PathBuf::from(&args.project_path);
    let file_path = PathBuf::from(&args.file_path);

    if !file_path.exists() {
        return Ok(DependencyResult {
            success: false,
            dependencies: vec![],
            total_files: 0,
            error: Some(format!("File not found: {}", args.file_path)),
        });
    }

    let mut visited = HashSet::new();
    let mut deps = Vec::new();

    collect_dependencies(&file_path, &project_path, 0, max_depth, &mut visited, &mut deps);

    let total = deps.len();
    Ok(DependencyResult {
        success: true,
        dependencies: deps,
        total_files: total,
        error: None,
    })
}

fn collect_dependencies(
    file_path: &Path,
    project_root: &Path,
    depth: usize,
    max_depth: usize,
    visited: &mut HashSet<PathBuf>,
    deps: &mut Vec<FileDependency>,
) {
    if depth > max_depth {
        return;
    }

    let canonical = match file_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return,
    };

    if visited.contains(&canonical) {
        return;
    }
    visited.insert(canonical.clone());

    let content = match std::fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return,
    };

    let ext = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let imports = match ext {
        "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs" => extract_js_imports(&content),
        "py" => extract_python_imports(&content),
        _ => return,
    };

    let parent_dir = file_path.parent().unwrap_or(file_path);

    for import_path in imports {
        // Skip node_modules / external packages
        if !import_path.starts_with('.') && !import_path.starts_with("@/") && !import_path.starts_with('/') {
            continue;
        }

        let resolved = resolve_import(&import_path, parent_dir, project_root);
        if let Some(resolved_path) = resolved {
            if resolved_path.exists() {
                let relative = resolved_path
                    .strip_prefix(project_root)
                    .unwrap_or(&resolved_path)
                    .to_string_lossy()
                    .replace('\\', "/");

                deps.push(FileDependency {
                    file_path: resolved_path.to_string_lossy().replace('\\', "/"),
                    relative_path: relative,
                    depth: depth + 1,
                });

                collect_dependencies(&resolved_path, project_root, depth + 1, max_depth, visited, deps);
            }
        }
    }
}

fn extract_js_imports(content: &str) -> Vec<String> {
    let mut imports = Vec::new();

    // ES6: import ... from '...'
    let re_es6 = regex_lite::Regex::new(r#"import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]"#).unwrap();
    for cap in re_es6.captures_iter(content) {
        if let Some(m) = cap.get(1) {
            imports.push(m.as_str().to_string());
        }
    }

    // Dynamic: import('...')
    let re_dyn = regex_lite::Regex::new(r#"import\s*\(\s*['"]([^'"]+)['"]\s*\)"#).unwrap();
    for cap in re_dyn.captures_iter(content) {
        if let Some(m) = cap.get(1) {
            imports.push(m.as_str().to_string());
        }
    }

    // CommonJS: require('...')
    let re_req = regex_lite::Regex::new(r#"require\s*\(\s*['"]([^'"]+)['"]\s*\)"#).unwrap();
    for cap in re_req.captures_iter(content) {
        if let Some(m) = cap.get(1) {
            imports.push(m.as_str().to_string());
        }
    }

    imports
}

fn extract_python_imports(content: &str) -> Vec<String> {
    let mut imports = Vec::new();

    let re_import = regex_lite::Regex::new(r"^\s*import\s+([\w.]+)").unwrap();
    for cap in re_import.captures_iter(content) {
        if let Some(m) = cap.get(1) {
            imports.push(m.as_str().to_string());
        }
    }

    let re_from = regex_lite::Regex::new(r"^\s*from\s+(\.{0,2}[\w.]*)\s+import\s+").unwrap();
    for cap in re_from.captures_iter(content) {
        if let Some(m) = cap.get(1) {
            imports.push(m.as_str().to_string());
        }
    }

    imports
}

fn resolve_import(import: &str, parent_dir: &Path, project_root: &Path) -> Option<PathBuf> {
    let extensions = &["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];

    let base = if import.starts_with("@/") {
        // TypeScript path alias: @/ -> src/
        project_root.join("src").join(&import[2..])
    } else if import.starts_with('.') {
        parent_dir.join(import)
    } else {
        return None;
    };

    for ext in extensions {
        let candidate = PathBuf::from(format!("{}{}", base.display(), ext));
        if candidate.exists() && candidate.is_file() {
            return Some(candidate);
        }
    }

    None
}

// ============================================================================
// Project structure (replaces /api/project/structure, /api/project/files)
// ============================================================================

#[derive(Debug, Serialize)]
pub struct ProjectStructure {
    pub total_files: usize,
    pub total_dirs: usize,
    pub by_extension: HashMap<String, usize>,
    pub top_level_dirs: Vec<String>,
}

#[tauri::command]
pub async fn get_project_structure(project_path: String) -> Result<ProjectStructure, String> {
    let root = Path::new(&project_path);
    if !root.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }

    let scanner = FileScanner::new();
    let files = scanner.scan(root, None);

    let mut total_files = 0;
    let mut total_dirs = 0;
    let mut by_extension: HashMap<String, usize> = HashMap::new();
    let mut top_level_dirs: Vec<String> = Vec::new();

    for file in &files {
        if file.is_dir {
            total_dirs += 1;
            // Check if top-level
            if !file.relative_path.contains('/') && !file.relative_path.is_empty() {
                top_level_dirs.push(file.relative_path.clone());
            }
        } else {
            total_files += 1;
            let ext = file.extension.clone().unwrap_or_else(|| "(none)".to_string());
            *by_extension.entry(ext).or_insert(0) += 1;
        }
    }

    Ok(ProjectStructure {
        total_files,
        total_dirs,
        by_extension,
        top_level_dirs,
    })
}
