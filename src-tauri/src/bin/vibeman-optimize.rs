//! vibeman-optimize — token-optimization helper for the CLI fleet.
//!
//! Reads ONE JSON request on stdin, writes ONE JSON response on stdout. The
//! `/api/optimize/*` routes do the I/O (read a file, run ripgrep, read a log)
//! and hand the raw text here; this binary compresses it, stores the original
//! in a reversible content-addressed store (CCR), caches the compressed result,
//! and returns it with a retrieval marker. The agent calls the `vibeman_retrieve`
//! MCP tool with the marker's hash to get the full original back on demand.
//!
//! Project isolation (hard requirement): the cache + CCR store live in a
//! PER-PROJECT SQLite file at `<project_path>/.vibeman/optimizer-cache.db`.
//! Separate files per project make cross-project content leakage structurally
//! impossible — there is no shared store and no WHERE-clause to forget.
//!
//! Compression techniques are ported from headroom (Apache-2.0):
//!   - LogCompressor   → line-salience scoring + boundary keep + gap elision
//!   - SearchCompressor → per-file relevance scoring + top-K with anchors
//!   - CCR             → BLAKE3 content addressing + retrieval marker
//! See https://github.com/chopratejas/headroom (NOTICE retained at repo root).

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::path::Path;

// ============================================================================
// Wire types
// ============================================================================

#[derive(Deserialize)]
struct Request {
    /// Absolute project root — selects the per-project cache file.
    project_path: String,
    /// "read" | "search" | "logs" | "retrieve"
    kind: String,
    #[serde(default)]
    content: String,
    #[serde(default)]
    query: Option<String>,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    hash: Option<String>,
    #[serde(default)]
    options: Options,
}

#[derive(Deserialize, Default)]
struct Options {
    max_lines: Option<usize>,
    max_files: Option<usize>,
    /// Below this token count we don't bother compressing (passthrough).
    min_compress_tokens: Option<u64>,
}

#[derive(Serialize)]
struct Response {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    compressed: Option<String>,
    /// Used only by `retrieve` — the original uncompressed content.
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    original_hash: Option<String>,
    original_tokens: u64,
    compressed_tokens: u64,
    saved_tokens: u64,
    strategy: String,
    cache_hit: bool,
}

// ============================================================================
// Token estimate + CCR addressing (headroom-derived)
// ============================================================================

/// Char-based token estimate. 3.5 chars/token is headroom's Claude calibration.
fn estimate_tokens(s: &str) -> u64 {
    if s.is_empty() {
        return 0;
    }
    let chars = s.chars().count() as f64;
    ((chars / 3.5).round() as u64).max(1)
}

/// 96-bit BLAKE3 content key (24 hex chars), matching headroom's CCR scheme.
fn ccr_key(content: &str) -> String {
    let full = blake3::hash(content.as_bytes()).to_hex().to_string();
    full[..24.min(full.len())].to_string()
}

fn marker(hash: &str) -> String {
    format!("<<ccr:{}>>", hash)
}

// ============================================================================
// Per-project cache (physical isolation)
// ============================================================================

fn open_cache(project_path: &str) -> rusqlite::Result<Connection> {
    let dir = Path::new(project_path).join(".vibeman");
    std::fs::create_dir_all(&dir).ok();
    let conn = Connection::open(dir.join("optimizer-cache.db"))?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA busy_timeout=5000;
         PRAGMA synchronous=NORMAL;
         CREATE TABLE IF NOT EXISTS ccr_store (
            hash       TEXT PRIMARY KEY,
            content    TEXT NOT NULL,
            bytes      INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
         );
         CREATE TABLE IF NOT EXISTS optimizer_cache (
            cache_key         TEXT PRIMARY KEY,
            kind              TEXT NOT NULL,
            original_hash     TEXT NOT NULL,
            compressed        TEXT NOT NULL,
            original_tokens   INTEGER NOT NULL,
            compressed_tokens INTEGER NOT NULL,
            strategy          TEXT NOT NULL,
            hits              INTEGER NOT NULL DEFAULT 0,
            created_at        TEXT NOT NULL DEFAULT (datetime('now')),
            last_used         TEXT NOT NULL DEFAULT (datetime('now'))
         );",
    )?;
    Ok(conn)
}

// ============================================================================
// Dispatch
// ============================================================================

