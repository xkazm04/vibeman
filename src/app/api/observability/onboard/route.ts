/**
 * API Route: Observability Onboarding
 *
 * POST /api/observability/onboard
 * Generates a Claude Code requirement file for setting up observability in a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { observabilityDb } from '@/app/db';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

type Framework = 'nextjs' | 'fastapi' | 'express' | 'unknown';

/**
 * Detect project framework based on file presence
 */
function detectFramework(projectPath: string): Framework {
  try {
    // Check for Next.js
    if (
      fs.existsSync(path.join(projectPath, 'next.config.js')) ||
      fs.existsSync(path.join(projectPath, 'next.config.ts')) ||
      fs.existsSync(path.join(projectPath, 'next.config.mjs'))
    ) {
      return 'nextjs';
    }

    // Check for FastAPI (Python)
    const requirementsTxt = path.join(projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsTxt)) {
      const content = fs.readFileSync(requirementsTxt, 'utf-8');
      if (content.toLowerCase().includes('fastapi')) {
        return 'fastapi';
      }
    }

    // Check for Express.js
    const packageJson = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJson)) {
      const content = fs.readFileSync(packageJson, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.dependencies?.express || pkg.devDependencies?.express) {
        return 'express';
      }
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Generate onboarding requirement content based on framework
 * Creates a FULLY SELF-CONTAINED observability system with local SQLite database
 */
function generateOnboardingContent(
  projectId: string,
  projectPath: string,
  projectName: string,
  framework: Framework,
  vibemanUrl: string
): string {
  const commonHeader = `# Observability Onboarding for ${projectName}

## Context
This is an automated onboarding task to set up a **fully self-contained** API observability system for this project.
The system includes:
- Local SQLite database for storing metrics
- Database schema and migrations
- Repository layer for data access
- Middleware for automatic API tracking
- Optional sync to Vibeman for centralized viewing

**IMPORTANT**: This setup is for LOCAL DEVELOPMENT ONLY. Database files and logs should NOT be committed.

## Project Information
- Project ID: ${projectId}
- Project Path: ${projectPath}
- Framework: ${framework}
- Vibeman URL: ${vibemanUrl} (optional - for centralized viewing)

`;

  if (framework === 'nextjs') {
    return commonHeader + `## Tasks for Next.js Project

### 1. Install Dependencies
Add better-sqlite3 for local database:
\`\`\`bash
npm install better-sqlite3 uuid
npm install -D @types/better-sqlite3 @types/uuid
\`\`\`

### 2. Create Database Connection
Create \`${projectPath}/src/lib/observability/db.ts\`:

\`\`\`typescript
/**
 * Observability Database Connection
 * Local SQLite database for API metrics
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getObsDatabase(): Database.Database {
  if (db) return db;

  // Create database directory if it doesn't exist
  const dbDir = path.join(process.cwd(), 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'observability.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Run migrations on first connect
  runMigrations(db);

  return db;
}

function runMigrations(db: Database.Database): void {
  // Create obs_api_calls table
  db.exec(\`
    CREATE TABLE IF NOT EXISTS obs_api_calls (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER,
      request_size_bytes INTEGER,
      response_size_bytes INTEGER,
      user_agent TEXT,
      error_message TEXT,
      called_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_obs_api_calls_endpoint ON obs_api_calls(endpoint);
    CREATE INDEX IF NOT EXISTS idx_obs_api_calls_called_at ON obs_api_calls(called_at DESC);
  \`);

  // Create obs_endpoint_stats table (hourly aggregates)
  db.exec(\`
    CREATE TABLE IF NOT EXISTS obs_endpoint_stats (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      call_count INTEGER NOT NULL DEFAULT 0,
      avg_response_time_ms REAL,
      max_response_time_ms INTEGER,
      error_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(endpoint, method, period_start)
    );
    CREATE INDEX IF NOT EXISTS idx_obs_endpoint_stats_period ON obs_endpoint_stats(period_start DESC);
  \`);
}

export function closeObsDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
\`\`\`

### 3. Create Repository
Create \`${projectPath}/src/lib/observability/repository.ts\`:

\`\`\`typescript
/**
 * Observability Repository
 * Data access layer for API metrics
 */
import { v4 as uuidv4 } from 'uuid';
import { getObsDatabase } from './db';

export interface ApiCallData {
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  request_size_bytes?: number;
  response_size_bytes?: number;
  user_agent?: string;
  error_message?: string;
}

export interface EndpointStats {
  endpoint: string;
  method: string;
  total_calls: number;
  avg_response_time_ms: number;
  max_response_time_ms: number;
  error_count: number;
  error_rate: number;
}

export const observabilityRepo = {
  logApiCall(data: ApiCallData): void {
    const db = getObsDatabase();
    const stmt = db.prepare(\`
      INSERT INTO obs_api_calls (
        id, endpoint, method, status_code, response_time_ms,
        request_size_bytes, response_size_bytes, user_agent,
        error_message, called_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`);

    stmt.run(
      uuidv4(),
      data.endpoint,
      data.method,
      data.status_code,
      data.response_time_ms,
      data.request_size_bytes ?? null,
      data.response_size_bytes ?? null,
      data.user_agent ?? null,
      data.error_message ?? null,
      new Date().toISOString()
    );
  },

  getEndpointStats(days: number = 7): EndpointStats[] {
    const db = getObsDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stmt = db.prepare(\`
      SELECT
        endpoint,
        method,
        COUNT(*) as total_calls,
        ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
        MAX(response_time_ms) as max_response_time_ms,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        ROUND(CAST(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) as error_rate
      FROM obs_api_calls
      WHERE called_at >= ?
      GROUP BY endpoint, method
      ORDER BY total_calls DESC
    \`);

    return stmt.all(startDate.toISOString()) as EndpointStats[];
  },

  getRecentCalls(limit: number = 100): Array<ApiCallData & { id: string; called_at: string }> {
    const db = getObsDatabase();
    const stmt = db.prepare(\`
      SELECT * FROM obs_api_calls
      ORDER BY called_at DESC
      LIMIT ?
    \`);
    return stmt.all(limit) as Array<ApiCallData & { id: string; called_at: string }>;
  },

  getDashboardStats(days: number = 7): {
    total_calls: number;
    unique_endpoints: number;
    avg_response_time_ms: number;
    error_rate: number;
  } {
    const db = getObsDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stmt = db.prepare(\`
      SELECT
        COUNT(*) as total_calls,
        COUNT(DISTINCT endpoint) as unique_endpoints,
        ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
        ROUND(CAST(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) as error_rate
      FROM obs_api_calls
      WHERE called_at >= ?
    \`);

    const result = stmt.get(startDate.toISOString()) as {
      total_calls: number;
      unique_endpoints: number;
      avg_response_time_ms: number;
      error_rate: number;
    };

    return result;
  }
};
\`\`\`

### 4. Create Middleware
Create \`${projectPath}/src/lib/observability/middleware.ts\`:

\`\`\`typescript
/**
 * API Observability Middleware for Next.js
 * Automatically tracks all API route usage
 */
import { NextRequest, NextResponse } from 'next/server';
import { observabilityRepo } from './repository';

const OBSERVABILITY_ENABLED = process.env.OBSERVABILITY_ENABLED === 'true';
const VIBEMAN_URL = process.env.VIBEMAN_URL;
const PROJECT_ID = '${projectId}';

// Optional: Sync to Vibeman for centralized viewing
async function syncToVibeman(data: {
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  error_message?: string;
}) {
  if (!VIBEMAN_URL) return;

  try {
    await fetch(\`\${VIBEMAN_URL}/api/observability/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: PROJECT_ID,
        ...data,
        called_at: new Date().toISOString()
      })
    });
  } catch {
    // Silently fail - don't break the app
  }
}

export function withObservability<T extends (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  endpoint: string
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    if (!OBSERVABILITY_ENABLED) {
      return handler(request, ...args);
    }

    const startTime = Date.now();
    let response: NextResponse;
    let errorMessage: string | undefined;

    try {
      response = await handler(request, ...args);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      response = NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const responseTime = Date.now() - startTime;
    const requestSize = parseInt(request.headers.get('content-length') || '0');

    // Log to local database
    try {
      observabilityRepo.logApiCall({
        endpoint,
        method: request.method,
        status_code: response.status,
        response_time_ms: responseTime,
        request_size_bytes: requestSize,
        user_agent: request.headers.get('user-agent') || undefined,
        error_message: errorMessage
      });
    } catch (dbError) {
      console.error('[Observability] Failed to log:', dbError);
    }

    // Optionally sync to Vibeman
    syncToVibeman({
      endpoint,
      method: request.method,
      status_code: response.status,
      response_time_ms: responseTime,
      error_message: errorMessage
    });

    return response;
  }) as T;
}
\`\`\`

### 5. Create Stats API Route
Create \`${projectPath}/src/app/api/observability/stats/route.ts\`:

\`\`\`typescript
/**
 * Local Observability Stats API
 * Returns metrics from local database
 */
import { NextResponse } from 'next/server';
import { observabilityRepo } from '@/lib/observability/repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const stats = observabilityRepo.getDashboardStats(days);
    const endpoints = observabilityRepo.getEndpointStats(days);

    return NextResponse.json({
      success: true,
      stats,
      endpoints
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
\`\`\`

### 6. Update Configuration Files

#### Add to .env.example:
\`\`\`
# Observability (development only - do not commit .env)
OBSERVABILITY_ENABLED=true
# Optional: Sync to Vibeman for centralized viewing
VIBEMAN_URL=http://localhost:3000
\`\`\`

#### Add to .gitignore:
\`\`\`
# Observability database
database/observability.db
database/observability.db-shm
database/observability.db-wal
\`\`\`

### 7. Wrap API Routes
For each API route you want to track, add the middleware wrapper.

Example for \`src/app/api/users/route.ts\`:
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  // Your existing logic
  return NextResponse.json({ users: [] });
}

async function handlePost(request: NextRequest) {
  // Your existing logic
  return NextResponse.json({ created: true });
}

export const GET = withObservability(handleGet, '/api/users');
export const POST = withObservability(handlePost, '/api/users');
\`\`\`

### 8. (Optional) Register with Vibeman
If you want centralized viewing in Vibeman:
\`\`\`bash
curl -X POST ${vibemanUrl}/api/observability/register \\
  -H "Content-Type: application/json" \\
  -d '{"project_id": "${projectId}", "project_path": "${projectPath}", "framework": "nextjs", "status": "onboarded"}'
\`\`\`

## Success Criteria
- [ ] Dependencies installed (better-sqlite3, uuid)
- [ ] Database connection created at src/lib/observability/db.ts
- [ ] Repository created at src/lib/observability/repository.ts
- [ ] Middleware created at src/lib/observability/middleware.ts
- [ ] Stats API route created at src/app/api/observability/stats/route.ts
- [ ] .env.example updated
- [ ] .gitignore updated to exclude database files
- [ ] At least 3 API routes wrapped with observability middleware
- [ ] Test by making API calls and checking /api/observability/stats

## Architecture
\`\`\`
API Request → Middleware → Handler → Response
                ↓
         Log to SQLite
                ↓
         (Optional) Sync to Vibeman
\`\`\`

## Notes
- The SQLite database is created automatically on first use
- All logging is async and won't impact response times
- Set OBSERVABILITY_ENABLED=false to disable without removing code
- Data is stored locally - view via /api/observability/stats or Vibeman
`;
  }

  if (framework === 'fastapi') {
    return commonHeader + `## Tasks for FastAPI Project

### 1. Install Dependencies
\`\`\`bash
pip install aiosqlite httpx
\`\`\`

Add to requirements.txt:
\`\`\`
aiosqlite>=0.19.0
httpx>=0.24.0
\`\`\`

### 2. Create Database Module
Create \`${projectPath}/app/observability/db.py\`:

\`\`\`python
"""
Observability Database Connection
Local SQLite database for API metrics
"""
import os
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent.parent.parent / "database" / "observability.db"

def get_connection() -> sqlite3.Connection:
    """Get a database connection, creating database if needed."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def run_migrations():
    """Create tables if they don't exist."""
    conn = get_connection()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS obs_api_calls (
                id TEXT PRIMARY KEY,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                status_code INTEGER,
                response_time_ms INTEGER,
                request_size_bytes INTEGER,
                response_size_bytes INTEGER,
                user_agent TEXT,
                error_message TEXT,
                called_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_obs_api_calls_endpoint ON obs_api_calls(endpoint);
            CREATE INDEX IF NOT EXISTS idx_obs_api_calls_called_at ON obs_api_calls(called_at DESC);

            CREATE TABLE IF NOT EXISTS obs_endpoint_stats (
                id TEXT PRIMARY KEY,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                period_start TEXT NOT NULL,
                period_end TEXT NOT NULL,
                call_count INTEGER NOT NULL DEFAULT 0,
                avg_response_time_ms REAL,
                max_response_time_ms INTEGER,
                error_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(endpoint, method, period_start)
            );
        """)
        conn.commit()
    finally:
        conn.close()

# Run migrations on import
run_migrations()
\`\`\`

### 3. Create Repository
Create \`${projectPath}/app/observability/repository.py\`:

\`\`\`python
"""
Observability Repository
Data access layer for API metrics
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from .db import get_connection

def log_api_call(
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: int,
    request_size_bytes: Optional[int] = None,
    user_agent: Optional[str] = None,
    error_message: Optional[str] = None
) -> None:
    """Log a single API call."""
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO obs_api_calls (
                id, endpoint, method, status_code, response_time_ms,
                request_size_bytes, user_agent, error_message, called_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                endpoint,
                method,
                status_code,
                response_time_ms,
                request_size_bytes,
                user_agent,
                error_message,
                datetime.utcnow().isoformat()
            )
        )
        conn.commit()
    finally:
        conn.close()

def get_endpoint_stats(days: int = 7) -> List[Dict[str, Any]]:
    """Get aggregated endpoint statistics."""
    conn = get_connection()
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor = conn.execute(
            """
            SELECT
                endpoint,
                method,
                COUNT(*) as total_calls,
                ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
                MAX(response_time_ms) as max_response_time_ms,
                SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
                ROUND(CAST(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) as error_rate
            FROM obs_api_calls
            WHERE called_at >= ?
            GROUP BY endpoint, method
            ORDER BY total_calls DESC
            """,
            (start_date,)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_dashboard_stats(days: int = 7) -> Dict[str, Any]:
    """Get overall dashboard statistics."""
    conn = get_connection()
    try:
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        cursor = conn.execute(
            """
            SELECT
                COUNT(*) as total_calls,
                COUNT(DISTINCT endpoint) as unique_endpoints,
                ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
                ROUND(CAST(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) as error_rate
            FROM obs_api_calls
            WHERE called_at >= ?
            """,
            (start_date,)
        )
        row = cursor.fetchone()
        return dict(row) if row else {}
    finally:
        conn.close()
\`\`\`

### 4. Create Middleware
Create \`${projectPath}/app/observability/middleware.py\`:

\`\`\`python
"""
API Observability Middleware for FastAPI
Automatically tracks all API route usage
"""
import os
import time
import httpx
import asyncio
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from .repository import log_api_call

OBSERVABILITY_ENABLED = os.getenv("OBSERVABILITY_ENABLED", "false").lower() == "true"
VIBEMAN_URL = os.getenv("VIBEMAN_URL")
PROJECT_ID = "${projectId}"


async def sync_to_vibeman(data: dict):
    """Optional: Sync to Vibeman for centralized viewing."""
    if not VIBEMAN_URL:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{VIBEMAN_URL}/api/observability/register",
                json={"project_id": PROJECT_ID, **data},
                timeout=5.0
            )
    except Exception:
        pass  # Silently fail


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not OBSERVABILITY_ENABLED:
            return await call_next(request)

        start_time = time.time()
        error_message = None

        try:
            response = await call_next(request)
        except Exception as e:
            error_message = str(e)
            raise

        response_time_ms = int((time.time() - start_time) * 1000)

        # Log to local database (sync, but fast)
        try:
            log_api_call(
                endpoint=request.url.path,
                method=request.method,
                status_code=response.status_code,
                response_time_ms=response_time_ms,
                request_size_bytes=int(request.headers.get("content-length", 0)),
                user_agent=request.headers.get("user-agent"),
                error_message=error_message
            )
        except Exception as e:
            print(f"[Observability] Failed to log: {e}")

        # Optional: Sync to Vibeman (async, non-blocking)
        asyncio.create_task(sync_to_vibeman({
            "endpoint": request.url.path,
            "method": request.method,
            "status_code": response.status_code,
            "response_time_ms": response_time_ms,
            "error_message": error_message,
            "called_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }))

        return response
\`\`\`

### 5. Create Stats API Route
Create \`${projectPath}/app/routers/observability.py\`:

\`\`\`python
"""
Local Observability Stats API
Returns metrics from local database
"""
from fastapi import APIRouter, Query
from app.observability.repository import get_dashboard_stats, get_endpoint_stats

router = APIRouter(prefix="/api/observability", tags=["observability"])

@router.get("/stats")
async def get_stats(days: int = Query(default=7, ge=1, le=90)):
    """Get observability statistics."""
    return {
        "success": True,
        "stats": get_dashboard_stats(days),
        "endpoints": get_endpoint_stats(days)
    }
\`\`\`

### 6. Register Middleware and Router
In your main app file (e.g., \`main.py\`):

\`\`\`python
from fastapi import FastAPI
from app.observability.middleware import ObservabilityMiddleware
from app.routers import observability

app = FastAPI()

# Add observability middleware
app.add_middleware(ObservabilityMiddleware)

# Add observability router
app.include_router(observability.router)
\`\`\`

### 7. Update Configuration Files

#### Add to .env.example:
\`\`\`
# Observability (development only)
OBSERVABILITY_ENABLED=true
# Optional: Sync to Vibeman
VIBEMAN_URL=http://localhost:3000
\`\`\`

#### Add to .gitignore:
\`\`\`
# Observability database
database/observability.db
\`\`\`

### 8. (Optional) Register with Vibeman
\`\`\`bash
curl -X POST ${vibemanUrl}/api/observability/register \\
  -H "Content-Type: application/json" \\
  -d '{"project_id": "${projectId}", "project_path": "${projectPath}", "framework": "fastapi", "status": "onboarded"}'
\`\`\`

## Success Criteria
- [ ] Dependencies installed (aiosqlite, httpx)
- [ ] Database module created at app/observability/db.py
- [ ] Repository created at app/observability/repository.py
- [ ] Middleware created at app/observability/middleware.py
- [ ] Stats router created at app/routers/observability.py
- [ ] Middleware registered in main app
- [ ] Router registered in main app
- [ ] .env.example updated
- [ ] .gitignore updated
- [ ] Test by making API calls and checking /api/observability/stats
`;
  }

  if (framework === 'express') {
    return commonHeader + `## Tasks for Express.js Project

### 1. Install Dependencies
\`\`\`bash
npm install better-sqlite3 uuid
\`\`\`

### 2. Create Database Module
Create \`${projectPath}/src/observability/db.js\`:

\`\`\`javascript
/**
 * Observability Database Connection
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

function getDatabase() {
  if (db) return db;

  const dbDir = path.join(process.cwd(), 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(path.join(dbDir, 'observability.db'));
  db.pragma('journal_mode = WAL');
  runMigrations(db);
  return db;
}

function runMigrations(db) {
  db.exec(\`
    CREATE TABLE IF NOT EXISTS obs_api_calls (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER,
      user_agent TEXT,
      error_message TEXT,
      called_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_obs_api_calls_endpoint ON obs_api_calls(endpoint);
    CREATE INDEX IF NOT EXISTS idx_obs_api_calls_called_at ON obs_api_calls(called_at DESC);
  \`);
}

module.exports = { getDatabase };
\`\`\`

### 3. Create Repository
Create \`${projectPath}/src/observability/repository.js\`:

\`\`\`javascript
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('./db');

const observabilityRepo = {
  logApiCall(data) {
    const db = getDatabase();
    const stmt = db.prepare(\`
      INSERT INTO obs_api_calls (id, endpoint, method, status_code, response_time_ms, user_agent, error_message, called_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`);
    stmt.run(uuidv4(), data.endpoint, data.method, data.status_code, data.response_time_ms, data.user_agent, data.error_message, new Date().toISOString());
  },

  getEndpointStats(days = 7) {
    const db = getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return db.prepare(\`
      SELECT endpoint, method, COUNT(*) as total_calls,
             ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
             MAX(response_time_ms) as max_response_time_ms,
             SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
      FROM obs_api_calls WHERE called_at >= ?
      GROUP BY endpoint, method ORDER BY total_calls DESC
    \`).all(startDate.toISOString());
  },

  getDashboardStats(days = 7) {
    const db = getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return db.prepare(\`
      SELECT COUNT(*) as total_calls, COUNT(DISTINCT endpoint) as unique_endpoints,
             ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
             ROUND(CAST(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) as error_rate
      FROM obs_api_calls WHERE called_at >= ?
    \`).get(startDate.toISOString());
  }
};

module.exports = { observabilityRepo };
\`\`\`

### 4. Create Middleware
Create \`${projectPath}/src/observability/middleware.js\`:

\`\`\`javascript
const { observabilityRepo } = require('./repository');

const OBSERVABILITY_ENABLED = process.env.OBSERVABILITY_ENABLED === 'true';
const VIBEMAN_URL = process.env.VIBEMAN_URL;
const PROJECT_ID = '${projectId}';

async function syncToVibeman(data) {
  if (!VIBEMAN_URL) return;
  try {
    await fetch(\`\${VIBEMAN_URL}/api/observability/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: PROJECT_ID, ...data })
    });
  } catch (e) { /* ignore */ }
}

function observabilityMiddleware(req, res, next) {
  if (!OBSERVABILITY_ENABLED) return next();

  const startTime = Date.now();

  res.on('finish', () => {
    const data = {
      endpoint: req.path,
      method: req.method,
      status_code: res.statusCode,
      response_time_ms: Date.now() - startTime,
      user_agent: req.get('user-agent'),
      called_at: new Date().toISOString()
    };

    try {
      observabilityRepo.logApiCall(data);
    } catch (e) {
      console.error('[Observability] Log failed:', e);
    }

    syncToVibeman(data);
  });

  next();
}

module.exports = { observabilityMiddleware };
\`\`\`

### 5. Create Stats Route
Create \`${projectPath}/src/routes/observability.js\`:

\`\`\`javascript
const express = require('express');
const { observabilityRepo } = require('../observability/repository');
const router = express.Router();

router.get('/stats', (req, res) => {
  const days = parseInt(req.query.days) || 7;
  res.json({
    success: true,
    stats: observabilityRepo.getDashboardStats(days),
    endpoints: observabilityRepo.getEndpointStats(days)
  });
});

module.exports = router;
\`\`\`

### 6. Register in App
\`\`\`javascript
const { observabilityMiddleware } = require('./observability/middleware');
const observabilityRouter = require('./routes/observability');

app.use(observabilityMiddleware);
app.use('/api/observability', observabilityRouter);
\`\`\`

### 7. Update .env.example and .gitignore
\`\`\`
# .env.example
OBSERVABILITY_ENABLED=true
VIBEMAN_URL=http://localhost:3000

# .gitignore
database/observability.db*
\`\`\`

## Success Criteria
- [ ] Dependencies installed
- [ ] Database, repository, middleware created
- [ ] Stats route created and registered
- [ ] Middleware registered
- [ ] Configuration files updated
- [ ] Test by checking /api/observability/stats
`;
  }

  // Unknown framework - provide generic guidance
  return commonHeader + `## Tasks for Generic Project

Since the framework could not be detected, here's a generic implementation guide.

### Core Components Needed

1. **SQLite Database** - Store metrics locally
2. **Repository** - Data access layer with these operations:
   - \`logApiCall(endpoint, method, status, responseTime, error)\`
   - \`getEndpointStats(days)\` - aggregated stats per endpoint
   - \`getDashboardStats(days)\` - overall metrics

3. **Middleware** - Intercept requests and log metrics
4. **Stats Endpoint** - API to retrieve metrics

### Database Schema

\`\`\`sql
CREATE TABLE obs_api_calls (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  user_agent TEXT,
  error_message TEXT,
  called_at TEXT NOT NULL
);
CREATE INDEX idx_obs_api_calls_endpoint ON obs_api_calls(endpoint);
CREATE INDEX idx_obs_api_calls_called_at ON obs_api_calls(called_at DESC);
\`\`\`

### Environment Variables
\`\`\`
OBSERVABILITY_ENABLED=true
VIBEMAN_URL=http://localhost:3000  # Optional
\`\`\`

### Optional: Sync to Vibeman
POST to \`${vibemanUrl}/api/observability/register\`:
\`\`\`json
{
  "project_id": "${projectId}",
  "endpoint": "/api/users",
  "method": "GET",
  "status_code": 200,
  "response_time_ms": 45,
  "called_at": "2024-01-15T10:30:00Z"
}
\`\`\`

## Success Criteria
- [ ] Local SQLite database created
- [ ] Middleware logging all API requests
- [ ] Stats endpoint returning metrics
- [ ] .gitignore updated to exclude database files
`;
}

/**
 * GET /api/observability/onboard
 * Check onboarding status for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const projectPath = searchParams.get('projectPath');

    if (!projectId || !projectPath) {
      return NextResponse.json(
        { error: 'projectId and projectPath are required' },
        { status: 400 }
      );
    }

    // Detect framework
    const framework = fs.existsSync(projectPath) ? detectFramework(projectPath) : null;

    // Check if requirement file exists
    const claudeDir = path.join(projectPath, '.claude', 'requirements');
    let requirementExists = false;
    let requirementPath: string | null = null;

    if (fs.existsSync(claudeDir)) {
      const files = fs.readdirSync(claudeDir);
      const obsFile = files.find(f => f.startsWith('obs_onboard_'));
      if (obsFile) {
        requirementExists = true;
        requirementPath = path.join(claudeDir, obsFile);
      }
    }

    // Check if config exists
    const config = observabilityDb.getConfig(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      framework,
      requirementExists,
      requirementPath,
      hasConfig: !!config,
      config
    });
  } catch (error) {
    logger.error('[API] Observability onboard GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { project_id, project_path, project_name } = body;

    if (!project_id || !project_path) {
      return NextResponse.json(
        { error: 'project_id and project_path are required' },
        { status: 400 }
      );
    }

    // Verify project path exists
    if (!fs.existsSync(project_path)) {
      return NextResponse.json(
        { error: `Project path does not exist: ${project_path}` },
        { status: 400 }
      );
    }

    // Detect framework
    const framework = detectFramework(project_path);

    // Get Vibeman URL from environment or use default
    const vibemanUrl = process.env.VIBEMAN_URL || 'http://localhost:3000';

    // Generate requirement content
    const content = generateOnboardingContent(
      project_id,
      project_path,
      project_name || path.basename(project_path),
      framework,
      vibemanUrl
    );

    // Create .claude/requirements directory if needed
    const claudeDir = path.join(project_path, '.claude', 'requirements');
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }

    // Write requirement file
    const requirementId = `obs_onboard_${uuidv4().slice(0, 8)}`;
    const requirementPath = path.join(claudeDir, `${requirementId}.md`);
    fs.writeFileSync(requirementPath, content, 'utf-8');

    // Create observability config if it doesn't exist
    let config = observabilityDb.getConfig(project_id);
    if (!config) {
      config = observabilityDb.createConfig({
        project_id,
        enabled: false, // Not enabled until onboarding complete
        provider: 'local'
      });
    }

    logger.info('[API] Generated observability onboarding requirement', {
      projectId: project_id,
      framework,
      requirementPath
    });

    return NextResponse.json({
      success: true,
      requirementId,
      requirementPath,
      framework,
      message: `Onboarding requirement created for ${framework} project. Execute it with Claude Code to set up observability.`
    }, { status: 201 });

  } catch (error) {
    logger.error('[API] Observability onboard POST error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
