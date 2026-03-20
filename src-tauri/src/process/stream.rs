use serde::{Deserialize, Serialize};

/// Events parsed from Claude Code CLI stream-json output
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StreamEvent {
    /// System initialization message
    #[serde(rename = "system")]
    System {
        subtype: String,
        session_id: Option<String>,
        tools: Option<Vec<String>>,
        model: Option<String>,
    },
    /// Assistant response
    #[serde(rename = "assistant")]
    Assistant {
        message: AssistantMessage,
    },
    /// User/tool result
    #[serde(rename = "user")]
    User {
        message: serde_json::Value,
    },
    /// Result summary
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

/// Parses newline-delimited JSON from CLI stdout
pub struct StreamParser;

impl StreamParser {
    /// Parse a single line of stream-json output
    pub fn parse_line(line: &str) -> Option<StreamEvent> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }
        serde_json::from_str(trimmed).ok()
    }

    /// Extract session ID from a stream of events
    pub fn extract_session_id(events: &[StreamEvent]) -> Option<String> {
        for event in events {
            match event {
                StreamEvent::System { session_id, .. } => {
                    if let Some(id) = session_id {
                        return Some(id.clone());
                    }
                }
                StreamEvent::Result { session_id, .. } => {
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
