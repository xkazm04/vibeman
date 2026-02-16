# DAC Cloud — Solution Overview

## Intelligent Cloud Agents Powered by Claude Code CLI

**Version:** 0.1 (Experiment)
**Date:** 2026-02-13
**Status:** Design Complete, Implementation Pending

---

## 1. Executive Summary

DAC Cloud extends Vibeman's Persona Agent System from a localhost-only tool into a cloud-deployed, always-on platform where intelligent agents operate 24/7. Users build personas locally in Vibeman for free, then deploy them to cloud infrastructure with one click — using their existing Claude Pro/Max subscription.

Unlike traditional workflow engines (n8n, Power Automate) that execute deterministic A→B→C pipelines, DAC Cloud agents **reason** about tasks, adapt to unexpected situations, and collaborate through an event-driven architecture. This positions DAC Cloud not as a replacement for workflow tools, but as the **intelligence layer above them**.

### Core Value Proposition

```
"Build agents in natural language that can use any API,
 make decisions, and work 24/7 — without maintaining
 workflow diagrams."
```

### Key Differentiators

| Traditional Workflows | DAC Cloud Agents |
|---|---|
| Visual diagram required | Natural language instructions |
| Breaks on unexpected input | Adapts and reasons about edge cases |
| Pre-built connectors only (400+) | Can use any API (50,000+) via Claude CLI |
| Deterministic paths | Judgment-based decisions |
| Branch explosion for complex logic | Single agent handles nuance |
| Fast (ms), cheap, reliable | Slower (s-min), costlier, but intelligent |

### Target Use Cases

1. **Complex workflows requiring reasoning** — contract review, PR triage, support ticket analysis
2. **Long-tail integrations** — APIs without pre-built connectors
3. **Adaptive multi-step processes** — where next step depends on understanding previous results
4. **Self-healing automations** — agents that recover from API errors by reading docs
5. **Cross-service orchestration with judgment** — "check X, decide Y, act on Z"

---

## 2. Architecture

### 2.1 High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                  VIBEMAN APP (User's Local Machine)           │
│                                                              │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │ Personas UI  │  │ Cloud Panel │  │ Deployment Manager │  │
│  │ (existing)   │  │ (new)       │  │ (new)              │  │
│  └──────┬───────┘  └──────┬──────┘  └─────────┬──────────┘  │
│         │                 │                    │              │
│         ▼                 ▼                    ▼              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │          Execution Engine (local OR cloud mode)       │    │
│  │  EXECUTION_MODE=local → spawn('claude') locally       │    │
│  │  EXECUTION_MODE=cloud → produce to Kafka              │    │
│  └──────────────────────┬───────────────────────────────┘    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Kafka (Upstash)     │
              │                       │
              │ persona.exec.v1       │ ← execution requests
              │ persona.events.v1     │ ← event bus
              │ persona.output.v1     │ ← streaming results
              │ persona.dlq.v1        │ ← dead letter queue
              └───────────┬───────────┘
                          │
              ┌───────────┼──────────────────────────────────┐
              │           ▼                                  │
              │  ORCHESTRATOR (TypeScript, cloud-hosted)      │
              │                                              │
              │  ┌──────────┐ ┌────────────┐ ┌───────────┐  │
              │  │ Kafka    │ │ Worker     │ │ Credential│  │
              │  │ Consumer │ │ Registry   │ │ Vault     │  │
              │  └──────────┘ └─────┬──────┘ └───────────┘  │
              │  ┌──────────┐       │        ┌───────────┐  │
              │  │ Token    │       │        │ Metrics   │  │
              │  │ Manager  │       │        │ Collector │  │
              │  └──────────┘       │        └───────────┘  │
              │  ┌──────────┐       │        ┌───────────┐  │
              │  │ Deploy   │       │        │ Team Auth │  │
              │  │ Manager  │       │        │           │  │
              │  └──────────┘       │        └───────────┘  │
              └─────────────────────┼────────────────────────┘
                                    │ WebSocket (JSON, TLS)
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
              ┌───────────┐ ┌───────────┐  ┌───────────┐
              │  Worker 1 │ │  Worker 2 │  │  Worker N │
              │           │ │           │  │  (burst)  │
              │ Claude CLI│ │ Claude CLI│  │           │
              │ + tools   │ │ + tools   │  │           │
              └───────────┘ └───────────┘  └───────────┘
              DigitalOcean   DigitalOcean    Fly Machine
              Droplet        Droplet         (on-demand)
