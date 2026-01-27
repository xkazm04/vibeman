# Vibeman Remote Gateway - Google Cloud Serverless Proposal

## Overview

A lightweight serverless gateway that provides a unified REST interface for external apps to interact with Vibeman via Supabase, with simplified authentication and template-based implementation requests.

## Architecture

```
┌─────────────────┐      ┌─────────────────────────────┐      ┌──────────────┐
│  External Apps  │      │    Vibeman Gateway          │      │   Supabase   │
│  (Mobile/IoT)   │─────▶│    (Cloud Run)              │─────▶│   Database   │
│                 │◀─────│                             │◀─────│              │
└─────────────────┘      │  - API Key Auth             │      └──────────────┘
     │                   │  - Template Validation      │             │
     │                   │  - Request Transformation   │             │
     │                   └─────────────────────────────┘             │
     │                                                               │
     └───────────────────── Realtime Events ─────────────────────────┘
```

## Key Features

1. **Single Endpoint**: `POST /implement` for all implementation requests
2. **API Key Auth**: Simple header-based authentication
3. **Template System**: Enum-like template IDs for predefined actions
4. **Serverless**: Auto-scaling, pay-per-use on Google Cloud Run
5. **Type-Safe**: Validated request/response schemas

## API Design

### Authentication

```
X-API-Key: vbm_xxxxxxxxxxxx
```

### POST /implement

Submit an implementation request using templates.

```typescript
interface ImplementRequest {
  projectId: string;
  templateId: TemplateId;
  metadata?: Record<string, unknown>;
}

type TemplateId =
  // Idea Management
  | 'ACCEPT_NEXT_IDEA'        // Accept the next pending idea
  | 'REJECT_ALL_LOW_PRIORITY' // Reject ideas below threshold
  | 'BATCH_ACCEPT_BY_TAG'     // Accept ideas matching tag

  // Goal Management
  | 'CREATE_GOAL_FROM_IDEA'   // Convert accepted idea to goal
  | 'COMPLETE_GOAL'           // Mark goal as complete
  | 'ARCHIVE_STALE_GOALS'     // Archive old incomplete goals

  // Batch Execution
  | 'START_NEXT_BATCH'        // Start pending batch
  | 'PAUSE_ALL_BATCHES'       // Pause all running batches
  | 'RESUME_BATCH'            // Resume specific batch

  // Scanning
  | 'QUICK_SCAN'              // Fast scan with basic agents
  | 'DEEP_SCAN'               // Comprehensive scan all agents
  | 'SECURITY_SCAN'           // Security-focused scan
  | 'CONTEXT_SCAN'            // Scan specific context

  // Custom
  | 'CUSTOM_COMMAND';         // Freeform command with payload
```

### Example Requests

```bash
# Accept the next pending idea
curl -X POST https://vibeman-gateway-xxx.run.app/implement \
  -H "X-API-Key: vbm_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-project",
    "templateId": "ACCEPT_NEXT_IDEA"
  }'

# Create goal from specific idea
curl -X POST https://vibeman-gateway-xxx.run.app/implement \
  -H "X-API-Key: vbm_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-project",
    "templateId": "CREATE_GOAL_FROM_IDEA",
    "metadata": {
      "ideaId": "idea-123",
      "priority": "high"
    }
  }'

# Run quick scan
curl -X POST https://vibeman-gateway-xxx.run.app/implement \
  -H "X-API-Key: vbm_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-project",
    "templateId": "QUICK_SCAN",
    "metadata": {
      "contextIds": ["ctx-1", "ctx-2"]
    }
  }'
```

### Response

```typescript
interface ImplementResponse {
  success: boolean;
  requestId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  result?: unknown;
}
```

## Google Cloud Run Implementation

### Project Structure

```
vibeman-gateway/
├── src/
│   ├── index.ts           # Entry point
│   ├── auth.ts            # API key validation
│   ├── templates.ts       # Template definitions
│   ├── supabase.ts        # Supabase client
│   └── handlers/
│       ├── implement.ts   # Main handler
│       └── status.ts      # Status check
├── Dockerfile
├── package.json
└── cloudbuild.yaml
```

### Core Implementation

