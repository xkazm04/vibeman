# DAC Cloud — Implementation Plan

## Phased Roadmap for Cloud Persona Agent Deployment

**Companion to:** [DAC-CLOUD-SOLUTION-OVERVIEW.md](./DAC-CLOUD-SOLUTION-OVERVIEW.md)
**Date:** 2026-02-13
**Approach:** Incremental phases, each producing a working deliverable

---

## Phase Overview

```
Phase 1: Foundation          Phase 2: Vibeman Integration    Phase 3: Team & UX
(Orchestrator + Worker)      (Kafka + UI)                    (Credentials + Deploy)

┌──────────────────┐        ┌──────────────────┐            ┌──────────────────┐
│ Orchestrator     │        │ Kafka topics     │            │ Team credential  │
│ Worker binary    │        │ Execution engine │            │   contribution   │
│ WebSocket proto  │        │   cloud mode     │            │ One-click deploy │
│ Token manager    │        │ Event bus Kafka   │            │ Cloud status UI  │
│ Manual deploy    │        │   mode           │            │ Token lifecycle  │
│                  │        │ Output streaming │            │ Invite system    │
│ ✓ Proof of       │        │                  │            │                  │
│   concept        │        │ ✓ Local+Cloud    │            │ ✓ Team-ready     │
│                  │        │   seamless       │            │   product        │
└──────────────────┘        └──────────────────┘            └──────────────────┘

Phase 4: Scale & Harden     Phase 5: Commercial
(Multi-worker, monitoring)   (Multi-tenant, billing)

┌──────────────────┐        ┌──────────────────┐
│ Burst workers    │        │ Multi-tenancy    │
│ Auto-scaling     │        │ Stripe billing   │
│ Health checks    │        │ Usage dashboard  │
│ Retry/DLQ        │        │ SLA monitoring   │
│ Alerting         │        │ Onboarding flow  │
│                  │        │                  │
│ ✓ Production     │        │ ✓ Commercial     │
│   ready          │        │   platform       │
└──────────────────┘        └──────────────────┘
```

---

## Phase 1: Foundation (Orchestrator + Worker)

**Goal:** Prove that a cloud-hosted worker can execute a persona via Claude Code CLI using a user's subscription token, end-to-end.

**Deliverable:** Manual CLI-driven deployment. Orchestrator + 1 worker running on cloud. Execute a persona from local machine, see output streamed back.

### 1.1 Project Setup

**Task:** Initialize the `dac-cloud` monorepo

```
dac-cloud/
├── packages/
│   ├── orchestrator/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   ├── worker/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   └── shared/
│       ├── src/
│       │   ├── protocol.ts
│       │   ├── crypto.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json          # workspaces config
├── turbo.json            # build pipeline
└── tsconfig.base.json    # shared TS config
```

**Dependencies:**
- `ws` — WebSocket server (orchestrator) + client (worker)
- `kafkajs` — Kafka producer/consumer
- `dotenv` — Environment configuration
- `nanoid` — ID generation
- `pino` — Structured logging

**Location:** `C:\Users\kazim\dac\dac-cloud\` (sibling to vibeman)

**Steps:**
1. Create monorepo with npm workspaces or turborepo
2. Configure shared TypeScript config
3. Add build scripts for each package
4. Add Docker build scripts

### 1.2 Shared Protocol Types

**File:** `packages/shared/src/protocol.ts`

Define all WebSocket message types:

```typescript
// Worker → Orchestrator
interface WorkerHello {
  type: 'hello';
  workerId: string;
  version: string;
  capabilities: string[];  // e.g., ['claude-cli', 'node', 'git']
}

interface WorkerReady {
  type: 'ready';
}

interface ExecStdout {
  type: 'stdout';
  executionId: string;
  chunk: string;
  timestamp: number;
}

interface ExecStderr {
  type: 'stderr';
  executionId: string;
  chunk: string;
  timestamp: number;
}

interface ExecComplete {
  type: 'complete';
  executionId: string;
  status: 'completed' | 'failed' | 'cancelled';
  exitCode: number;
  durationMs: number;
}