```

### 2.2 Component Responsibilities

#### Vibeman App (Existing + Extensions)

| Component | Status | Purpose |
|---|---|---|
| Personas UI | Existing | Build, configure, test agents locally |
| Cloud Deploy Panel | **New** | One-click deploy/destroy, status monitoring |
| Deployment Manager | **New** | Provisions infrastructure via APIs |
| Execution Engine | **Modified** | Dual-mode: local spawn OR Kafka produce |
| Event Bus | **Modified** | Dual-mode: SQLite polling OR Kafka consume |

#### Orchestrator (New, Cloud-Hosted)

The orchestrator is a TypeScript/Node.js service (~1000-1500 lines) that:

- **Consumes** execution requests from Kafka
- **Manages** a pool of connected workers via WebSocket
- **Dispatches** one execution at a time per worker
- **Holds** the deployer's Claude subscription token (encrypted)
- **Holds** team-contributed 3rd-party credentials (encrypted)
- **Injects** tokens and credentials into workers per-execution
- **Relays** streaming output back to Kafka for Vibeman consumption
- **Meters** usage for billing/analytics
- **Provisions/destroys** workers via cloud provider APIs

#### Worker (New, Cloud-Hosted)

Each worker is a lightweight TypeScript process (~200-300 lines) that:

- **Connects outbound** to orchestrator via WebSocket (no public IP needed)
- **Receives** execution assignments (prompt, env vars, config)
- **Spawns** Claude Code CLI with the injected auth token
- **Streams** stdout back to orchestrator in real-time
- **Handles** one execution at a time (matches subscription fair-use)
- **Cleans up** credentials from memory after each execution

---

## 3. Authentication & Subscription Model

### 3.1 Claude Subscription Authentication

DAC Cloud uses the **official `setup-token` mechanism** provided by Anthropic for headless/remote Claude Code CLI usage. This is the same approach used by [Depot.dev](https://depot.dev/docs/agents/claude-code/quickstart) and [GitHub Actions claude-code-action](https://github.com/marketplace/actions/claude-code-action-with-oauth).

**Why this is ToS-compliant:** We run the actual Claude Code CLI binary on workers. No harness spoofing, no token format conversion. Anthropic explicitly supports this for remote/CI/CD use.

#### Authentication Flow

```
USER                          VIBEMAN UI                    ORCHESTRATOR
 │                                │                              │
 │  1. Click "Connect             │                              │
 │     Subscription"              │                              │
 │──────────────────────────────▶│                              │
 │                                │                              │
 │  2. Vibeman runs               │                              │
 │     'claude setup-token'       │                              │
 │     locally                    │                              │
 │◀──────────────────────────────│                              │
 │                                │                              │
 │  3. Browser opens              │                              │
 │     claude.ai/oauth/authorize  │                              │
 │     User approves              │                              │
 │                                │                              │
 │  4. Token returned:            │                              │
 │     sk-ant-oat01-...           │                              │
 │───(user pastes or auto)──────▶│                              │
 │                                │                              │
 │                                │  5. Token sent to            │
 │                                │     orchestrator (encrypted  │
 │                                │     in transit, TLS)         │
 │                                │────────────────────────────▶│
 │                                │                              │
 │                                │                   6. Token stored
 │                                │                      AES-256-GCM
 │                                │                      at rest
 │                                │                              │
 │                                │  7. Confirmation             │
 │                                │◀────────────────────────────│
 │                                │                              │
 │  8. "Connected: Pro plan"      │                              │
 │◀──────────────────────────────│                              │
