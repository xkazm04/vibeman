//! Compiled Triage Rule Engine (Item 14)
//!
//! Compiled predicates with short-circuit evaluation.
//! Replaces: triple-nested JS loop in /api/triage-rules

use rayon::prelude::*;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::state::AppState;

/// Triage rule condition field
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TriageField {
    Impact,
    Effort,
    Risk,
    Category,
    ScanType,
    AgeDays,
}

/// Triage rule condition operator
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TriageOp {
    Gte,
    Lte,
    Eq,
    Neq,
    In,
    NotIn,
}

/// A single condition in a triage rule
#[derive(Debug, Clone, Deserialize)]
pub struct TriageCondition {
    pub field: TriageField,
    pub operator: TriageOp,
    pub value: serde_json::Value,
}

/// A compiled triage rule
#[derive(Debug, Clone, Deserialize)]
pub struct TriageRule {
    pub id: String,
    pub name: String,
    pub action: String, // "accept" | "reject" | "archive"
    pub conditions: Vec<TriageCondition>,
    pub priority: i32,
    pub enabled: bool,
}

/// Result of rule evaluation for a single idea
#[derive(Debug, Serialize)]
pub struct TriageMatch {
    pub rule_id: String,
    pub rule_name: String,
    pub idea_id: String,
    pub action: String,
}

/// Evaluate a single condition against an idea (short-circuit)
fn evaluate_condition(condition: &TriageCondition, idea: &serde_json::Value) -> bool {
    match &condition.field {
        TriageField::Impact | TriageField::Effort | TriageField::Risk => {
            let field_name = match &condition.field {
                TriageField::Impact => "impact",
                TriageField::Effort => "effort",
                TriageField::Risk => "risk",
                _ => unreachable!(),
            };
            let idea_val = idea.get(field_name).and_then(|v| v.as_f64()).unwrap_or(0.0);
            let cond_val = condition.value.as_f64().unwrap_or(0.0);

            match &condition.operator {
                TriageOp::Gte => idea_val >= cond_val,
                TriageOp::Lte => idea_val <= cond_val,
                TriageOp::Eq => (idea_val - cond_val).abs() < f64::EPSILON,
                TriageOp::Neq => (idea_val - cond_val).abs() >= f64::EPSILON,
                _ => false,
            }
        }
        TriageField::Category | TriageField::ScanType => {
            let field_name = match &condition.field {
                TriageField::Category => "category",
                TriageField::ScanType => "scan_type",
                _ => unreachable!(),
            };
            let idea_val = idea.get(field_name).and_then(|v| v.as_str()).unwrap_or("");

            match &condition.operator {
                TriageOp::Eq => {
                    let cond_val = condition.value.as_str().unwrap_or("");
                    idea_val == cond_val
                }
                TriageOp::Neq => {
                    let cond_val = condition.value.as_str().unwrap_or("");
                    idea_val != cond_val
                }
                TriageOp::In => {
                    condition.value.as_array()
                        .map(|arr| arr.iter().any(|v| v.as_str() == Some(idea_val)))
                        .unwrap_or(false)
                }
                TriageOp::NotIn => {
                    condition.value.as_array()
                        .map(|arr| !arr.iter().any(|v| v.as_str() == Some(idea_val)))
                        .unwrap_or(true)
                }
                _ => false,
            }
        }
        TriageField::AgeDays => {
            let created = idea.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
            let age = chrono::Utc::now()
                .signed_duration_since(
                    chrono::NaiveDateTime::parse_from_str(created, "%Y-%m-%d %H:%M:%S")
                        .unwrap_or_default()
                        .and_utc()
                )
                .num_days() as f64;

            let cond_val = condition.value.as_f64().unwrap_or(0.0);
            match &condition.operator {
                TriageOp::Gte => age >= cond_val,
                TriageOp::Lte => age <= cond_val,
                _ => false,
            }
        }
    }
}

/// Evaluate a rule against an idea (short-circuit: exits on first failing condition)
fn evaluate_rule(rule: &TriageRule, idea: &serde_json::Value) -> bool {
    rule.conditions.iter().all(|cond| evaluate_condition(cond, idea))
}

/// Preview: dry-run evaluation returning matched idea IDs per rule
#[tauri::command]
pub async fn triage_preview(
    rules: Vec<TriageRule>,
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TriageMatch>, String> {
    let db = state.db()?;

    let ideas: Vec<serde_json::Value> = db
        .query_map(
            "SELECT id, category, scan_type, effort, impact, risk, created_at FROM ideas WHERE project_id = ?1 AND status = 'pending'",
            params![project_id],
            |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "category": row.get::<_, String>(1)?,
                    "scan_type": row.get::<_, Option<String>>(2)?,
                    "effort": row.get::<_, Option<i32>>(3)?,
                    "impact": row.get::<_, Option<i32>>(4)?,
                    "risk": row.get::<_, Option<i32>>(5)?,
                    "created_at": row.get::<_, String>(6)?,
                }))
            },
        )
        .map_err(|e| format!("Failed to query ideas: {}", e))?;

    // Sort rules by priority (highest first)
    let mut sorted_rules: Vec<&TriageRule> = rules.iter().filter(|r| r.enabled).collect();
    sorted_rules.sort_by(|a, b| b.priority.cmp(&a.priority));

    // Parallel evaluation with Rayon
    let matches: Vec<TriageMatch> = ideas
        .par_iter()
        .flat_map(|idea| {
            let idea_id = idea["id"].as_str().unwrap_or("").to_string();
            sorted_rules
                .iter()
                .filter(|rule| evaluate_rule(rule, idea))
                .map(|rule| TriageMatch {
                    rule_id: rule.id.clone(),
                    rule_name: rule.name.clone(),
                    idea_id: idea_id.clone(),
                    action: rule.action.clone(),
                })
                .take(1) // First matching rule wins (highest priority)
                .collect::<Vec<_>>()
        })
        .collect();

    Ok(matches)
}

/// Execute: apply rules and update DB
#[tauri::command]
pub async fn triage_execute(
    rules: Vec<TriageRule>,
    project_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let matches = triage_preview(rules, project_id, state.clone()).await?;
    let db = state.db()?;

    let count = matches.len();
    if count > 0 {
        db.transaction(|conn| {
            let mut stmt = conn.prepare(
                "UPDATE ideas SET status = ?1, updated_at = datetime('now') WHERE id = ?2"
            )?;
            for m in &matches {
                let status = match m.action.as_str() {
                    "accept" => "accepted",
                    "reject" => "rejected",
                    _ => continue,
                };
                stmt.execute(params![status, m.idea_id])?;
            }
            Ok(())
        })
        .map_err(|e| format!("Failed to apply rules: {}", e))?;
    }

    Ok(serde_json::json!({
        "applied": count,
        "matches": matches,
    }))
}