interface WorkerEvent {
  type: 'event';
  executionId: string;
  eventType: 'manual_review' | 'user_message' | 'persona_action' | 'emit_event';
  payload: unknown;
}

interface Heartbeat {
  type: 'heartbeat';
  timestamp: number;
}

// Orchestrator → Worker
interface OrchestratorAck {
  type: 'ack';
  workerId: string;
  sessionToken: string;
}

interface ExecAssign {
  type: 'assign';
  executionId: string;
  personaId: string;
  prompt: string;
  env: Record<string, string>;   // CLAUDE_CODE_OAUTH_TOKEN + credentials
  config: {
    timeoutMs: number;
    maxOutputBytes: number;
  };
}

interface ExecCancel {
  type: 'cancel';
  executionId: string;
}

interface WorkerShutdown {
  type: 'shutdown';
  reason: string;
  gracePeriodMs: number;
}
```

**File:** `packages/shared/src/crypto.ts`

Encryption utilities:

```typescript
// AES-256-GCM encryption/decryption for credentials
function encrypt(plaintext: string, masterKey: Buffer): EncryptedPayload;
function decrypt(payload: EncryptedPayload, masterKey: Buffer): string;

// Master key derivation from deployment secret
function deriveMasterKey(deploymentSecret: string): Buffer;
```

### 1.3 Orchestrator Core

**File:** `packages/orchestrator/src/index.ts`

Entry point, composes all modules:

```typescript
async function main() {
  const config = loadConfig();       // from env vars
  const auth = createAuth(config);   // API key validation
  const vault = createVault(config); // credential storage
  const pool = createWorkerPool();   // WebSocket server
  const kafka = createKafka(config); // Kafka connection

  // Start WebSocket server for workers
  pool.listen(config.wsPort, auth);

  // Start Kafka consumer for execution requests
  kafka.consume('persona.exec.v1', async (message) => {
    const worker = pool.getIdleWorker();
    if (!worker) {
      // No idle worker — requeue with delay
      kafka.produce('persona.exec.v1', message, { delay: 5000 });
      return;
    }

    const exec = JSON.parse(message.value);
    const env = buildEnv(vault, exec.credentialIds, config.claudeToken);
    pool.assign(worker, { ...exec, env });
  });

  // Relay worker output to Kafka
  pool.on('stdout', (workerId, data) => {
    kafka.produce('persona.output.v1', data);
  });

  pool.on('complete', (workerId, data) => {
    kafka.produce('persona.lifecycle.v1', data);
  });

  pool.on('event', (workerId, data) => {
    kafka.produce('persona.events.v1', data);
  });
}
```

**Submodules:**

| File | Purpose | ~Lines |
|---|---|---|
| `workerPool.ts` | WebSocket server, worker registration, dispatch | ~200 |
| `kafka.ts` | KafkaJS producer/consumer setup | ~100 |
| `tokenManager.ts` | Store/retrieve encrypted Claude token | ~80 |
| `credentialVault.ts` | Store/retrieve encrypted 3rd-party credentials | ~120 |
| `dispatcher.ts` | Match execution to idle worker, inject env | ~100 |
| `auth.ts` | API key validation middleware | ~50 |
| `metrics.ts` | Execution count, duration, token usage recording | ~80 |
| `config.ts` | Environment variable loading + validation | ~40 |

### 1.4 Worker Core

**File:** `packages/worker/src/index.ts`

Entry point:

```typescript
async function main() {
  const config = loadConfig();
  const ws = connectToOrchestrator(config.orchestratorUrl, config.workerToken);

  ws.on('assign', async (assignment: ExecAssign) => {
    const executor = new ClaudeExecutor(assignment, ws);
    await executor.run();
  });

  ws.on('cancel', (msg: ExecCancel) => {
    executor.kill(msg.executionId);
  });

  ws.on('shutdown', (msg: WorkerShutdown) => {
    gracefulShutdown(msg.gracePeriodMs);
  });
}
```

**Submodules:**

| File | Purpose | ~Lines |
|---|---|---|
| `connection.ts` | WebSocket client, reconnection, heartbeat | ~100 |
| `executor.ts` | Claude CLI spawning, env setup, cleanup | ~150 |
| `parser.ts` | Parse stdout for persona protocols (review, action, etc.) | ~80 |
| `cleanup.ts` | Wipe env vars, temp dirs after execution | ~40 |

### 1.5 Dockerfiles

**Orchestrator Dockerfile:**

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY packages/shared ./packages/shared
COPY packages/orchestrator ./packages/orchestrator
RUN cd packages/shared && npm ci && npm run build
RUN cd packages/orchestrator && npm ci && npm run build
EXPOSE 8443
CMD ["node", "packages/orchestrator/dist/index.js"]
```