fn handle_compress(
    conn: &Connection,
    kind: &str,
    content: &str,
    query: Option<&str>,
    opts: &Options,
) -> Response {
    let original_tokens = estimate_tokens(content);
    let hash = ccr_key(content);
    let cache_key = format!("{}:{}", kind, hash);

    // Content-addressed cache: identical content → identical key. This gives
    // cross-agent dedup (agent B reuses agent A's compression) and automatic
    // invalidation (changed content → new hash → new key).
    if let Ok((compressed, ot, ct, strategy)) = conn.query_row(
        "SELECT compressed, original_tokens, compressed_tokens, strategy \
         FROM optimizer_cache WHERE cache_key=?1",
        params![cache_key],
        |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, i64>(1)? as u64,
                r.get::<_, i64>(2)? as u64,
                r.get::<_, String>(3)?,
            ))
        },
    ) {
        let _ = conn.execute(
            "UPDATE optimizer_cache SET hits=hits+1, last_used=datetime('now') WHERE cache_key=?1",
            params![cache_key],
        );
        return Response {
            ok: true,
            error: None,
            kind: kind.to_string(),
            compressed: Some(compressed),
            content: None,
            original_hash: Some(hash),
            original_tokens: ot,
            compressed_tokens: ct,
            saved_tokens: ot.saturating_sub(ct),
            strategy,
            cache_hit: true,
        };
    }

    let min_ct = opts.min_compress_tokens.unwrap_or(400);
    let (body, strategy) = if original_tokens <= min_ct {
        (content.to_string(), "passthrough".to_string())
    } else {
        match kind {
            "logs" => compress_logs(content, opts),
            "search" => compress_search(content, query, opts),
            _ => compress_read(content, opts),
        }
    };

    let compressed_text = if strategy == "passthrough" {
        body
    } else {
        format!(
            "[vibeman-optimize: {kind} compressed — full original via `vibeman_retrieve hash={hash}` {mk}]\n{body}",
            kind = kind,
            hash = hash,
            mk = marker(&hash),
            body = body
        )
    };
    let compressed_tokens = estimate_tokens(&compressed_text);

    // Store original (idempotent) and cache the compressed result.
    let _ = conn.execute(
        "INSERT OR IGNORE INTO ccr_store (hash, content, bytes) VALUES (?1, ?2, ?3)",
        params![hash, content, content.len() as i64],
    );
    let _ = conn.execute(
        "INSERT OR REPLACE INTO optimizer_cache \
         (cache_key, kind, original_hash, compressed, original_tokens, compressed_tokens, strategy, hits, last_used) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, \
                 COALESCE((SELECT hits FROM optimizer_cache WHERE cache_key=?1), 0), datetime('now'))",
        params![
            cache_key,
            kind,
            hash,
            compressed_text,
            original_tokens as i64,
            compressed_tokens as i64,
            strategy
        ],
    );

    Response {
        ok: true,
        error: None,
        kind: kind.to_string(),
        compressed: Some(compressed_text),
        content: None,
        original_hash: Some(hash),
        original_tokens,
        compressed_tokens,
        saved_tokens: original_tokens.saturating_sub(compressed_tokens),
        strategy,
        cache_hit: false,
    }
}

fn handle_retrieve(conn: &Connection, hash: &str) -> Response {
    match conn.query_row(
        "SELECT content FROM ccr_store WHERE hash=?1",
        params![hash],
        |r| r.get::<_, String>(0),
    ) {
        Ok(content) => {
            let t = estimate_tokens(&content);
            Response {
                ok: true,
                error: None,
                kind: "retrieve".to_string(),
                compressed: None,
                content: Some(content),
                original_hash: Some(hash.to_string()),
                original_tokens: t,
                compressed_tokens: t,
                saved_tokens: 0,
                strategy: "retrieve".to_string(),
                cache_hit: true,
            }
        }
        Err(_) => err_response("retrieve", &format!("no stored content for hash {}", hash)),
    }
}

// ============================================================================
// Compressors (ported from headroom techniques)
// ============================================================================

/// Salience score for a log line — higher means keep.
fn classify_log_line(line: &str) -> i32 {
    let l = line.to_ascii_lowercase();
    if l.contains("panic") || l.contains("traceback") || l.contains("fatal") || l.contains("segfault") {
        return 100;
    }
    if l.contains("error") || l.contains(" fail") || l.contains("failed") || l.contains("exception") {
        return 90;
    }
    if l.contains("assert") || (l.contains("expected") && l.contains("got")) {
        return 80;
    }
    let has_digit = l.chars().any(|c| c.is_ascii_digit());
    if has_digit
        && (l.contains("passed") || l.contains("failed") || l.contains(" tests") || l.contains("test result"))
    {
        return 70; // summary lines (pytest/cargo/jest tallies)
    }
    if l.contains("warn") {
        return 50;
    }
    0
}