```

#### Token Characteristics

| Property | Value |
|---|---|
| Format | `sk-ant-oat01-...` (Anthropic OAuth Token v01) |
| Lifetime | ~1 year |
| Scopes | `user:inference`, `user:sessions:claude_code`, `user:profile`, `user:mcp_servers` |
| Subscription tie | Uses deployer's Pro/Max monthly quota |
| Local CLI impact | None — `setup-token` creates a separate session |
| Revocation | User can revoke at `claude.ai/settings/account` |

#### Per-Execution Token Injection

```
Orchestrator                                Worker
     │                                         │
     │  EXEC_ASSIGN {                          │
     │    env: {                               │
     │      CLAUDE_CODE_OAUTH_TOKEN: "sk-..."  │
     │    },                                   │
     │    files: {                             │
     │      "~/.claude.json": {               │
     │        hasCompletedOnboarding: true     │
     │      }                                 │
     │    },                                   │
     │    prompt: "...",                        │
     │    timeout_ms: 300000                    │
     │  }                                      │
     │────────────────────────────────────────▶│
     │                                         │
     │                              Worker:    │
     │                              1. Set env var
     │                              2. Write ~/.claude.json
     │                              3. spawn('claude', args)
     │                              4. Stream output
     │                              5. Clear env + files
```

### 3.2 Multi-User Credential Model

The deployer owns the Claude subscription. Team members contribute 3rd-party service credentials.

```
┌───────────────────────────────────────────────────────────┐
│                    ROLE MODEL                              │
│                                                           │
│  DEPLOYER (Owner)                                         │
│  ├── Claude Pro/Max subscription → powers all agents      │
│  ├── Can invite team members (generates API keys)         │
│  ├── Can see all credentials (metadata only, not values)  │
│  ├── Can assign any credential to any persona             │
│  ├── Can deploy/destroy infrastructure                    │
│  └── Pays for infrastructure costs                        │
│                                                           │
│  TEAM MEMBER (Contributor)                                │
│  ├── Receives API key from deployer                       │
│  ├── Can contribute own 3rd-party credentials:            │
│  │   (Gmail OAuth, GitHub PAT, Slack token, etc.)         │
│  ├── Can view own credentials + metadata of others        │
│  ├── Cannot view other members' credential values         │
│  ├── Can revoke own credentials at any time               │
│  └── Can trigger persona executions                       │
│                                                           │
│  PERSONA (Agent)                                          │
│  ├── Runs under deployer's Claude subscription            │
│  ├── Can access assigned credentials from any contributor │
│  └── Gets decrypted values only in worker memory          │
│       during execution (never persisted to disk)          │
└───────────────────────────────────────────────────────────┘
```

#### Credential Lifecycle

```
Contributor adds credential via Vibeman UI
    │
    ▼
Encrypted client-side with deployment public key
    │
    ▼
Sent to orchestrator over TLS
    │
    ▼
Stored in orchestrator DB (AES-256-GCM, per-deployment master key)
    │
    ▼
Deployer assigns credential to persona
    │
    ▼
Execution triggers → orchestrator decrypts in-memory
    │
    ▼
Injected into worker as env vars (never touches disk)
    │
    ▼
Execution completes → worker clears env vars from memory
```

---

## 4. Worker Architecture

### 4.1 Outbound-Only Design

Workers connect **outbound** to the orchestrator. This eliminates:
- Public IP allocation
- Ingress firewall rules
- TLS certificate management on workers
- Load balancer costs

```
Worker ──WebSocket (TLS)──▶ Orchestrator
       ◀───────────────────