**Worker Dockerfile:**

```dockerfile
FROM node:20-slim

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install common tools agents might need
RUN apt-get update && apt-get install -y git curl jq && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY packages/shared ./packages/shared
COPY packages/worker ./packages/worker
RUN cd packages/shared && npm ci && npm run build
RUN cd packages/worker && npm ci && npm run build

# No EXPOSE — outbound-only connections
CMD ["node", "packages/worker/dist/index.js"]
```

### 1.6 Manual Deployment & Testing

**Steps to validate Phase 1:**

1. **Set up Kafka:**
   ```bash
   # Create Upstash Kafka cluster (free tier)
   # Note down: KAFKA_BROKERS, KAFKA_USERNAME, KAFKA_PASSWORD
   ```

2. **Deploy orchestrator to Fly.io:**
   ```bash
   cd packages/orchestrator
   fly launch --name dac-orchestrator
   fly secrets set KAFKA_BROKERS=... KAFKA_USERNAME=... KAFKA_PASSWORD=...
   fly secrets set MASTER_KEY=$(openssl rand -hex 32)
   # CLAUDE_TOKEN is optional — use OAuth flow after deploy instead:
   #   POST /api/oauth/authorize → open authUrl in browser → POST /api/oauth/callback
   # Or set directly: fly secrets set CLAUDE_TOKEN=sk-ant-oat01-...
   fly deploy
   ```

3. **Deploy worker to DigitalOcean:**
   ```bash
   # Create droplet via doctl or console
   doctl compute droplet create dac-worker-1 \
     --image docker-20-04 --size s-1vcpu-1gb --region nyc1

   # SSH in, pull and run worker container
   docker run -d \
     -e ORCHESTRATOR_URL=wss://dac-orchestrator.fly.dev \
     -e WORKER_TOKEN=... \
     dac-cloud-worker:latest
   ```

4. **Test execution:**
   ```bash
   # Produce a test execution message to Kafka
   # (or use a simple HTTP endpoint on orchestrator)
   curl -X POST https://dac-orchestrator.fly.dev/api/execute \
     -H "Authorization: Bearer <team-api-key>" \
     -H "Content-Type: application/json" \
     -d '{
       "personaId": "test",
       "prompt": "What is 2+2? Reply with just the number.",
       "config": { "timeoutMs": 30000 }
     }'
   ```

5. **Verify output streams back through Kafka**

### Phase 1 Success Criteria

- [ ] Orchestrator running on Fly.io, consuming from Kafka
- [ ] Worker running on DigitalOcean, connected to orchestrator via WebSocket
- [ ] Claude Code CLI executes with user's subscription token on worker
- [ ] Stdout streams back: Worker → Orchestrator → Kafka
- [ ] Credentials are in-memory only, cleaned after execution
- [ ] Basic error handling (timeout, CLI crash, connection loss)

---

## Phase 2: Vibeman Integration

**Goal:** Vibeman Personas can execute in cloud mode seamlessly. User toggles between local and cloud execution. Event bus works over Kafka.

**Deliverable:** Persona configured in Vibeman UI executes on cloud worker. Events flow through Kafka. Output streams to browser via SSE.

### 2.1 Kafka Producer in Vibeman

**New file:** `src/lib/personas/kafkaProducer.ts`

Singleton KafkaJS producer for Vibeman. Publishes to:
- `persona.exec.v1` — execution requests
- `persona.events.v1` — locally-generated events (webhooks, triggers)

**Configuration:**
```env
KAFKA_BROKERS=...
KAFKA_USERNAME=...
KAFKA_PASSWORD=...
KAFKA_SASL_MECHANISM=scram-sha-256
EXECUTION_MODE=local|cloud|hybrid
```

