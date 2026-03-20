//! DAG-based Task Scheduler (Item 7)
//!
//! Parallel task dispatch with dependency graph and file-path overlap detection.
//! Replaces: sequential dispatch loop with 2s sleep in dispatchPhase.ts

use dashmap::{DashMap, DashSet};
use petgraph::graph::{DiGraph, NodeIndex};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

/// A task node in the dependency graph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskNode {
    pub id: String,
    pub name: String,
    pub files: Vec<String>,
    pub complexity: u8,
    pub status: TaskStatus,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

/// DAG-based scheduler for parallel task execution
pub struct TaskScheduler {
    graph: DiGraph<TaskNode, ()>,
    node_map: HashMap<String, NodeIndex>,
    running_files: DashMap<String, HashSet<String>>, // task_id -> files
    completed: DashSet<String>,
    max_parallel: usize,
}

impl TaskScheduler {
    pub fn new(max_parallel: usize) -> Self {
        Self {
            graph: DiGraph::new(),
            node_map: HashMap::new(),
            running_files: DashMap::new(),
            completed: DashSet::new(),
            max_parallel,
        }
    }

    /// Add a task to the graph
    pub fn add_task(&mut self, task: TaskNode) {
        let id = task.id.clone();
        let idx = self.graph.add_node(task);
        self.node_map.insert(id, idx);
    }

    /// Add a dependency: `from` must complete before `to` can start
    pub fn add_dependency(&mut self, from: &str, to: &str) -> Result<(), String> {
        let from_idx = self.node_map.get(from)
            .ok_or_else(|| format!("Task not found: {}", from))?;
        let to_idx = self.node_map.get(to)
            .ok_or_else(|| format!("Task not found: {}", to))?;
        self.graph.add_edge(*from_idx, *to_idx, ());
        Ok(())
    }

    /// Get tasks ready to execute (all dependencies met, no file overlap with running tasks)
    pub fn get_ready_tasks(&self) -> Vec<String> {
        let running_count = self.running_files.len();
        if running_count >= self.max_parallel {
            return vec![];
        }

        let available_slots = self.max_parallel - running_count;

        // Collect files currently being modified by running tasks
        let busy_files: HashSet<String> = self.running_files
            .iter()
            .flat_map(|entry| entry.value().clone())
            .collect();

        let mut ready = Vec::new();

        for idx in self.graph.node_indices() {
            let task = &self.graph[idx];

            // Skip non-pending
            if task.status != TaskStatus::Pending {
                continue;
            }

            // Skip already completed
            if self.completed.contains(&task.id) {
                continue;
            }

            // Check all dependencies are completed
            let deps_met = self.graph
                .neighbors_directed(idx, petgraph::Direction::Incoming)
                .all(|dep_idx| {
                    let dep = &self.graph[dep_idx];
                    self.completed.contains(&dep.id)
                });

            if !deps_met {
                continue;
            }

            // Check no file overlap with running tasks
            let task_files: HashSet<String> = task.files.iter().cloned().collect();
            let has_overlap = task_files.intersection(&busy_files).next().is_some();

            if has_overlap {
                continue;
            }

            ready.push(task.id.clone());

            if ready.len() >= available_slots {
                break;
            }
        }

        ready
    }

    /// Mark a task as running
    pub fn mark_running(&self, task_id: &str) {
        if let Some(idx) = self.node_map.get(task_id) {
            let files: HashSet<String> = self.graph[*idx].files.iter().cloned().collect();
            self.running_files.insert(task_id.to_string(), files);
        }
    }

    /// Mark a task as completed
    pub fn mark_completed(&mut self, task_id: &str) {
        self.running_files.remove(task_id);
        self.completed.insert(task_id.to_string());
        if let Some(idx) = self.node_map.get(task_id) {
            self.graph[*idx].status = TaskStatus::Completed;
        }
    }

    /// Mark a task as failed
    pub fn mark_failed(&mut self, task_id: &str) {
        self.running_files.remove(task_id);
        if let Some(idx) = self.node_map.get(task_id) {
            self.graph[*idx].status = TaskStatus::Failed;
        }
    }

    /// Check if all tasks are done (completed or failed)
    pub fn is_done(&self) -> bool {
        self.graph.node_indices().all(|idx| {
            let task = &self.graph[idx];
            task.status == TaskStatus::Completed || task.status == TaskStatus::Failed
        })
    }
}