```typescript
// src/index.ts
import express from 'express';
import { validateApiKey } from './auth';
import { handleImplement } from './handlers/implement';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Main endpoint
app.post('/implement', validateApiKey, handleImplement);

// Status endpoint
app.get('/status/:requestId', validateApiKey, handleStatus);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Gateway running on ${PORT}`));
```

```typescript
// src/auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const { data: client } = await supabase
    .from('vibeman_clients')
    .select('id, permissions, is_active')
    .eq('api_key', apiKey)
    .single();

  if (!client || !client.is_active) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.client = client;
  next();
}
```

```typescript
// src/templates.ts
export const TEMPLATES = {
  // Idea Management
  ACCEPT_NEXT_IDEA: {
    commandType: 'accept_idea',
    resolver: async (supabase, projectId, metadata) => {
      // Find next pending idea
      const { data: idea } = await supabase
        .from('vibeman_events')
        .select('payload')
        .eq('project_id', projectId)
        .eq('event_type', 'idea_generated')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      return { ideaId: idea?.payload?.ideaId };
    }
  },

  QUICK_SCAN: {
    commandType: 'trigger_scan',
    resolver: async (_, projectId, metadata) => ({
      projectId,
      scanTypes: ['zen_architect', 'bug_hunter'],
      contextIds: metadata?.contextIds
    })
  },

  DEEP_SCAN: {
    commandType: 'trigger_scan',
    resolver: async (_, projectId, metadata) => ({
      projectId,
      scanTypes: [
        'zen_architect', 'bug_hunter', 'perf_optimizer',
        'security_protector', 'dx_advocate', 'test_sage'
      ],
      contextIds: metadata?.contextIds
    })
  },

  // ... more templates
} as const;
```

```typescript
// src/handlers/implement.ts
import { createClient } from '@supabase/supabase-js';
import { TEMPLATES } from '../templates';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function handleImplement(req, res) {
  const { projectId, templateId, metadata } = req.body;

  // Validate template
  const template = TEMPLATES[templateId];
  if (!template) {
    return res.status(400).json({
      success: false,
      error: `Unknown template: ${templateId}`
    });
  }

  try {
    // Resolve payload from template
    const payload = await template.resolver(supabase, projectId, metadata);

    // Insert command
    const { data: command, error } = await supabase
      .from('vibeman_commands')
      .insert({
        client_id: req.client.id,
        project_id: projectId,
        command_type: template.commandType,
        payload,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      requestId: command.id,
      status: 'queued',
      message: `Template ${templateId} queued for execution`
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

### Dockerfile

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
```

### Cloud Build

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/vibeman-gateway', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/vibeman-gateway']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'vibeman-gateway'
      - '--image'
      - 'gcr.io/$PROJECT_ID/vibeman-gateway'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'SUPABASE_URL=${_SUPABASE_URL},SUPABASE_SERVICE_KEY=${_SUPABASE_SERVICE_KEY}'

substitutions:
  _SUPABASE_URL: ''
  _SUPABASE_SERVICE_KEY: ''
```

## Deployment

### 1. Setup GCP Project

```bash
gcloud projects create vibeman-gateway
gcloud config set project vibeman-gateway
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### 2. Store Secrets

```bash
gcloud secrets create supabase-url --data-file=- <<< "https://xxx.supabase.co"
gcloud secrets create supabase-key --data-file=- <<< "eyJ..."
```

### 3. Deploy

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SUPABASE_URL=$(gcloud secrets versions access latest --secret=supabase-url),_SUPABASE_SERVICE_KEY=$(gcloud secrets versions access latest --secret=supabase-key)
```

### 4. Get URL

```bash
gcloud run services describe vibeman-gateway --format='value(status.url)'
# https://vibeman-gateway-xxx-uc.a.run.app
```

## Cost Estimation

Cloud Run pricing (us-central1):
- **CPU**: $0.00002400/vCPU-second
- **Memory**: $0.00000250/GiB-second
- **Requests**: $0.40/million

For typical usage (1000 requests/day, 100ms avg):
- ~$0.50/month

## Security Considerations

1. **API Key Rotation**: Add endpoint to rotate keys
2. **Rate Limiting**: Cloud Armor or in-app limiting
3. **Audit Logging**: Log all requests to Cloud Logging
4. **VPC Connector**: Optional private networking to Supabase

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Cloud Run** | Simple, auto-scaling, cheap | Cold starts |
| Cloud Functions | Event-driven, simpler | Less control |
| Cloud Endpoints | API management | More complex setup |
| Firebase Functions | Easy Supabase-like integration | Vendor lock-in |

## Next Steps

1. [ ] Create GCP project and enable APIs
2. [ ] Scaffold gateway service
3. [ ] Implement core templates
4. [ ] Deploy to Cloud Run
5. [ ] Create mobile SDK wrapper
6. [ ] Add monitoring dashboard

## Mobile SDK Example (Flutter)

```dart
class VibemanGateway {
  final String baseUrl;
  final String apiKey;

  VibemanGateway({required this.baseUrl, required this.apiKey});

  Future<ImplementResponse> implement({
    required String projectId,
    required TemplateId templateId,
    Map<String, dynamic>? metadata,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/implement'),
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'projectId': projectId,
        'templateId': templateId.name,
        'metadata': metadata,
      }),
    );

    return ImplementResponse.fromJson(jsonDecode(response.body));
  }
}

// Usage
final gateway = VibemanGateway(
  baseUrl: 'https://vibeman-gateway-xxx.run.app',
  apiKey: 'vbm_xxxxxxxxxxxx',
);

await gateway.implement(
  projectId: 'my-project',
  templateId: TemplateId.ACCEPT_NEXT_IDEA,
);
```