No inbound ports. No public IP. No DNS entry.
Workers can run on the cheapest possible compute.
```

### 4.2 Worker Lifecycle

```
┌─────────────────────────────────────────────┐
│              WORKER STATE MACHINE            │
│                                             │
│  ┌──────────┐    ┌───────┐    ┌──────────┐ │
│  │CONNECTING│───▶│ IDLE  │───▶│EXECUTING │ │
│  └──────────┘    └───┬───┘    └────┬─────┘ │
│       ▲              │             │        │
│       │              ▼             ▼        │
│       │         ┌─────────┐  ┌──────────┐  │
│       └─────────│RECONNECT│  │ CLEANUP  │  │
│                 └─────────┘  └────┬─────┘  │
│                                   │        │
│                                   ▼        │
│                              ┌──────────┐  │
│                              │   IDLE   │  │
│                              └──────────┘  │
└─────────────────────────────────────────────┘
```

### 4.3 Communication Protocol

JSON over WebSocket (TLS). Simple, debuggable, sufficient for our throughput.

```typescript
// Message types
type WorkerMessage =
  | { type: 'hello'; workerId: string; capabilities: string[] }
  | { type: 'ready' }
  | { type: 'stdout'; executionId: string; chunk: string }
  | { type: 'stderr'; executionId: string; chunk: string }
  | { type: 'complete'; executionId: string; status: 'completed' | 'failed'; meta: object }
  | { type: 'event'; executionId: string; event: PersonaEvent }
  | { type: 'heartbeat' }

type OrchestratorMessage =
  | { type: 'ack'; workerId: string; token: string }
  | { type: 'assign'; executionId: string; prompt: string; env: Record<string,string>; config: object }
  | { type: 'cancel'; executionId: string }
  | { type: 'shutdown'; reason: string }
  | { type: 'heartbeat' }
```

### 4.4 Execution Flow on Worker

```typescript
// Pseudocode for worker execution
async function executeOnWorker(assignment: ExecAssign) {
  // 1. Set environment
  process.env.CLAUDE_CODE_OAUTH_TOKEN = assignment.env.CLAUDE_CODE_OAUTH_TOKEN;

  // 2. Write config files
  writeFileSync('~/.claude.json', JSON.stringify({
    hasCompletedOnboarding: true
  }));

  // 3. Inject 3rd-party credentials as env vars
  for (const [key, value] of Object.entries(assignment.env)) {
    process.env[key] = value;
  }

  // 4. Spawn Claude Code CLI
  const child = spawn('claude', [
    '-p', '-',
    '--output-format', 'stream-json',
    '--dangerously-skip-permissions'
  ]);

  // 5. Pipe prompt
  child.stdin.write(assignment.prompt);
  child.stdin.end();

  // 6. Stream output to orchestrator
  child.stdout.on('data', (chunk) => {
    ws.send(JSON.stringify({
      type: 'stdout',
      executionId: assignment.executionId,
      chunk: chunk.toString()
    }));

    // 7. Parse persona protocols (manual_review, persona_action, etc.)
    parseAndEmitEvents(chunk, assignment.executionId);
  });

  // 8. Handle completion
  child.on('exit', (code) => {
    ws.send(JSON.stringify({
      type: 'complete',
      executionId: assignment.executionId,
      status: code === 0 ? 'completed' : 'failed',
      meta: { exitCode: code, duration: Date.now() - startTime }
    }));

    // 9. Cleanup credentials from environment
    cleanupEnv(assignment.env);
  });
}
```

---

## 5. Kafka Integration

### 5.1 Topic Design

Aligned with the existing [Kafka Migration Plan](./kafka-migration.md):

```
vibeman.persona.exec.v1           # Execution requests (Vibeman → Orchestrator)
  Key: personaId
  Value: { personaId, prompt, credentialIds, inputData, config, triggerId }

vibeman.persona.output.v1         # Streaming output (Orchestrator → Vibeman)
  Key: executionId
  Value: { executionId, chunk, timestamp }

vibeman.persona.events.v1         # Event bus (bidirectional)
  Key: projectId
  Value: { eventType, sourceType, sourceId, targetPersonaId, payload, status }

