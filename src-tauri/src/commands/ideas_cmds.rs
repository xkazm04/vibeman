//! Ideas Re-evaluation with concurrent LLM calls (Item 13)
//!
//! Replaces: sequential batch loop in /api/ideas/re-evaluate

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct ReevaluationResult {
    pub evaluated: usize,
    pub total: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct EvalResponse {
    evaluations: Vec<EvalItem>,
}

#[derive(Debug, Deserialize)]
struct EvalItem {
    id: String,
    effort: i32,
    impact: i32,
    risk: i32,
}

/// Re-evaluate ideas missing effort/impact/risk scores.
/// Uses concurrent LLM calls (up to max_concurrent batches in parallel).
#[tauri::command]
pub async fn reevaluate_ideas(
    project_id: String,
    api_key: String,
    api_url: Option<String>,
    model: Option<String>,
    max_concurrent: Option<usize>,
    state: State<'_, AppState>,
) -> Result<ReevaluationResult, String> {
    let db = state.db()?;
    let max_concurrent = max_concurrent.unwrap_or(3);
    let base_url = api_url.unwrap_or_else(|| "https://api.anthropic.com".to_string());
    let model = model.unwrap_or_else(|| "claude-haiku-4-5-20251001".to_string());

    // Query ideas missing scores
    let ideas: Vec<serde_json::Value> = db
        .query_map(
            "SELECT id, title, description, category FROM ideas WHERE project_id = ?1 AND status IN ('pending', 'accepted') AND (effort IS NULL OR impact IS NULL OR risk IS NULL)",
            params![project_id],
            |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "title": row.get::<_, String>(1)?,
                    "description": row.get::<_, Option<String>>(2)?,
                    "category": row.get::<_, String>(3)?,
                }))
            },
        )
        .map_err(|e| format!("Failed to query ideas: {}", e))?;

    let total = ideas.len();
    if total == 0 {
        return Ok(ReevaluationResult { evaluated: 0, total: 0, errors: vec![] });
    }

    // Chunk into batches of 20
    let batches: Vec<Vec<serde_json::Value>> = ideas
        .chunks(20)
        .map(|c| c.to_vec())
        .collect();

    let mut all_evals: Vec<EvalItem> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    // Process batches with concurrency limit
    let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(max_concurrent));

    let handles: Vec<_> = batches
        .into_iter()
        .map(|batch| {
            let sem = semaphore.clone();
            let api_key = api_key.clone();
            let base_url = base_url.clone();
            let model = model.clone();

            tokio::spawn(async move {
                let _permit = sem.acquire().await.map_err(|e| e.to_string())?;
                evaluate_batch(&batch, &api_key, &base_url, &model).await
            })
        })
        .collect();

    for handle in handles {
        match handle.await {
            Ok(Ok(evals)) => all_evals.extend(evals),
            Ok(Err(e)) => errors.push(e),
            Err(e) => errors.push(format!("Task failed: {}", e)),
        }
    }

    // Batch update DB in single transaction
    let evaluated = all_evals.len();
    if !all_evals.is_empty() {
        db.transaction(|conn| {
            let mut stmt = conn.prepare(
                "UPDATE ideas SET effort = ?1, impact = ?2, risk = ?3, updated_at = datetime('now') WHERE id = ?4"
            )?;
            for eval in &all_evals {
                stmt.execute(params![eval.effort, eval.impact, eval.risk, eval.id])?;
            }
            Ok(())
        })
        .map_err(|e| format!("Failed to update ideas: {}", e))?;
    }

    Ok(ReevaluationResult { evaluated, total, errors })
}

async fn evaluate_batch(
    ideas: &[serde_json::Value],
    api_key: &str,
    base_url: &str,
    model: &str,
) -> Result<Vec<EvalItem>, String> {
    let ideas_text: Vec<String> = ideas
        .iter()
        .map(|i| {
            format!(
                "- ID: {}, Title: {}, Category: {}, Description: {}",
                i["id"].as_str().unwrap_or(""),
                i["title"].as_str().unwrap_or(""),
                i["category"].as_str().unwrap_or(""),
                i["description"].as_str().unwrap_or("(none)"),
            )
        })
        .collect();

    let prompt = format!(
        "Evaluate these software improvement ideas on effort (1-10), impact (1-10), and risk (1-10).\n\nIdeas:\n{}\n\nReturn JSON: {{\"evaluations\": [{{\"id\": \"...\", \"effort\": N, \"impact\": N, \"risk\": N}}]}}",
        ideas_text.join("\n")
    );

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/v1/messages", base_url))
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}]
        }))
        .send()
        .await
        .map_err(|e| format!("API call failed: {}", e))?;

    if response.status() == 429 {
        // Rate limited — wait and retry once
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        return Err("Rate limited, batch skipped".to_string());
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Extract text content
    let text = body["content"][0]["text"]
        .as_str()
        .unwrap_or("");

    // Parse JSON from response
    let eval_response: EvalResponse = serde_json::from_str(text)
        .or_else(|_| {
            // Try extracting JSON from markdown code block
            if let Some(start) = text.find('{') {
                if let Some(end) = text.rfind('}') {
                    return serde_json::from_str(&text[start..=end]);
                }
            }
            Err(serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "No valid JSON in response",
            )))
        })
        .map_err(|e| format!("Failed to parse evaluations: {}", e))?;

    Ok(eval_response.evaluations)
}
