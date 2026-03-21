//! Pre-defined JSON schemas for --json-schema flag (Item 16)
//!
//! These schemas ensure Claude Code CLI returns structured,
//! validated JSON instead of free-form text that needs regex parsing.

/// Schema for idea generation output
pub fn idea_generation_schema() -> &'static str {
    r#"{"type":"object","properties":{"ideas":{"type":"array","items":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"},"category":{"type":"string"},"reasoning":{"type":"string"},"effort":{"type":"integer","minimum":1,"maximum":10},"impact":{"type":"integer","minimum":1,"maximum":10},"risk":{"type":"integer","minimum":1,"maximum":10}},"required":["title","description","category"]}}},"required":["ideas"]}"#
}

/// Schema for conductor plan phase output
pub fn plan_phase_schema() -> &'static str {
    r#"{"type":"object","properties":{"tasks":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"description":{"type":"string"},"files":{"type":"array","items":{"type":"string"}},"dependencies":{"type":"array","items":{"type":"string"}},"complexity":{"type":"integer","minimum":1,"maximum":3}},"required":["name","description"]}},"analysis":{"type":"string"}},"required":["tasks"]}"#
}

/// Schema for conductor reflection phase output
pub fn reflection_schema() -> &'static str {
    r#"{"type":"object","properties":{"decision":{"type":"string","enum":["done","continue","needs_input"]},"lessons":{"type":"array","items":{"type":"string"}},"errors":{"type":"array","items":{"type":"object","properties":{"task":{"type":"string"},"error_type":{"type":"string"},"description":{"type":"string"}}}},"questions":{"type":"array","items":{"type":"string"}},"summary":{"type":"string"}},"required":["decision","summary"]}"#
}

/// Schema for direction generation output
pub fn direction_schema() -> &'static str {
    r#"{"type":"object","properties":{"directions":{"type":"array","items":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"},"scope":{"type":"string"},"effort":{"type":"integer","minimum":1,"maximum":10},"impact":{"type":"integer","minimum":1,"maximum":10}},"required":["title","description"]}}},"required":["directions"]}"#
}

/// Schema for idea re-evaluation batch output
pub fn triage_evaluation_schema() -> &'static str {
    r#"{"type":"object","properties":{"evaluations":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"effort":{"type":"integer","minimum":1,"maximum":10},"impact":{"type":"integer","minimum":1,"maximum":10},"risk":{"type":"integer","minimum":1,"maximum":10}},"required":["id","effort","impact","risk"]}}},"required":["evaluations"]}"#
}