vibeman.persona.lifecycle.v1      # Execution status changes
  Key: executionId
  Value: { executionId, status, startedAt, completedAt, error, duration }

vibeman.persona.dlq.v1            # Dead letter queue
  Key: originalTopic
  Value: { originalMessage, error, retryCount }
```

### 5.2 Provider

**Upstash Kafka** (serverless):
- Free tier: 10,000 messages/day, 256 partitions
- Pay-as-you-go: $0.60/100K messages beyond free tier
- No infrastructure to manage
- REST + native Kafka protocol support

---

## 6. Security Model

### 6.1 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: TEAM AUTHENTICATION                                │
│  API key per team member, SHA-256 hashed in orchestrator DB. │
│  Sent as Authorization: Bearer <key> on every request.       │
│  Rate-limited per key. Rotatable by deployer.                │
│                                                              │
│  LAYER 2: TRANSPORT ENCRYPTION                               │
│  All communication over TLS 1.3.                             │
│  WebSocket connections require valid team API key.            │
│  Kafka connections use SASL/SSL.                             │
│                                                              │
│  LAYER 3: CREDENTIAL ENCRYPTION AT REST                      │
│  Claude subscription token: AES-256-GCM, deployment key.     │
│  3rd-party credentials: AES-256-GCM, per-credential IV.      │
│  Master key derived from deployment secret (not hardcoded).   │
│                                                              │
│  LAYER 4: CREDENTIAL ISOLATION IN EXECUTION                  │
│  Credentials injected as env vars (memory only).              │
│  Worker process isolated (one execution at a time).           │
│  Env vars cleared immediately after execution.                │
│  No credential data written to disk on workers.               │
│                                                              │
│  LAYER 5: WORKER ISOLATION                                   │
│  Each worker: separate VM/container.                          │
│  Outbound-only networking (no inbound ports).                 │
│  Execution timeout enforced (kills process).                  │
│  Temp directory wiped between executions.                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Threat Model

| Threat | Mitigation |
|---|---|
| Stolen team API key | Rate limiting, key rotation, revocation. IP allowlisting optional. |
| Compromised worker | Worker only holds short-lived env vars. No refresh token. No persistent credentials. Orchestrator can shutdown worker instantly. |
| Compromised orchestrator | Credentials encrypted at rest. Master key in cloud provider's secret manager (not on disk). |
| Man-in-the-middle | TLS 1.3 on all connections. Certificate pinning optional. |
| Claude token theft | Token valid ~1 year but scoped to `claude_code` sessions only. User can revoke at claude.ai. |
| Credential exfiltration via agent prompt | Credentials are env vars, not in prompt. Agent would need to intentionally `echo $VAR` — mitigated by execution output monitoring. |

---

## 7. Infrastructure & Cost

### 7.1 Compute Strategy

**Phase 1 (Experiment):** Single-tier, simple

| Component | Provider | Spec | Cost |
|---|---|---|---|
| Orchestrator | Fly.io Machine | shared-cpu-1x, 256MB | ~$2/mo |
| Worker ×1 | DigitalOcean Droplet | s-1vcpu-1gb | $6/mo |
| Kafka | Upstash Free Tier | 10K msg/day | $0/mo |
| **Total** | | | **~$8/mo** |

**Phase 2 (Team Use):** Multi-worker

| Component | Provider | Spec | Cost |
|---|---|---|---|
| Orchestrator | Fly.io Machine | shared-cpu-1x, 512MB | ~$4/mo |
| Worker ×2 | DigitalOcean Droplets | s-1vcpu-1gb each | $12/mo |
| Worker (burst) | Fly.io Machine | on-demand, per-second | ~$1-3/mo |
| Kafka | Upstash | Pay-as-you-go | ~$2/mo |
| **Total** | | | **~$19-21/mo** |

**Phase 3 (Commercial):** Managed multi-tenant

| Component | Provider | Spec | Cost |
|---|---|---|---|
| Orchestrator | Fly.io / K8s | Multi-tenant, HA | Variable |
| Workers | Per-customer pools | Isolated | Pass-through + margin |
| Kafka | Confluent Cloud | Managed, multi-tenant | Variable |
| **Total per customer** | | | **$10-30/mo** |

### 7.2 Near-Zero-Cost Optimization (Future)

For cost-conscious deployments:

| Tier | Provider | Cost | Use |
|---|---|---|---|
| Free always-on | Oracle Cloud Free ARM (4 CPU, 24GB) | $0 | Primary workers |
| Free always-on | Google Cloud e2-micro (1GB) | $0 | Orchestrator |
| Burst | Fly.io Machines (per-second) | ~$0.003/exec | Overflow |
| Spot | Hetzner CX22 hourly | ~$0.006/hr | Heavy load |

---

## 8. Vibeman Integration Points

### 8.1 Modified Files

| File | Change |
|---|---|
| `src/lib/personas/executionEngine.ts` | Add `CloudExecutionEngine` class that produces to Kafka instead of local `spawn()` |
| `src/lib/personas/executionQueue.ts` | Add Kafka producer mode alongside in-memory queue |
| `src/lib/personas/eventBus.ts` | Add Kafka consumer mode alongside SQLite polling |
| `src/lib/personas/promptAssembler.ts` | No changes — prompt format stays the same |
| `src/lib/personas/credentialCrypto.ts` | Add deployment-key encryption mode for cloud credentials |
| `src/stores/personaStore.ts` | Add cloud deployment state (status, workers, token) |
| `src/app/db/repositories/persona.repository.ts` | Add execution source tracking (local vs cloud) |

### 8.2 New Files

| File | Purpose |
|---|---|
| `src/app/features/Personas/components/CloudDeployPanel.tsx` | One-click deploy/destroy UI |
| `src/app/features/Personas/components/CloudCredentialManager.tsx` | Team credential contribution UI |
| `src/app/features/Personas/components/CloudStatusMonitor.tsx` | Worker status, execution stream |
| `src/app/api/personas/cloud/route.ts` | Deployment lifecycle API |
| `src/app/api/personas/cloud/token/route.ts` | Subscription token management |
| `src/app/api/personas/cloud/workers/route.ts` | Worker status API |
| `src/lib/personas/kafkaProducer.ts` | Kafka producer singleton |
| `src/lib/personas/kafkaConsumer.ts` | Kafka consumer for output/events |
| `src/lib/personas/cloudDeployment.ts` | Infrastructure provisioning logic |

### 8.3 New Packages (Orchestrator + Worker)

```
dac-cloud/
├── packages/
│   ├── orchestrator/          # Orchestrator service
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point
│   │   │   ├── kafka.ts       # Kafka consumer/producer
│   │   │   ├── workerPool.ts  # WebSocket worker management
│   │   │   ├── tokenManager.ts # Claude token storage
│   │   │   ├── credentialVault.ts # 3rd-party credential storage
│   │   │   ├── dispatcher.ts  # Execution dispatch logic
│   │   │   ├── metrics.ts     # Usage metering
│   │   │   └── auth.ts        # Team API key validation
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── worker/                # Worker process
│   │   ├── src/
│   │   │   ├── index.ts       # Entry point
│   │   │   ├── connection.ts  # WebSocket client
│   │   │   ├── executor.ts    # Claude CLI spawning
│   │   │   ├── parser.ts      # Stdout protocol parsing
│   │   │   └── cleanup.ts     # Credential/env cleanup
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── shared/                # Shared types and utilities
│       ├── src/
│       │   ├── protocol.ts    # WebSocket message types
│       │   ├── crypto.ts      # Encryption utilities
│       │   └── types.ts       # Shared type definitions
│       └── package.json
│
├── infra/                     # Infrastructure as code
│   ├── deploy.ts              # Deployment script
│   ├── destroy.ts             # Teardown script
│   └── templates/             # Cloud-init / Dockerfile templates
│
├── package.json               # Monorepo root
└── turbo.json                 # Turborepo config
```

---

## 9. Personas Compatibility

### 9.1 What Works Unchanged

| Feature | Status | Notes |
|---|---|---|
| System prompts | ✅ Identical | Same prompt format, same assembler |
| Structured prompts | ✅ Identical | JSON sections passed through |
| Tool definitions | ✅ Identical | Tools are prompt instructions, not runtime bindings |
| Manual review protocol | ✅ Identical | Worker parses `{ manual_review: ... }` from stdout |
| User message protocol | ✅ Identical | Worker parses `{ user_message: ... }` from stdout |
| Persona action protocol | ✅ Identical | Worker emits events to orchestrator → Kafka |
| Event emission protocol | ✅ Identical | Worker emits events to orchestrator → Kafka |
| Execution streaming | ✅ Identical | SSE from Kafka instead of in-memory buffer |
| Credential injection | ✅ Compatible | Env vars instead of direct decrypt |

### 9.2 What Changes

| Feature | Change | Reason |
|---|---|---|
| Credential encryption | Deployment-key based (not machine-bound) | Cloud portability |
| Event bus transport | Kafka (not SQLite polling) | Cross-device, real-time |
| Execution queue | Kafka topic (not in-memory) | Persistent, distributed |
| Trigger scheduler | Runs in orchestrator (not Vibeman) | Always-on in cloud |
| File system access | Worker has temp workspace (not user's files) | Cloud isolation |

### 9.3 Event Bus Mapping

```
Current (SQLite):                    Cloud (Kafka):

