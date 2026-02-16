/**
 * Healing Engine
 *
 * Spawns Claude CLI to analyze failed persona executions and produce
 * structured healing issues. Issues are stored in the DB for the
 * observability dashboard.
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
  status: string;
  error_message: string | null;
  output_log: string | null;
  started_at: string;
  completed_at: string | null;
}

interface HealingResult {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'prompt' | 'tool' | 'config' | 'external';
  suggested_fix: string;
  persona_id: string;
  execution_id: string;
}

export async function runHealingAnalysis(options?: { personaId?: string; limit?: number }): Promise<DbPersonaHealingIssue[]> {
  const db = getConnection();
  const limit = options?.limit || 10;

  // Query failed executions with persona info
  let query = `
    SELECT pe.id, pe.persona_id, p.name as persona_name, p.system_prompt,
           pe.status, pe.error_message, pe.log_file_path as output_log, pe.started_at, pe.completed_at
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

  // Build analysis prompt
  const failuresText = failures.map((f, i) => {
    const prompt = (f.system_prompt || '').slice(0, 2000);
    const error = f.error_message || 'No error message';
    const output = (f.output_log || '').slice(0, 1000);
    return `
--- Failure ${i + 1} ---
Execution ID: ${f.id}
Persona ID: ${f.persona_id}
Persona Name: ${f.persona_name}
Started: ${f.started_at}
Completed: ${f.completed_at || 'N/A'}
Error: ${error}
Output (last 1000 chars): ${output}
System Prompt (first 2000 chars): ${prompt}
`;
  }).join('\n');

  const analysisPrompt = `Analyze these failed persona executions and produce a JSON array of issues.

For each failure, determine:
- title: short summary (max 80 chars)
- description: detailed analysis with root cause and recommendation
- severity: low|medium|high|critical
- category: prompt (bad instructions), tool (tool misconfigured), config (settings wrong), external (API/service issue)
- suggested_fix: actionable fix description

Respond with ONLY a valid JSON array, no other text: [{ "title": "...", "description": "...", "severity": "...", "category": "...", "suggested_fix": "...", "persona_id": "...", "execution_id": "..." }]

Failed executions:
${failuresText}`;

  // Spawn Claude CLI in temp dir (avoid interference with project CLAUDE.md)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healing-'));

  return new Promise<DbPersonaHealingIssue[]>((resolve) => {
    const args = ['-p', analysisPrompt, '--model', 'haiku', '--max-turns', '1', '--output-format', 'text'];

    const proc = spawn('claude', args, {
      cwd: tmpDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', () => {
      // Clean up temp dir
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }

      // Parse JSON from output
      const created: DbPersonaHealingIssue[] = [];
      try {
        // Extract JSON array from output (may have surrounding text)
        const jsonMatch = stdout.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error('[healing] No JSON array found in output:', stdout.slice(0, 500));
          resolve(created);
          return;
        }

        const results: HealingResult[] = JSON.parse(jsonMatch[0]);

        for (const r of results) {
          if (!r.title || !r.description || !r.persona_id) continue;
          const issue = healingIssueRepository.create({
            persona_id: r.persona_id,
            execution_id: r.execution_id || null,
            title: r.title.slice(0, 200),
            description: r.description,
            severity: (['low', 'medium', 'high', 'critical'].includes(r.severity) ? r.severity : 'medium') as DbPersonaHealingIssue['severity'],
            category: (['prompt', 'tool', 'config', 'external'].includes(r.category) ? r.category : 'prompt') as DbPersonaHealingIssue['category'],
            suggested_fix: r.suggested_fix || null,
          });
          created.push(issue);
        }
      } catch (err) {
        console.error('[healing] Failed to parse CLI output:', err, stdout.slice(0, 500));
      }

      resolve(created);
    });

    proc.on('error', (err) => {
      console.error('[healing] CLI spawn error:', err);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      resolve([]);
    });
  });
}