**Integration point:** Called by `executionEngine.ts` when `EXECUTION_MODE=cloud`.

### 2.2 Kafka Consumer in Vibeman

**New file:** `src/lib/personas/kafkaConsumer.ts`

Singleton KafkaJS consumer for Vibeman. Subscribes to:
- `persona.output.v1` — execution stdout from cloud workers
- `persona.lifecycle.v1` — execution status changes
- `persona.events.v1` — events generated by cloud agents

**Integration points:**
- Feeds into existing `executionBuffers` (globalThis) for SSE streaming
- Updates `persona_executions` table with status/output
- Feeds into `eventBus` handlers for persona event processing

### 2.3 Execution Engine Cloud Mode

**Modified file:** `src/lib/personas/executionEngine.ts`

Add a `CloudExecutionEngine` class alongside the existing local engine:

```typescript
// Existing (unchanged)
class LocalExecutionEngine {
  async execute(persona, input, execution) {
    // spawn('claude', ...) locally
  }
}

// New
class CloudExecutionEngine {
  async execute(persona, input, execution) {
    const prompt = assemblePrompt(persona, input);
    const credentialIds = getAssignedCredentials(persona.id);

    await kafkaProducer.send({
      topic: 'persona.exec.v1',
      messages: [{
        key: persona.id,
        value: JSON.stringify({
          executionId: execution.id,
          personaId: persona.id,
          prompt,
          credentialIds,
          inputData: input,
          config: {
            timeoutMs: persona.timeout_ms,
            maxConcurrent: persona.max_concurrent
          }
        })
      }]
    });

    // Execution is now async — output will arrive via Kafka consumer
    // Update status to 'queued_cloud'
    personaDb.executions.update(execution.id, { status: 'queued' });
  }
}

// Factory
function getExecutionEngine(): ExecutionEngine {
  if (process.env.EXECUTION_MODE === 'cloud') return new CloudExecutionEngine();
  return new LocalExecutionEngine();
}
```

### 2.4 Event Bus Kafka Mode

**Modified file:** `src/lib/personas/eventBus.ts`

Add Kafka-backed event publishing and consumption:

```typescript
// Existing SQLite mode (unchanged for local use)
class SqliteEventBus { ... }

// New Kafka mode
class KafkaEventBus {
  async publish(event: PersonaEvent) {
    await kafkaProducer.send({
      topic: 'persona.events.v1',
      messages: [{
        key: event.project_id,
        value: JSON.stringify(event)
      }]
    });
  }

  async startConsuming() {
    kafkaConsumer.subscribe('persona.events.v1');
    kafkaConsumer.run(async (message) => {
      const event = JSON.parse(message.value);
      await this.dispatch(event);  // same handler logic as SQLite mode
    });
  }
}
```

### 2.5 Output Streaming via Kafka

**Modified file:** `src/app/api/personas/executions/[id]/stream/route.ts`

Current: Reads from in-memory `executionBuffers`.
New: Also reads from Kafka `persona.output.v1` topic when in cloud mode.

```typescript
// The Kafka consumer writes to the same executionBuffers
// so the existing SSE endpoint works unchanged.
// We just need to start the consumer on app boot.
```

**Modified file:** `src/lib/personas/kafkaConsumer.ts`

```typescript
// On receiving output messages, write to the same in-memory buffer
consumer.run(async ({ topic, message }) => {
  if (topic === 'persona.output.v1') {
    const { executionId, chunk } = JSON.parse(message.value);
    appendToExecutionBuffer(executionId, chunk);
  }
});
```

### 2.6 Execution Mode Toggle

**Modified file:** `src/stores/personaStore.ts`

Add cloud execution state:

```typescript
interface PersonaState {
  // ... existing fields ...

  // Cloud deployment
  cloudDeploymentId: string | null;
  cloudStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  cloudWorkers: CloudWorkerInfo[];
  executionMode: 'local' | 'cloud';
}
```

### Phase 2 Success Criteria

