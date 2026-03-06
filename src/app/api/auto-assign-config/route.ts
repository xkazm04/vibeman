import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { AutoAssignConfig } from '@/lib/autoAssignConfig';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'auto-assign-rules.json');

const DEFAULT_CONFIG: AutoAssignConfig = {
  geminiRule: {
    enabled: true,
    conditions: { effort: 1, risk: 1 },
    provider: 'gemini',
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

    // Basic validation
    if (typeof body.maxTasksPerSession !== 'number' || body.maxTasksPerSession < 1) {
      return NextResponse.json({ error: 'maxTasksPerSession must be >= 1' }, { status: 400 });
    }

    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid config' }, { status: 400 });
  }
}
