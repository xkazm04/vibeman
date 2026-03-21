//! Stream-JSON parser for Claude Code CLI output (Item 2: SIMD-accelerated)

use serde::{Deserialize, Serialize};

/// Events parsed from Claude Code CLI stream-json output
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StreamEvent {
    #[serde(rename = "system")]
    System {
        subtype: String,
        session_id: Option<String>,
        tools: Option<Vec<String>>,
        model: Option<String>,
    },
    #[serde(rename = "assistant")]
    Assistant { message: AssistantMessage },
    #[serde(rename = "user")]
    User { message: serde_json::Value },
    #[serde(rename = "result")]
    Result {
        result: Option<String>,
        cost_usd: Option<f64>,
        duration_ms: Option<u64>,
        session_id: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssistantMessage {
    pub id: Option<String>,
    pub role: Option<String>,
    pub content: Vec<ContentBlock>,
    pub model: Option<String>,
    pub stop_reason: Option<String>,
    pub usage: Option<TokenUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentBlock {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "tool_use")]
    ToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
}

impl StreamEvent {
    /// Parse a single line of stream-json output using simd-json with serde fallback.
    pub fn parse_line(line: &str) -> Option<StreamEvent> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }

        // simd-json: parse to owned Value, then use serde_json to deserialize the tagged enum.
        // simd-json is ~3-5x faster for the initial JSON tokenization.
        let mut bytes = trimmed.as_bytes().to_vec();
        if let Ok(value) = simd_json::to_owned_value(&mut bytes) {
            // simd_json::OwnedValue → serde_json::Value → StreamEvent
            // This is safe because OwnedValue serializes to valid JSON
            let json_string = simd_json::to_string(&value).unwrap_or_default();
            serde_json::from_str(&json_string).ok()
        } else {
            // Fallback: direct serde_json parse
            serde_json::from_str(trimmed).ok()
        }
    }

    /// Fast session ID extraction without full deserialization.
    pub fn extract_session_id_fast(line: &str) -> Option<String> {
        use simd_json::prelude::*;
        let mut bytes = line.trim().as_bytes().to_vec();
        if let Ok(value) = simd_json::to_owned_value(&mut bytes) {
            if let Some(sid) = value.get_str("session_id") {
                return Some(sid.to_string());
            }
        }
        None
    }
}

/// Streaming line buffer for incomplete-line handling
pub struct LineBuffer {
    buffer: Vec<u8>,
}

impl LineBuffer {
    pub fn new() -> Self {
        Self {
            buffer: Vec::with_capacity(8192),
        }
    }

    /// Feed raw bytes, return complete lines
    pub fn feed(&mut self, data: &[u8]) -> Vec<String> {
        self.buffer.extend_from_slice(data);
        let mut lines = Vec::new();

        while let Some(pos) = self.buffer.iter().position(|&b| b == b'\n') {
            let line_bytes: Vec<u8> = self.buffer.drain(..=pos).collect();
            if let Ok(line) = String::from_utf8(line_bytes) {
                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    lines.push(trimmed);
                }
            }
        }

        lines
    }
}

/// Parses newline-delimited JSON from CLI stdout
pub struct StreamParser;

impl StreamParser {
    pub fn extract_session_id(events: &[StreamEvent]) -> Option<String> {
        for event in events {
            match event {
                StreamEvent::System { session_id, .. }
                | StreamEvent::Result { session_id, .. } => {
                    if let Some(id) = session_id {
                        return Some(id.clone());
                    }
                }
                _ => {}
            }
        }
        None
    }
}
