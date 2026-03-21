use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Default ignore patterns matching the Node.js fileScanner.ts
const DEFAULT_IGNORE: &[&str] = &[
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
    ".claude",
    "database",
    "target", // Rust build output
];

/// Metadata about a scanned file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedFile {
    pub path: PathBuf,
    pub relative_path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub is_dir: bool,
}

/// Fast recursive file scanner using walkdir
pub struct FileScanner {
    ignore_patterns: Vec<String>,
}

impl FileScanner {
    pub fn new() -> Self {
        Self {
            ignore_patterns: DEFAULT_IGNORE.iter().map(|s| s.to_string()).collect(),
        }
    }

    pub fn with_ignore(mut self, patterns: Vec<String>) -> Self {
        self.ignore_patterns = patterns;
        self
    }

    /// Recursively scan a directory, returning all files matching optional extension filters
    pub fn scan(
        &self,
        root: &Path,
        extensions: Option<&[&str]>,
    ) -> Vec<ScannedFile> {
        let mut files = Vec::new();

        for entry in WalkDir::new(root)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| !self.should_ignore(e.path()))
        {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            let path = entry.path();

            // Apply extension filter
            if let Some(exts) = extensions {
                if !entry.file_type().is_dir() {
                    let ext = path
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("");
                    if !exts.contains(&ext) {
                        continue;
                    }
                }
            }

            let relative = path
                .strip_prefix(root)
                .unwrap_or(path)
                .to_string_lossy()
                .replace('\\', "/");

            let metadata = entry.metadata().ok();
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

            files.push(ScannedFile {
                path: path.to_path_buf(),
                relative_path: relative,
                name: entry.file_name().to_string_lossy().to_string(),
                extension: path.extension().map(|e| e.to_string_lossy().to_string()),
                size,
                is_dir: entry.file_type().is_dir(),
            });
        }

        files
    }

    /// Count files by extension in a directory
    pub fn count_by_extension(&self, root: &Path) -> std::collections::HashMap<String, usize> {
        let mut counts = std::collections::HashMap::new();
        for file in self.scan(root, None) {
            if !file.is_dir {
                let ext = file.extension.unwrap_or_else(|| "(none)".to_string());
                *counts.entry(ext).or_insert(0) += 1;
            }
        }
        counts
    }

    fn should_ignore(&self, path: &Path) -> bool {
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            self.ignore_patterns.iter().any(|p| name == p.as_str())
        } else {
            false
        }
    }
}