- [ ] Persona execution in Vibeman produces to Kafka when `EXECUTION_MODE=cloud`
- [ ] Cloud worker receives execution, runs Claude CLI, streams output
- [ ] Output appears in Vibeman UI identically to local execution
- [ ] Events from cloud executions trigger local event bus handlers
- [ ] Persona actions (agent→agent) work across cloud workers via Kafka
- [ ] Manual review / user message protocols work from cloud
- [ ] Toggle between local and cloud execution per persona or globally

---

## Phase 3: Team & UX

**Goal:** Non-technical users can deploy cloud agents with one click. Team members can contribute credentials and trigger agents.

**Deliverable:** Cloud Deploy Panel in Vibeman UI. Team invitation system. Credential contribution flow.

### 3.1 Cloud Deploy Panel UI

**New file:** `src/app/features/Personas/components/CloudDeployPanel.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Cloud Deployment                                [Settings] │
│                                                             │
│  ┌─ Status ───────────────────────────────────────────────┐ │
│  │  ● Connected    2 workers online    Uptime: 3d 14h     │ │
│  │  Last execution: 4 minutes ago                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Subscription ─────────────────────────────────────────┐ │
│  │  Claude Pro (michal.kazdan@nuda.dev)                    │ │
│  │  Token valid until: 2027-02-13                         │ │
│  │  [Refresh Token]  [Disconnect]                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Workers ──────────────────────────────────────────────┐ │
│  │  worker-1  ● idle      DO nyc1   1 vCPU / 1GB         │ │
│  │  worker-2  ● executing DO nyc1   1 vCPU / 1GB         │ │
│  │            └─ Running: "Email Triage Agent" (2m 14s)   │ │
│  │                                                        │ │
│  │  [Add Worker]  [Remove Worker]                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Team ─────────────────────────────────────────────────┐ │
│  │  3 members    12 shared credentials                    │ │
│  │  [Manage Team]  [Manage Credentials]                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [Destroy Deployment]                                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 One-Click Deploy Flow

**New file:** `src/lib/personas/cloudDeployment.ts`

Orchestrates the full deployment:

```typescript
async function deployCloud(options: DeployOptions): Promise<Deployment> {
  // Step 1: Create Kafka topics (Upstash REST API)
  const kafka = await provisionKafka(options.deploymentId);

  // Step 2: Deploy orchestrator (Fly.io Machines API)
  const orchestrator = await deployOrchestrator({
    kafkaConfig: kafka,
    claudeToken: options.claudeToken,
    masterKey: generateMasterKey(),
  });

  // Step 3: Deploy worker(s) (DigitalOcean API)
  const workers = await deployWorkers({
    count: options.workerCount || 1,
    orchestratorUrl: orchestrator.url,
    region: options.region || 'nyc1',
  });

  // Step 4: Wait for health checks
  await waitForHealthy(orchestrator, workers);

  // Step 5: Return deployment info
  return {
    id: options.deploymentId,
    orchestratorUrl: orchestrator.url,
    workerCount: workers.length,
    apiKey: orchestrator.apiKey,
    status: 'running',
  };
}

async function destroyCloud(deploymentId: string): Promise<void> {
  // Reverse order: workers → orchestrator → kafka topics
  await destroyWorkers(deploymentId);
  await destroyOrchestrator(deploymentId);
  await destroyKafkaTopics(deploymentId);
}
```

### 3.3 Deployment API Routes

**New files:**

| Route | Method | Purpose |
|---|---|---|
| `/api/personas/cloud` | GET | Get deployment status |
| `/api/personas/cloud` | POST | Create deployment (one-click deploy) |
| `/api/personas/cloud` | DELETE | Destroy deployment |
| `/api/personas/cloud/token` | POST | Store Claude subscription token |
| `/api/personas/cloud/token` | DELETE | Revoke token |
| `/api/personas/cloud/workers` | GET | List workers + status |
| `/api/personas/cloud/workers` | POST | Add worker |
| `/api/personas/cloud/workers/[id]` | DELETE | Remove worker |
| `/api/personas/cloud/team` | GET | List team members |
| `/api/personas/cloud/team` | POST | Invite member |
| `/api/personas/cloud/team/[id]` | DELETE | Remove member |
| `/api/personas/cloud/credentials` | GET | List team credentials |
| `/api/personas/cloud/credentials` | POST | Contribute credential |
| `/api/personas/cloud/credentials/[id]` | DELETE | Revoke credential |

### 3.4 Team Invitation System

**Flow:**

```
Deployer clicks "Invite"
    │
    ▼
