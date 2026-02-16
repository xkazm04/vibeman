/**
 * Healing Engine
 *
 * Spawns Claude CLI to analyze failed persona executions.
 * Three possible actions per failure:
 *   1. ignore  – transient/external issue, no action needed
 *   2. report  – creates a healing issue for user review
 *   3. fix     – auto-patches the persona prompt and records the change
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { getConnection } from '@/app/db/drivers';
import { healingIssueRepository } from '@/app/db/repositories/healingIssueRepository';
import type { DbPersonaHealingIssue } from '@/app/db/models/persona.types';

interface FailedExecution {
  id: string;
  persona_id: string;
  persona_name: string;
  system_prompt: string;
  structured_prompt: string | null;
  error_message: string | null;
  log_file_path: string | null;
  output_data: string | null;
  started_at: string;
  completed_at: string | null;
}

interface HealingAction {
  action: 'ignore' | 'report' | 'fix';
  persona_id: string;
  execution_id: string;
  // report fields
  title?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'prompt' | 'tool' | 'config' | 'external';
  suggested_fix?: string;
  // fix fields — the corrected prompt text
  fixed_prompt?: string;
  fix_summary?: string;
}

/** Read tail of a log file (best-effort, returns '' on any error) */
function readLogTail(filePath: string | null, maxChars = 2000): string {
  if (!filePath) return '';
  try {
    if (!fs.existsSync(filePath)) return '';
    const stat = fs.statSync(filePath);
    const size = stat.size;
    if (size === 0) return '';
    const start = Math.max(0, size - maxChars);
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(Math.min(maxChars, size));
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    return buf.toString('utf-8');
  } catch {
    return '';
  }
}