persona_events table                 vibeman.persona.events.v1 topic
  → INSERT                            → produce message
  → SELECT WHERE pending               → consume from group
  → UPDATE status=completed            → commit offset

persona_event_subscriptions table    Same table in orchestrator DB
  → persona matches event              → orchestrator routes to worker

Polling loop (5s/30s)                Kafka consumer (real-time push)
```

---

## 10. Commercialization Path

### 10.1 Tier Model

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  FREE (Vibeman Local)                                       │
│  ├── Build unlimited personas                               │
│  ├── Run locally with own Claude CLI                        │
│  ├── Local event bus, local credentials                     │
│  ├── Full feature set                                       │
│  └── No cloud, no team sharing                              │
│                                                             │
│  SELF-HOSTED CLOUD (Open Source)                            │
│  ├── Deploy own orchestrator + workers                      │
│  ├── User's Claude subscription                             │
│  ├── User's infrastructure costs                            │
│  ├── Team sharing via API keys                              │
│  ├── Community support                                      │
│  └── Full control                                           │
│                                                             │
│  MANAGED CLOUD (Commercial, Future)                         │
│  ├── We host orchestrator (multi-tenant)                    │
│  ├── User's Claude subscription (they auth via setup-token) │
│  ├── We provide managed workers                             │
│  ├── Infrastructure fee: $10-30/mo                          │
│  ├── Team management dashboard                              │
│  ├── Monitoring, alerting, SLA                              │
│  ├── Priority burst capacity                                │
│  └── Revenue: infrastructure fee only, no token markup      │
│                                                             │
│  Key: We NEVER touch their Anthropic bill.                  │
│  We charge for infrastructure + orchestration only.         │
│  Their Claude usage = their subscription.                   │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Metering (Built from Phase 1)

Even during the experiment, we record:

| Metric | Purpose |
|---|---|
| Execution count per persona | Usage analytics |
| Execution duration | Cost allocation |
| Token usage (from Claude CLI output) | Subscription monitoring |
| Credential access frequency | Security audit |
| Worker utilization | Capacity planning |
| Event throughput | Kafka sizing |

### 10.3 Multi-Tenancy (Phase 3+)

```
Tenant A (free tier):
  └── Local only, no cloud resources