Generates: { apiKey: "dac_xxxx", role: "contributor" }
    │
    ▼
Shows invite link/key to deployer
    │
    ▼
Deployer shares with team member (email, Slack, etc.)
    │
    ▼
Team member enters API key in their Vibeman instance
    │
    ▼
Their Vibeman connects to the same orchestrator
    │
    ▼
They can:
  ├── Trigger persona executions
  ├── View execution output
  ├── Contribute their own 3rd-party credentials
  └── View shared dashboard
```

### 3.5 Credential Contribution UI

**New file:** `src/app/features/Personas/components/CloudCredentialManager.tsx`

Extends the existing `CredentialManager.tsx` with cloud-aware features:

```
┌─────────────────────────────────────────────────────────────┐
│  Team Credentials                             [+ Add Mine]  │
│                                                             │
│  Mine:                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Gmail (OAuth)          Added: 2026-02-13               ││
│  │  Status: ✓ Healthy      Used by: 2 agents              ││
│  │  [Edit] [Revoke]                                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Team:                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Sarah's GitHub (PAT)   Added: 2026-02-12              ││
│  │  Status: ✓ Healthy      Used by: 1 agent               ││
│  │  [Assigned to: PR Review Agent]                         ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Team Slack (Bot Token)  Added: 2026-02-10             ││
│  │  Status: ✓ Healthy       Used by: 4 agents             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 3.6 Database Additions

**New migration:** `src/app/db/migrations/XXX_cloud_deployment.ts`

```sql
CREATE TABLE IF NOT EXISTS cloud_deployments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning',
    -- provisioning | running | stopped | error | destroyed
  orchestrator_url TEXT,
  orchestrator_provider TEXT,  -- fly, digitalocean, etc.
  orchestrator_resource_id TEXT,
  kafka_brokers TEXT,
  api_key_hash TEXT NOT NULL,
  master_key_encrypted TEXT NOT NULL,
  claude_token_encrypted TEXT,
  claude_token_expires_at INTEGER,
  claude_subscription_type TEXT,
  worker_count INTEGER DEFAULT 0,
  region TEXT DEFAULT 'nyc1',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cloud_workers (
  id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL REFERENCES cloud_deployments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- digitalocean, fly, etc.
  resource_id TEXT,        -- provider's instance ID
  status TEXT NOT NULL DEFAULT 'provisioning',
    -- provisioning | connecting | idle | executing | error | destroyed
  region TEXT,
  spec TEXT,               -- e.g., "s-1vcpu-1gb"
  ip_address TEXT,
  current_execution_id TEXT,
  last_heartbeat_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cloud_team_members (
  id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL REFERENCES cloud_deployments(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'contributor',  -- owner | contributor
  api_key_hash TEXT NOT NULL,
  last_active_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cloud_credentials (
  id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL REFERENCES cloud_deployments(id) ON DELETE CASCADE,
  contributor_id TEXT NOT NULL REFERENCES cloud_team_members(id),
  name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  metadata TEXT,  -- JSON: { fields visible to others }
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cloud_execution_metrics (
  id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  worker_id TEXT,
  contributor_id TEXT,  -- who triggered it
  status TEXT NOT NULL,
  duration_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  credentials_used TEXT,  -- JSON array of credential IDs
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_cloud_workers_deployment ON cloud_workers(deployment_id);
CREATE INDEX idx_cloud_team_deployment ON cloud_team_members(deployment_id);
CREATE INDEX idx_cloud_creds_deployment ON cloud_credentials(deployment_id);
CREATE INDEX idx_cloud_metrics_deployment ON cloud_execution_metrics(deployment_id);
CREATE INDEX idx_cloud_metrics_created ON cloud_execution_metrics(created_at DESC);
```

### Phase 3 Success Criteria