fn compress_logs(content: &str, opts: &Options) -> (String, String) {
    let max_lines = opts.max_lines.unwrap_or(200);
    let lines: Vec<&str> = content.lines().collect();
    let n = lines.len();
    if n <= max_lines {
        return (content.to_string(), "passthrough".to_string());
    }

    let anchor = 5usize;
    let mut scored: Vec<(usize, i32)> = lines
        .iter()
        .enumerate()
        .map(|(i, l)| {
            let mut s = classify_log_line(l);
            if i < anchor || i >= n.saturating_sub(anchor) {
                s += 30; // always keep the head/tail of the log
            }
            (i, s)
        })
        .collect();
    scored.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    let mut keep: Vec<usize> = scored.into_iter().take(max_lines).map(|(i, _)| i).collect();
    keep.sort_unstable();
    keep.dedup();

    (render_with_gaps(&lines, &keep, "lines"), "log-salience".to_string())
}

/// Parse a `path:line:content` match. Tolerant of Windows drive letters
/// (`C:\...rs:42:txt`) by anchoring on the first `:<digits>:` group.
fn parse_grep_line(line: &str) -> Option<(String, u64, String)> {
    let mut i = 0usize;
    while let Some(rel) = line[i..].find(':') {
        let pos = i + rel;
        let rest = &line[pos + 1..];
        let digit_len = rest.chars().take_while(|c| c.is_ascii_digit()).count();
        if digit_len > 0 {
            let after = &rest[digit_len..];
            if let Some(tail) = after.strip_prefix(':') {
                let file = line[..pos].to_string();
                let line_no: u64 = rest[..digit_len].parse().unwrap_or(0);
                return Some((file, line_no, tail.to_string()));
            }
        }
        i = pos + 1;
        if i >= line.len() {
            break;
        }
    }
    None
}

fn score_match(text: &str, query_terms: &[String]) -> i32 {
    let t = text.to_ascii_lowercase();
    let mut s = 1;
    for q in query_terms {
        if !q.is_empty() && t.contains(q.as_str()) {
            s += 5;
        }
    }
    for kw in [
        "todo", "fixme", "error", "panic", "fn ", "function", "class ", "export", "def ", "struct ", "impl ",
    ] {
        if t.contains(kw) {
            s += 2;
        }
    }
    s
}

fn compress_search(content: &str, query: Option<&str>, opts: &Options) -> (String, String) {
    let max_files = opts.max_files.unwrap_or(20);
    let max_lines = opts.max_lines.unwrap_or(200);
    let terms: Vec<String> = query
        .unwrap_or("")
        .to_ascii_lowercase()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    // Group matches by file, preserving first-seen order.
    let mut files: Vec<(String, Vec<(u64, String, i32)>)> = Vec::new();
    let mut idx: HashMap<String, usize> = HashMap::new();
    for line in content.lines() {
        if let Some((file, ln, text)) = parse_grep_line(line) {
            let sc = score_match(&text, &terms);
            let fi = match idx.get(&file) {
                Some(&i) => i,
                None => {
                    let i = files.len();
                    files.push((file.clone(), Vec::new()));
                    idx.insert(file, i);
                    i
                }
            };
            files[fi].1.push((ln, text, sc));
        }
    }
    if files.is_empty() {
        // Not grep-shaped — fall back to generic line salience.
        return compress_logs(content, opts);
    }

    // Rank files by aggregate match score; keep the top max_files.
    let mut file_scores: Vec<(usize, i32)> = files
        .iter()
        .enumerate()
        .map(|(i, (_, ms))| (i, ms.iter().map(|m| m.2).sum()))
        .collect();
    file_scores.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    let mut kept: Vec<usize> = file_scores.into_iter().take(max_files).map(|(i, _)| i).collect();
    let dropped_files = files.len().saturating_sub(kept.len());
    kept.sort_unstable(); // emit in original file order

    let per_file = (max_lines / kept.len().max(1)).max(3);
    let mut out = String::new();
    for &fi in &kept {
        let (file, matches) = &files[fi];
        out.push_str(file);
        out.push('\n');

        // Pick top-scored matches up to the per-file budget, plus first & last.
        let mut order: Vec<usize> = (0..matches.len()).collect();
        order.sort_by(|&a, &b| matches[b].2.cmp(&matches[a].2).then(matches[a].0.cmp(&matches[b].0)));
        let mut chosen: std::collections::BTreeSet<usize> = order.into_iter().take(per_file).collect();
        chosen.insert(0);
        chosen.insert(matches.len() - 1);
        let chosen: Vec<usize> = chosen.into_iter().collect();

        let mut prev: Option<usize> = None;
        for &mi in &chosen {
            if let Some(p) = prev {
                if mi > p + 1 {
                    out.push_str(&format!("  … {} matches elided …\n", mi - p - 1));
                }
            }
            out.push_str(&format!("  {}: {}\n", matches[mi].0, matches[mi].1.trim()));
            prev = Some(mi);
        }
    }
    if dropped_files > 0 {
        out.push_str(&format!("… {} more files with matches elided …\n", dropped_files));
    }
    (out, "search-salience".to_string())
}