export async function runHealingAnalysis(options?: {
  personaId?: string;
  limit?: number;
}): Promise<DbPersonaHealingIssue[]> {
  const db = getConnection();
  const limit = options?.limit || 10;

  // 1. Query recent failed executions with full persona context
  let query = `
    SELECT pe.id, pe.persona_id, p.name AS persona_name,
           p.system_prompt, p.structured_prompt,
           pe.error_message, pe.log_file_path, pe.output_data,
           pe.started_at, pe.completed_at
    FROM persona_executions pe
    JOIN personas p ON p.id = pe.persona_id
    WHERE pe.status = 'failed'
  `;
  const params: (string | number)[] = [];

  if (options?.personaId) {
    query += ' AND pe.persona_id = ?';
    params.push(options.personaId);
  }

  query += ' ORDER BY pe.completed_at DESC LIMIT ?';
  params.push(limit);

  const failures = db.prepare(query).all(...params) as unknown as FailedExecution[];

  if (failures.length === 0) {
    return [];
  }

  // 2. Build rich failure descriptions with actual log content
  const failuresText = failures
    .map((f, i) => {
      const logContent = readLogTail(f.log_file_path, 2000);
      const outputSnippet = (f.output_data || '').slice(0, 1000);
      const promptSnippet = (f.system_prompt || '').slice(0, 3000);

      return `
=== Failure ${i + 1} ===
Execution ID: ${f.id}
Persona ID: ${f.persona_id}
Persona Name: ${f.persona_name}
Started: ${f.started_at}
Completed: ${f.completed_at || 'N/A'}
Error Message: ${f.error_message || '(none)'}
Execution Output: ${outputSnippet || '(empty)'}
Log Tail: ${logContent || '(no log file)'}
System Prompt: ${promptSnippet}
`;
    })
    .join('\n');

  // 3. Build the analysis prompt
  const analysisPrompt = `You are a persona health diagnostician. Analyze these failed AI persona executions and decide what to do for EACH failure.

For EACH failure, choose exactly ONE action:

  "ignore" – The failure is transient, caused by external services, or not fixable (e.g. rate limits, network errors, API outages). No action needed.

  "report" – The failure needs human attention (e.g. missing credentials, wrong tool config, ambiguous requirements). Create a report with title, description, severity, category, and suggested_fix.

  "fix" – The failure is caused by a bad/incomplete persona prompt that you can improve. Provide the corrected system_prompt text in "fixed_prompt" and a short summary of what you changed in "fix_summary". Only use this when you are confident the prompt change will resolve the issue.

Respond with ONLY a valid JSON array. Each element must have "action", "persona_id", and "execution_id". Additional fields depend on the action:

For "report": title (max 80 chars), description, severity (low|medium|high|critical), category (prompt|tool|config|external), suggested_fix
For "fix": fixed_prompt (the full corrected system_prompt), fix_summary (1-2 sentences)
For "ignore": no additional fields needed

Example: [
  {"action":"ignore","persona_id":"p1","execution_id":"e1"},
  {"action":"report","persona_id":"p2","execution_id":"e2","title":"Missing API key","description":"...","severity":"high","category":"config","suggested_fix":"Add OPENAI_API_KEY to credentials"},
  {"action":"fix","persona_id":"p3","execution_id":"e3","fixed_prompt":"You are a helpful...","fix_summary":"Added error handling instructions for rate limits"}
]

Failed executions to analyze:
${failuresText}`;

  // 4. Write prompt to temp file (avoids shell argument length limits)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healing-'));
  const promptFile = path.join(tmpDir, 'prompt.txt');
  fs.writeFileSync(promptFile, analysisPrompt, 'utf-8');

  // 5. Spawn Claude CLI
  return new Promise<DbPersonaHealingIssue[]>((resolve) => {
    const args = [
      '-p', `$(cat "${promptFile.replace(/\\/g, '/')}")`,
      '--model', 'haiku',
      '--max-turns', '1',
      '--output-format', 'text',
    ];

    // On Windows, read the file content and pipe via stdin instead
    const isWindows = process.platform === 'win32';
    let cliArgs: string[];
    if (isWindows) {
      cliArgs = ['--model', 'haiku', '--max-turns', '1', '--output-format', 'text', '-p', '-'];
    } else {
      cliArgs = args;
    }

    const proc = spawn('claude', cliArgs, {
      cwd: tmpDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env },
    });

    // On Windows, pipe prompt via stdin
    if (isWindows) {
      proc.stdin?.write(analysisPrompt);
      proc.stdin?.end();
    }

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // Clean up
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }

      console.log(`[healing] CLI exited with code ${code}, stdout length: ${stdout.length}`);
      if (stderr) console.log('[healing] stderr:', stderr.slice(0, 300));

      const created: DbPersonaHealingIssue[] = [];

      try {
        // Extract JSON array from output
        const jsonMatch = stdout.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error('[healing] No JSON array found in CLI output:', stdout.slice(0, 500));
          resolve(created);
          return;
        }

        const actions: HealingAction[] = JSON.parse(jsonMatch[0]);

        for (const a of actions) {
          if (!a.action || !a.persona_id || !a.execution_id) continue;

          if (a.action === 'ignore') {
            // Skip — nothing to do
            console.log(`[healing] Ignoring failure ${a.execution_id} (transient/external)`);
            continue;
          }

          if (a.action === 'fix' && a.fixed_prompt) {
            // Auto-fix: update the persona's system_prompt in DB
            try {
              db.prepare(
                'UPDATE personas SET system_prompt = ?, updated_at = datetime(\'now\') WHERE id = ?'
              ).run(a.fixed_prompt, a.persona_id);

              console.log(`[healing] Auto-fixed persona ${a.persona_id}: ${a.fix_summary || 'prompt updated'}`);

              // Record the fix as an auto-resolved issue
              const issue = healingIssueRepository.create({
                persona_id: a.persona_id,
                execution_id: a.execution_id,
                title: `Auto-fixed: ${(a.fix_summary || 'prompt updated').slice(0, 170)}`,
                description: `The healing engine automatically patched this persona's prompt.\n\nFix summary: ${a.fix_summary || 'N/A'}\n\nThe original prompt was replaced. If this fix is incorrect, restore from prompt version history.`,
                severity: 'low',
                category: 'prompt',
                suggested_fix: a.fix_summary || null,
              });
              // Mark as auto-fixed
              db.prepare(
                'UPDATE persona_healing_issues SET auto_fixed = 1, status = \'resolved\', resolved_at = datetime(\'now\') WHERE id = ?'
              ).run(issue.id);
              issue.auto_fixed = 1;
              issue.status = 'resolved';
              created.push(issue);
            } catch (fixErr) {
              console.error(`[healing] Failed to auto-fix persona ${a.persona_id}:`, fixErr);
              // Fall through to report instead
              const issue = healingIssueRepository.create({
                persona_id: a.persona_id,
                execution_id: a.execution_id,
                title: `Fix failed: ${(a.fix_summary || 'prompt update').slice(0, 170)}`,
                description: `The healing engine attempted to auto-fix but failed. Manual intervention needed.\n\nIntended fix: ${a.fix_summary || 'N/A'}\n\nError: ${String(fixErr)}`,
                severity: 'medium',
                category: 'prompt',
                suggested_fix: a.fixed_prompt?.slice(0, 500) || null,
              });
              created.push(issue);
            }
            continue;
          }

          if (a.action === 'report' && a.title) {
            // Report: create an open issue for user review
            const issue = healingIssueRepository.create({
              persona_id: a.persona_id,
              execution_id: a.execution_id,
              title: (a.title || 'Unknown issue').slice(0, 200),
              description: a.description || 'No details provided',
              severity: (['low', 'medium', 'high', 'critical'].includes(a.severity || '')
                ? a.severity
                : 'medium') as DbPersonaHealingIssue['severity'],
              category: (['prompt', 'tool', 'config', 'external'].includes(a.category || '')
                ? a.category
                : 'prompt') as DbPersonaHealingIssue['category'],
              suggested_fix: a.suggested_fix || null,
            });
            created.push(issue);
            continue;
          }
        }
      } catch (err) {
        console.error('[healing] Failed to parse CLI output:', err, stdout.slice(0, 500));
      }

      resolve(created);
    });

    proc.on('error', (err) => {
      console.error('[healing] CLI spawn error:', err);
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      resolve([]);
    });
  });
}