- [ ] Non-technical user can click "Deploy" and get running cloud agents
- [ ] Team members can be invited via API key
- [ ] Team members can contribute 3rd-party credentials
- [ ] Credentials from any contributor can be assigned to any persona
- [ ] Deployment can be destroyed with one click
- [ ] Claude subscription token can be connected/refreshed/disconnected via UI
- [ ] Worker count can be adjusted from UI

---

## Phase 4: Scale & Harden

**Goal:** Production-grade reliability. Multi-worker auto-scaling. Monitoring and alerting.

### 4.1 Burst Workers (Fly.io Machines)

Add on-demand worker provisioning when all workers are busy:

```typescript
// In orchestrator dispatcher
async function dispatch(execution: ExecRequest) {
  const worker = pool.getIdleWorker();

  if (worker) {
    pool.assign(worker, execution);
    return;
  }

  // All workers busy — check burst policy
  if (pool.burstEnabled && pool.burstCount < pool.maxBurst) {
    const burstWorker = await flyMachines.create({
      image: 'dac-cloud-worker:latest',
      env: { ORCHESTRATOR_URL: config.wsUrl, WORKER_TOKEN: config.workerToken },
      autoDestroy: true,  // destroy after idle timeout
    });
    pool.awaitConnection(burstWorker.id, execution);
    return;
  }

  // At capacity — requeue
  kafka.produce('persona.exec.v1', execution, { delay: 10000 });
}
```

### 4.2 Health Checks & Reconnection

```typescript
// Worker heartbeat: every 30 seconds
// Orchestrator timeout: 90 seconds without heartbeat → mark worker offline

// Worker reconnection: exponential backoff
// 1s → 2s → 4s → 8s → 16s → 30s (max)

// Execution recovery:
// If worker disconnects during execution → mark execution 'failed'
// If orchestrator restarts → workers reconnect, re-register
// If Kafka unavailable → local queue with retry
```

### 4.3 Dead Letter Queue

```typescript
// Messages that fail processing 3 times → DLQ
// DLQ consumer: log, alert, allow manual retry
// Retention: 7 days
```

### 4.4 Monitoring Dashboard

**New UI component:** Execution metrics, worker utilization, error rates, Kafka lag.

### 4.5 Alerting

- Worker offline → notification
- Execution failure rate > 10% → alert
- Kafka consumer lag > 100 → alert
- Claude token expiring in < 30 days → warning
- All workers busy for > 5 minutes → alert

### Phase 4 Success Criteria

- [ ] Burst workers auto-provisioned and destroyed
- [ ] Workers reconnect automatically after network issues
- [ ] Failed executions retried with exponential backoff
- [ ] DLQ captures permanently failed messages
- [ ] Monitoring dashboard shows real-time metrics
- [ ] Alerting configured for critical conditions

---

## Phase 5: Commercial Platform

**Goal:** Multi-tenant managed platform. Users sign up, deploy, pay.

### 5.1 Multi-Tenancy

```
Shared orchestrator with namespace isolation:
- Each tenant gets unique deployment ID
- Kafka topics prefixed: tenant_{id}.persona.exec.v1
- Worker pools isolated per tenant
- Credential vaults isolated per tenant
- API keys scoped to tenant
```

### 5.2 Billing (Stripe)

```
Pricing model:
- Base fee: $X/mo for orchestrator + 1 worker
- Additional workers: $Y/mo each
- Burst executions: $Z per execution

Metering:
- cloud_execution_metrics table feeds Stripe usage records
- Monthly invoice based on actual usage
```

### 5.3 Onboarding Flow

```
1. User signs up on marketing site
2. Connects Claude subscription via OAuth (browser-based authorization)
3. One-click deploy provisions their isolated environment
4. Guided tour: create first persona, add credential, test execution
5. Invite team members
```

### Phase 5 Success Criteria

- [ ] Multiple tenants on shared infrastructure
- [ ] Stripe billing integration
- [ ] Self-service signup and deployment
- [ ] Tenant isolation verified (security audit)
- [ ] SLA monitoring and reporting

---

## Cross-Session Continuity

### How to Resume Work Between Sessions

Each phase is designed to be implementable independently. When starting a new Claude Code session:

1. **Read this document** to understand the current phase
2. **Check the codebase** for what's been implemented:
   ```
   # Check if dac-cloud monorepo exists
   ls C:\Users\kazim\dac\dac-cloud\

   # Check Vibeman cloud integration
   grep -r "EXECUTION_MODE" C:\Users\kazim\dac\vibeman\src\
   grep -r "CloudDeploy" C:\Users\kazim\dac\vibeman\src\
   ```
3. **Check git log** for recent cloud-related commits
4. **Run the success criteria checklist** for the current phase

### File Index for Quick Orientation

**New repo (Phase 1+):**
```
C:\Users\kazim\dac\dac-cloud\
├── packages/orchestrator/src/   # Orchestrator service
├── packages/worker/src/         # Worker service
└── packages/shared/src/         # Shared types + crypto
```

**Vibeman modifications (Phase 2+):**
```
src/lib/personas/kafkaProducer.ts      # Kafka producer
src/lib/personas/kafkaConsumer.ts      # Kafka consumer
src/lib/personas/executionEngine.ts    # Modified: cloud mode
src/lib/personas/eventBus.ts           # Modified: Kafka mode
src/lib/personas/cloudDeployment.ts    # Deployment provisioning
src/stores/personaStore.ts             # Modified: cloud state
```

**Vibeman new UI (Phase 3+):**
```
src/app/features/Personas/components/CloudDeployPanel.tsx
src/app/features/Personas/components/CloudCredentialManager.tsx
src/app/features/Personas/components/CloudStatusMonitor.tsx
src/app/api/personas/cloud/route.ts
src/app/api/personas/cloud/token/route.ts
src/app/api/personas/cloud/workers/route.ts
src/app/api/personas/cloud/team/route.ts
src/app/api/personas/cloud/credentials/route.ts
```

**Database (Phase 3+):**
```
src/app/db/migrations/XXX_cloud_deployment.ts
```

### Environment Variables Reference

```env
# Vibeman (existing + new)
EXECUTION_MODE=local|cloud          # Toggle execution mode
KAFKA_BROKERS=                      # Upstash Kafka brokers
KAFKA_USERNAME=                     # SASL username
KAFKA_PASSWORD=                     # SASL password
CLOUD_DEPLOYMENT_ID=                # Current deployment ID
CLOUD_ORCHESTRATOR_URL=             # Orchestrator WebSocket URL
CLOUD_API_KEY=                      # Team API key

# Orchestrator
MASTER_KEY=                         # AES-256 master key (hex)
CLAUDE_TOKEN=                       # Optional: Claude OAuth token (use OAuth flow if not set)
KAFKA_BROKERS=                      # Same Kafka cluster
WS_PORT=8443                        # WebSocket server port
FLY_API_TOKEN=                      # For burst worker provisioning
DO_API_TOKEN=                       # For worker management

# Worker
ORCHESTRATOR_URL=                   # wss://orchestrator:8443
WORKER_TOKEN=                       # Auth token for orchestrator
WORKER_ID=                          # Unique worker identifier
```

---

## Decision Log

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Auth mechanism | OAuth PKCE flow (browser-based) | `setup-token` (requires TTY), credential file sync | No interactive terminal needed; user authorizes via browser; auto-refresh with rotation; uses same Anthropic OAuth endpoints as Claude Code CLI |
| Orchestrator language | TypeScript | Go, Rust | Team consistency, shared types with Vibeman, adequate performance |
| Worker protocol | JSON over WebSocket | Custom binary (MessagePack), gRPC, HTTP/2 | Simplicity, debuggability, adequate for <50 connections |
| Event bus | Kafka (Upstash) | Redis Streams, NATS, RabbitMQ | Already planned in kafka-migration.md, proven, free tier |
| Worker compute | DigitalOcean Droplets | Fly Machines, Oracle Free, Hetzner | Simple, reliable, reasonable cost, good API |
| Monorepo tool | npm workspaces / turbo | pnpm, yarn, nx | Already familiar, lightweight |
| Credential storage | AES-256-GCM in SQLite | HashiCorp Vault, AWS KMS | No external dependency, sufficient for experiment |
| Multi-tenancy (future) | Namespace isolation | Separate infra per tenant | Cost-efficient, simpler ops |
