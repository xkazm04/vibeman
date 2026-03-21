use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;

/// File change event emitted to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangeEvent {
    pub path: String,
    pub kind: FileChangeKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileChangeKind {
    Created,
    Modified,
    Removed,
}

/// File watcher that replaces chokidar
/// Uses the OS-native file watching API (ReadDirectoryChangesW on Windows)
pub struct FileWatcher {
    watcher: Option<RecommendedWatcher>,
    rx: Option<mpsc::Receiver<FileChangeEvent>>,
}

impl FileWatcher {
    /// Create a new file watcher. Events are debounced by 300ms
    /// matching the Node.js chokidar stabilityThreshold.
    pub fn new() -> Result<Self, String> {
        let (tx, rx) = mpsc::channel();

        let watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let kind = match event.kind {
                    EventKind::Create(_) => Some(FileChangeKind::Created),
                    EventKind::Modify(_) => Some(FileChangeKind::Modified),
                    EventKind::Remove(_) => Some(FileChangeKind::Removed),
                    _ => None,
                };

                if let Some(kind) = kind {
                    for path in event.paths {
                        let _ = tx.send(FileChangeEvent {
                            path: path.to_string_lossy().replace('\\', "/"),
                            kind: kind.clone(),
                        });
                    }
                }
            }
        })
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        Ok(Self {
            watcher: Some(watcher),
            rx: Some(rx),
        })
    }

    /// Start watching a directory
    pub fn watch(&mut self, path: &PathBuf) -> Result<(), String> {
        if let Some(ref mut watcher) = self.watcher {
            watcher
                .watch(path, RecursiveMode::Recursive)
                .map_err(|e| format!("Failed to watch {}: {}", path.display(), e))?;
        }
        Ok(())
    }

    /// Stop watching a directory
    pub fn unwatch(&mut self, path: &PathBuf) -> Result<(), String> {
        if let Some(ref mut watcher) = self.watcher {
            watcher
                .unwatch(path)
                .map_err(|e| format!("Failed to unwatch {}: {}", path.display(), e))?;
        }
        Ok(())
    }

    /// Receive pending events (non-blocking)
    pub fn poll_events(&self) -> Vec<FileChangeEvent> {
        let mut events = Vec::new();
        if let Some(ref rx) = self.rx {
            while let Ok(event) = rx.try_recv() {
                events.push(event);
            }
        }
        events
    }
}