/// Heuristic "code skeleton": keep imports/signatures/declarations + head/tail,
/// elide bodies. Reversible via CCR, so loss is recoverable on demand.
fn is_signature_line(trimmed: &str) -> bool {
    if trimmed.is_empty() {
        return false;
    }
    const PREFIXES: &[&str] = &[
        "import ", "import{", "from ", "export ", "package ", "use ", "namespace ", "module ", "require(",
        "public ", "private ", "protected ", "internal ", "static ", "abstract ",
        "function ", "async ", "func ", "fn ", "pub ", "def ", "class ", "struct ", "enum ", "interface ",
        "trait ", "impl ", "type ", "const ", "let ", "var ", "val ",
        "@", "#[", "#![", "///", "//!", "/**", "* @", "describe(", "it(", "test(",
    ];
    for p in PREFIXES {
        if trimmed.starts_with(p) {
            return true;
        }
    }
    // Declaration-shaped lines (open a block / arrow fn / typed signature).
    let opens = trimmed.ends_with('{') || trimmed.ends_with('(') || trimmed.ends_with("=>") || trimmed.ends_with("({");
    opens
        && (trimmed.contains("fn ")
            || trimmed.contains("function")
            || trimmed.contains("class ")
            || trimmed.contains("=>")
            || trimmed.contains("def "))
}

fn compress_read(content: &str, opts: &Options) -> (String, String) {
    let max_lines = opts.max_lines.unwrap_or(400);
    let lines: Vec<&str> = content.lines().collect();
    let n = lines.len();
    if n <= max_lines.min(60) {
        return (content.to_string(), "passthrough".to_string());
    }

    let head = 15usize.min(n);
    let tail_start = n.saturating_sub(5);
    let mut keep_flags = vec![false; n];
    for f in keep_flags.iter_mut().take(head) {
        *f = true;
    }
    for f in keep_flags.iter_mut().take(n).skip(tail_start) {
        *f = true;
    }
    for (i, l) in lines.iter().enumerate() {
        if is_signature_line(l.trim_start()) {
            keep_flags[i] = true;
        }
    }

    let kept_count = keep_flags.iter().filter(|&&k| k).count();
    // If the skeleton barely shrinks (dense/non-code), use a head+tail window.
    if kept_count as f64 > n as f64 * 0.7 {
        return head_tail_window(&lines, max_lines);
    }

    let keep: Vec<usize> = keep_flags
        .iter()
        .enumerate()
        .filter_map(|(i, &k)| if k { Some(i) } else { None })
        .collect();
    (render_with_gaps(&lines, &keep, "lines"), "code-skeleton".to_string())
}

fn head_tail_window(lines: &[&str], max_lines: usize) -> (String, String) {
    let n = lines.len();
    if n <= max_lines {
        return (lines.join("\n"), "passthrough".to_string());
    }
    let half = (max_lines / 2).max(1);
    let mut out = String::new();
    for l in lines.iter().take(half) {
        out.push_str(l);
        out.push('\n');
    }
    out.push_str(&format!("… {} lines elided …\n", n - 2 * half));
    for l in lines.iter().skip(n - half) {
        out.push_str(l);
        out.push('\n');
    }
    (out, "head-tail".to_string())
}

/// Render kept line indices in order, inserting "… N {unit} elided …" markers
/// for each gap (including leading/trailing gaps).
fn render_with_gaps(lines: &[&str], keep: &[usize], unit: &str) -> String {
    let n = lines.len();
    let mut out = String::new();
    let mut prev: Option<usize> = None;
    for &i in keep {
        match prev {
            None => {
                if i > 0 {
                    out.push_str(&format!("… {} {} elided …\n", i, unit));
                }
            }
            Some(p) => {
                if i > p + 1 {
                    out.push_str(&format!("… {} {} elided …\n", i - p - 1, unit));
                }
            }
        }
        out.push_str(lines[i]);
        out.push('\n');
        prev = Some(i);
    }
    if let Some(p) = prev {
        if p + 1 < n {
            out.push_str(&format!("… {} {} elided …\n", n - p - 1, unit));
        }
    }
    out
}