Tenant B (self-hosted):
  ├── Own orchestrator
  ├── Own workers
  ├── Own Kafka topics: tenantB.persona.exec.v1
  └── Fully isolated

Tenant C (managed):
  ├── Shared orchestrator (namespace isolation)
  ├── Dedicated worker pool
  ├── Isolated Kafka topics: tenantC.persona.exec.v1
  └── Billing via Stripe
```

---

## 11. Comparison: DAC Cloud vs Existing Solutions

### 11.1 vs Workflow Engines (n8n, Power Automate, Zapier)

| Aspect | Workflow Engines | DAC Cloud |
|---|---|---|
| **Paradigm** | Deterministic pipelines | Intelligent agents |
| **Configuration** | Visual drag-and-drop | Natural language |
| **Connectors** | Pre-built (400-1000+) | Any API via Claude CLI |
| **Decision logic** | If/else branches | LLM reasoning |
| **Error handling** | Retry + fallback paths | Self-healing (reads docs, adapts) |
| **Speed** | Milliseconds | Seconds to minutes |
| **Cost per run** | Fractions of a cent | Claude subscription quota |
| **Best for** | High-volume, simple flows | Complex, judgment-heavy tasks |

### 11.2 vs AI Agent Platforms (Langchain, CrewAI, AutoGen)

| Aspect | Agent Frameworks | DAC Cloud |
|---|---|---|
| **Runtime** | Python/JS libraries | Claude Code CLI (full dev environment) |
| **Tool access** | SDK-defined tools | Any CLI tool, any script, any API |
| **File system** | Limited/sandboxed | Full access (per execution) |
| **Code execution** | Sandboxed interpreters | Native OS execution |
| **Orchestration** | Framework-specific | Kafka event bus + personas |
| **Deployment** | Self-managed | One-click cloud deployment |
| **Human review** | Custom implementation | Built-in manual review protocol |

### 11.3 vs Claude Code on Desktop

| Aspect | Local Claude Code | DAC Cloud |
|---|---|---|
| **Availability** | When machine is on | 24/7 always-on |
| **Triggers** | Manual only | Schedule, webhook, polling, events |
| **Sharing** | Single user | Team access |
| **Inter-agent** | Not possible | Event-driven agent coordination |
| **Monitoring** | Terminal output | Dashboard + notifications |
| **Credentials** | Machine-bound | Cloud vault, team-contributed |

---

## 12. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Anthropic changes `setup-token` behavior | High | Low | Monitor releases. Fallback to credential file transfer (Path 2). |
| Anthropic blocks remote CLI usage | Critical | Very Low | Depot.dev and GH Actions depend on this. Would affect entire ecosystem. |
| Claude subscription rate limits hit | Medium | Medium | Queue backpressure. User notification. Configurable concurrency. |
| Worker compromise leaks credentials | High | Low | Credentials in memory only. No refresh token on worker. Instant shutdown capability. |
| Kafka message loss | Medium | Low | Upstash guarantees. DLQ for failures. Execution status tracking. |
| Token expiry during execution | Low | Low | Token valid ~1 year. Pre-flight validation. Graceful failure. |
| Cost overrun from burst workers | Medium | Medium | Hard caps on burst instances. Budget alerts. |

---

## 13. References

- [Claude Code Authentication Docs](https://code.claude.com/docs/en/authentication)
- [Depot.dev Remote Claude Code Agents](https://depot.dev/docs/agents/claude-code/quickstart)
- [Claude Code Action with OAuth (GitHub)](https://github.com/marketplace/actions/claude-code-action-with-oauth)
- [Existing Kafka Migration Plan](./kafka-migration.md)
- [Existing Remote Gateway Proposal](./REMOTE_GATEWAY_PROPOSAL.md)
- [Anthropic harness policy (VentureBeat)](https://venturebeat.com/technology/anthropic-cracks-down-on-unauthorized-claude-usage-by-third-party-harnesses)
