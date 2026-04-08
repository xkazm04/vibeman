import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { AutoAssignConfig } from '@/lib/autoAssignConfig';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'auto-assign-rules.json');

const DEFAULT_CONFIG: AutoAssignConfig = {
  lightweightRule: {
    enabled: true,
    conditions: { effort: 1, risk: 1 },
    provider: 'ollama',
    model: null,
  },
  defaultRule: {
    enabled: true,
    provider: null,
    model: null,
  },
  maxTasksPerSession: 10,
  consolidateBeforeAssign: true,
};

function readConfig(): AutoAssignConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw) as AutoAssignConfig;
    }
  } catch {
    // Fall through to default
  }

  // Create default config if missing
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  return DEFAULT_CONFIG;
}

export async function GET() {
  const config = readConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as AutoAssignConfig;

    // Validate maxTasksPerSession
    if (typeof body.maxTasksPerSession !== 'number' || body.maxTasksPerSession < 1) {
      return NextResponse.json({ error: 'maxTasksPerSession must be >= 1' }, { status: 400 });
    }
    // Cap maxTasksPerSession to prevent unreasonable values
    if (body.maxTasksPerSession > 100) {
      return NextResponse.json({ error: 'maxTasksPerSession must be <= 100' }, { status: 400 });
    }

    // Validate consolidateBeforeAssign is boolean
    if (typeof body.consolidateBeforeAssign !== 'boolean') {
      return NextResponse.json({ error: 'consolidateBeforeAssign must be a boolean' }, { status: 400 });
    }

    // Validate lightweightRule structure
    if (!body.lightweightRule || typeof body.lightweightRule.enabled !== 'boolean') {
      return NextResponse.json({ error: 'lightweightRule.enabled must be a boolean' }, { status: 400 });
    }
    if (body.lightweightRule.conditions) {
      const { effort, risk } = body.lightweightRule.conditions;
      if (typeof effort !== 'number' || effort < 0 || typeof risk !== 'number' || risk < 0) {
        return NextResponse.json({ error: 'lightweightRule.conditions.effort and risk must be non-negative numbers' }, { status: 400 });
      }
    }

    // Validate defaultRule structure
    if (!body.defaultRule || typeof body.defaultRule.enabled !== 'boolean') {
      return NextResponse.json({ error: 'defaultRule.enabled must be a boolean' }, { status: 400 });
    }

    // Only write validated fields to prevent prototype pollution / arbitrary injection
    const safeConfig: AutoAssignConfig = {
      lightweightRule: {
        enabled: body.lightweightRule.enabled,
        conditions: body.lightweightRule.conditions
          ? { effort: body.lightweightRule.conditions.effort, risk: body.lightweightRule.conditions.risk }
          : undefined,
        provider: body.lightweightRule.provider ?? null,
        model: body.lightweightRule.model ?? null,
      },
      defaultRule: {
        enabled: body.defaultRule.enabled,
        provider: body.defaultRule.provider ?? null,
        model: body.defaultRule.model ?? null,
      },
      maxTasksPerSession: body.maxTasksPerSession,
      consolidateBeforeAssign: body.consolidateBeforeAssign,
    };

    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(safeConfig, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid config' }, { status: 400 });
  }
}
