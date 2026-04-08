/**
 * Natural Language Query API
 * Translates plain-English questions into SQL queries using LLM + schema metadata,
 * executes them safely (read-only), and returns structured results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { getSchemaMap } from '@/lib/db/schemaMap';
import { LLMManager } from '@/lib/llm/llm-manager';
import { withObservability } from '@/lib/observability/middleware';

const llmManager = new LLMManager();

// ── Schema endpoint (GET) ─────────────────────────────────────────────
async function handleGet() {
  try {
    const { map } = getSchemaMap();
    return NextResponse.json({
      success: true,
      tables: map.tables,
      tableCount: map.tables.length,
      generatedAt: map.generatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load schema' },
      { status: 500 }
    );
  }
}

// ── Query endpoint (POST) ─────────────────────────────────────────────
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, projectId } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: question' },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Question too long (max 500 characters)' },
        { status: 400 }
      );
    }

    const { text: schemaText } = getSchemaMap();

    // Build the LLM prompt
    const systemPrompt = `You are a SQL query generator for a SQLite database. You translate natural language questions into safe, read-only SQL queries.

RULES:
1. ONLY generate SELECT queries. Never INSERT, UPDATE, DELETE, DROP, ALTER, or any write operation.
2. Always use double-quoted table/column names if they contain special characters.
3. Use appropriate JOINs when the question spans multiple tables.
4. Limit results to 100 rows unless the user specifies otherwise.
5. For date filtering, SQLite stores dates as TEXT in ISO format (datetime('now')).
6. Use COUNT, SUM, AVG, GROUP BY as needed for aggregate questions.
7. When a project_id filter is relevant and a projectId is provided, include WHERE project_id = :projectId.
8. Return ONLY valid JSON with this exact structure:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what the query does",
  "params": { "paramName": "value" }
}

${schemaText}`;

    const userPrompt = projectId
      ? `Question: "${question}"\nProject ID: ${projectId}\n\nGenerate the SQL query.`
      : `Question: "${question}"\n\nGenerate the SQL query.`;

    const llmResponse = await llmManager.generate({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.1,
      maxTokens: 1024,
    });

    if (!llmResponse.success || !llmResponse.response) {
      return NextResponse.json(
        { success: false, error: llmResponse.error || 'LLM failed to generate query' },
        { status: 502 }
      );
    }

    // Parse the LLM response
    let parsed: { sql: string; explanation: string; params?: Record<string, string> };
    try {
      // Extract JSON from potential markdown code blocks
      let raw = llmResponse.response.trim();
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) raw = jsonMatch[1].trim();
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse LLM response as SQL', rawResponse: llmResponse.response },
        { status: 422 }
      );
    }

    if (!parsed.sql || typeof parsed.sql !== 'string') {
      return NextResponse.json(
        { success: false, error: 'LLM did not return a valid SQL query' },
        { status: 422 }
      );
    }

    // Safety check: only allow SELECT statements
    const sqlNormalized = parsed.sql.trim().toUpperCase();
    if (!sqlNormalized.startsWith('SELECT') && !sqlNormalized.startsWith('WITH')) {
      return NextResponse.json(
        { success: false, error: 'Only SELECT queries are allowed', sql: parsed.sql },
        { status: 403 }
      );
    }

    // Block dangerous patterns
    const dangerousPatterns = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|ATTACH|DETACH)\b/i;
    if (dangerousPatterns.test(parsed.sql)) {
      return NextResponse.json(
        { success: false, error: 'Query contains forbidden write operations', sql: parsed.sql },
        { status: 403 }
      );
    }

    // Execute the query
    const db = getDatabase();
    const startTime = performance.now();

    let rows: Record<string, unknown>[];
    try {
      const params = parsed.params || {};
      // Replace named params (:paramName) with values
      let execSql = parsed.sql;
      const paramValues: unknown[] = [];
      execSql = execSql.replace(/:(\w+)/g, (_match, name) => {
        paramValues.push(params[name] ?? null);
        return '?';
      });
      rows = db.prepare(execSql).all(...paramValues) as Record<string, unknown>[];
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `SQL execution error: ${error instanceof Error ? error.message : String(error)}`,
        sql: parsed.sql,
        explanation: parsed.explanation,
      }, { status: 422 });
    }

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    // Extract column names from result
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return NextResponse.json({
      success: true,
      question,
      sql: parsed.sql,
      explanation: parsed.explanation,
      columns,
      rows,
      rowCount: rows.length,
      durationMs,
      provider: llmResponse.provider,
      model: llmResponse.model,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/nl-query');
export const POST = withObservability(handlePost, '/api/nl-query');
