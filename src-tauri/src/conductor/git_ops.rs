//! Git Operations via git2-rs (Item 8)
//!
//! Direct libgit2 API calls instead of shell exec('git ...').
//! Replaces: individual execSync('git diff/add/commit') in dispatchPhase.ts

use git2::{Repository, StatusOptions};
use serde::Serialize;
use std::path::Path;

/// Git operation results
#[derive(Debug, Serialize)]
pub struct DiffSummary {
    pub files_changed: usize,
    pub insertions: usize,
    pub deletions: usize,
    pub files: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CommitResult {
    pub success: bool,
    pub commit_id: Option<String>,
    pub error: Option<String>,
}

pub struct GitOps;

impl GitOps {
    /// Get diff summary between HEAD and working tree
    pub fn diff_summary(repo_path: &Path) -> Result<DiffSummary, String> {
        let repo = Repository::open(repo_path)
            .map_err(|e| format!("Failed to open repo: {}", e))?;

        let diff = repo.diff_index_to_workdir(None, None)
            .map_err(|e| format!("Failed to compute diff: {}", e))?;

        let stats = diff.stats()
            .map_err(|e| format!("Failed to get diff stats: {}", e))?;

        let mut files = Vec::new();
        for delta in diff.deltas() {
            if let Some(path) = delta.new_file().path() {
                files.push(path.to_string_lossy().to_string());
            }
        }

        Ok(DiffSummary {
            files_changed: stats.files_changed(),
            insertions: stats.insertions(),
            deletions: stats.deletions(),
            files,
        })
    }

    /// Stage files and create a commit atomically
    pub fn atomic_commit(
        repo_path: &Path,
        message: &str,
        files: Option<&[&str]>,
    ) -> Result<CommitResult, String> {
        let repo = Repository::open(repo_path)
            .map_err(|e| format!("Failed to open repo: {}", e))?;

        let mut index = repo.index()
            .map_err(|e| format!("Failed to get index: {}", e))?;

        // Stage files
        if let Some(paths) = files {
            for path in paths {
                index.add_path(Path::new(path))
                    .map_err(|e| format!("Failed to stage {}: {}", path, e))?;
            }
        } else {
            // Stage all modified/new files
            index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
                .map_err(|e| format!("Failed to stage all: {}", e))?;
        }

        index.write()
            .map_err(|e| format!("Failed to write index: {}", e))?;

        let tree_id = index.write_tree()
            .map_err(|e| format!("Failed to write tree: {}", e))?;

        let tree = repo.find_tree(tree_id)
            .map_err(|e| format!("Failed to find tree: {}", e))?;

        let sig = repo.signature()
            .map_err(|e| format!("Failed to get signature: {}", e))?;

        let parent = repo.head()
            .and_then(|h| h.peel_to_commit())
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;

        let commit_id = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&parent])
            .map_err(|e| format!("Failed to commit: {}", e))?;

        Ok(CommitResult {
            success: true,
            commit_id: Some(commit_id.to_string()),
            error: None,
        })
    }

    /// Get current branch name
    pub fn current_branch(repo_path: &Path) -> Result<String, String> {
        let repo = Repository::open(repo_path)
            .map_err(|e| format!("Failed to open repo: {}", e))?;

        let head = repo.head()
            .map_err(|e| format!("Failed to get HEAD: {}", e))?;

        Ok(head.shorthand().unwrap_or("detached").to_string())
    }

    /// Check if working tree is dirty
    pub fn is_dirty(repo_path: &Path) -> Result<bool, String> {
        let repo = Repository::open(repo_path)
            .map_err(|e| format!("Failed to open repo: {}", e))?;

        let mut opts = StatusOptions::new();
        opts.include_untracked(true);

        let statuses = repo.statuses(Some(&mut opts))
            .map_err(|e| format!("Failed to get status: {}", e))?;

        Ok(!statuses.is_empty())
    }
}