// ============================================================================
// main
// ============================================================================

fn err_response(kind: &str, msg: &str) -> Response {
    Response {
        ok: false,
        error: Some(msg.to_string()),
        kind: kind.to_string(),
        compressed: None,
        content: None,
        original_hash: None,
        original_tokens: 0,
        compressed_tokens: 0,
        saved_tokens: 0,
        strategy: "error".to_string(),
        cache_hit: false,
    }
}

fn print_response(r: &Response) {
    println!(
        "{}",
        serde_json::to_string(r).unwrap_or_else(|_| "{\"ok\":false,\"error\":\"serialize\"}".to_string())
    );
}

fn main() {
    let mut input = String::new();
    if std::io::stdin().read_to_string(&mut input).is_err() {
        print_response(&err_response("unknown", "failed to read stdin"));
        return;
    }
    let req: Request = match serde_json::from_str(&input) {
        Ok(r) => r,
        Err(e) => {
            print_response(&err_response("unknown", &format!("bad request json: {}", e)));
            return;
        }
    };
    let conn = match open_cache(&req.project_path) {
        Ok(c) => c,
        Err(e) => {
            print_response(&err_response(&req.kind, &format!("cache open failed: {}", e)));
            return;
        }
    };
    let _ = &req.path; // accepted for the caller's bookkeeping; key is content hash
    let resp = match req.kind.as_str() {
        "retrieve" => match req.hash.as_deref() {
            Some(h) => handle_retrieve(&conn, h),
            None => err_response("retrieve", "missing hash"),
        },
        "read" | "search" | "logs" => {
            handle_compress(&conn, &req.kind, &req.content, req.query.as_deref(), &req.options)
        }
        other => err_response(other, "unknown kind"),
    };
    print_response(&resp);
}

// ============================================================================
// tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn estimates_tokens() {
        assert_eq!(estimate_tokens(""), 0);
        assert!(estimate_tokens("hello world") >= 1);
        assert_eq!(estimate_tokens(&"x".repeat(35)), 10);
    }

    #[test]
    fn ccr_key_is_stable_and_short() {
        let a = ccr_key("abc");
        let b = ccr_key("abc");
        let c = ccr_key("abd");
        assert_eq!(a, b);
        assert_ne!(a, c);
        assert_eq!(a.len(), 24);
    }

    #[test]
    fn parses_unix_grep_line() {
        let (f, l, t) = parse_grep_line("src/foo.rs:42:    let x = 1;").unwrap();
        assert_eq!(f, "src/foo.rs");
        assert_eq!(l, 42);
        assert_eq!(t, "    let x = 1;");
    }

    #[test]
    fn parses_windows_grep_line() {
        let (f, l, t) = parse_grep_line(r"C:\Users\me\foo.rs:7:fn main() {").unwrap();
        assert_eq!(f, r"C:\Users\me\foo.rs");
        assert_eq!(l, 7);
        assert_eq!(t, "fn main() {");
    }

    #[test]
    fn logs_compression_shrinks_and_keeps_errors() {
        let mut s = String::new();
        for i in 0..500 {
            s.push_str(&format!("INFO step {}\n", i));
        }
        s.push_str("ERROR boom at the end\n");
        let (out, strat) = compress_logs(&s, &Options { max_lines: Some(50), ..Default::default() });
        assert_eq!(strat, "log-salience");
        assert!(out.lines().count() < 100);
        assert!(out.contains("ERROR boom"));
        assert!(out.contains("elided"));
    }

    #[test]
    fn search_compression_groups_by_file() {
        let mut s = String::new();
        for i in 0..100 {
            s.push_str(&format!("src/a.rs:{}:fn helper_{}() {{}}\n", i + 1, i));
        }
        s.push_str("src/b.rs:1:// TODO fix this\n");
        let (out, strat) =
            compress_search(&s, Some("helper"), &Options { max_lines: Some(20), ..Default::default() });
        assert_eq!(strat, "search-salience");
        assert!(out.contains("src/a.rs"));
        assert!(out.contains("src/b.rs"));
        assert!(out.lines().count() < 60);
    }
}
