# Vibeman Bridge API

The Bridge API enables third-party applications (Flutter, web apps, CLI tools) to control Vibeman remotely. This allows for distributed development workflows, cross-device task management, and external automation.

## Quick Start

### 1. Enable Bridge Access

By default, the Bridge API is open for local development. For production use, set an API key:

```bash
# Add to .env
BRIDGE_API_KEY=your-secure-api-key-here
```

### 2. Connect from Third-Party Application

**HTTP Requests:**
```bash
# Example: List goals for a project
curl -X GET "http://localhost:3000/api/bridge/goals?projectId=your-project-id" \
  -H "X-Bridge-API-Key: your-api-key"
```

**Server-Sent Events (SSE) for Real-Time Updates:**
```bash
# Connect to real-time event stream
curl -N "http://localhost:3000/api/bridge/stream?projectId=*" \
  -H "X-Bridge-API-Key: your-api-key"
```

---

## API Reference

### Authentication

All endpoints require the `X-Bridge-API-Key` header when `BRIDGE_API_KEY` is configured.

```
Header: X-Bridge-API-Key: <your-api-key>
```

If no key is configured, all requests are allowed (development mode).

---

## Endpoints

### Status

#### `GET /api/bridge/status`
Check system status and connectivity.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "connectedClients": 2,
  "activeBatches": 1,
  "timestamp": "2025-12-20T12:00:00Z"
}
```

---

### Goals

#### `GET /api/bridge/goals`
List all goals for a project.

**Query Parameters:**
- `projectId` (required): The project ID

**Response:**
```json
{
  "goals": [
    {
      "id": "goal-1",
      "project_id": "project-1",
      "title": "Implement user auth",
      "description": "Add OAuth2 authentication",
      "status": "open",
      "order_index": 1
    }
  ],
  "total": 1
}
```

#### `POST /api/bridge/goals`
Create a new goal.

**Body:**
```json
{
  "projectId": "project-1",
  "name": "Add dark mode",
  "description": "Implement system-wide dark theme",
  "contextId": "ctx-optional"
}
```

#### `GET /api/bridge/goals/[id]`
Get a single goal by ID.

#### `DELETE /api/bridge/goals/[id]`
Delete a goal.

---

### Ideas

#### `GET /api/bridge/ideas`
List ideas with optional filtering.

**Query Parameters:**
- `projectId`: Filter by project
- `status`: Filter by status (`pending`, `accepted`, `rejected`, `implemented`)
- `contextId`: Filter by context
- `limit`: Max results (default: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "ideas": [...],
  "total": 50,
  "limit": 100,
  "offset": 0
}
```

#### `GET /api/bridge/ideas/[id]`
Get a single idea.

#### `DELETE /api/bridge/ideas/[id]`
Delete an idea.

#### `POST /api/bridge/ideas/[id]/action`
Accept, reject, or skip an idea.

**Body:**
```json
{
  "action": "accept" | "reject" | "skip"
}
```

#### `GET /api/bridge/ideas/generate`
List available scan types.

**Response:**
```json
{
  "scanTypes": [
    {
      "id": "zen_architect",
      "name": "Zen Architect",
      "description": "Simplicity & elegant design patterns",
      "category": "technical"
    },
    ...
  ]
}
```

#### `POST /api/bridge/ideas/generate`
Trigger idea generation.

**Body:**
```json
{
  "projectId": "project-1",
  "scanTypes": ["zen_architect", "bug_hunter", "competitor_analyst"],
  "contextIds": ["ctx-1", "ctx-2"]
}
```

**Response:**
```json
{
  "success": true,
  "filesCreated": 6,
  "message": "Created 6 requirement files. Use TaskRunner to execute them."
}
```

---

### Batches

Vibeman supports 4 concurrent execution batches: `batch1`, `batch2`, `batch3`, `batch4`.

#### `GET /api/bridge/batches`
List all batch configurations.

#### `POST /api/bridge/batches`
Create a new batch.

**Body:**
```json
{
  "batchId": "batch1",
  "name": "Feature Implementation",
  "taskIds": ["project-1:task-1", "project-1:task-2"]
}
```

#### `GET /api/bridge/batches/[id]`
Get batch details.

#### `DELETE /api/bridge/batches/[id]`
Delete a batch.

#### `POST /api/bridge/batches/[id]/assign`
Assign accepted ideas to a batch.

**Body:**
```json
{
  "ideaIds": ["idea-1", "idea-2", "idea-3"]
}
```

**Response:**
```json
{
  "success": true,
  "instruction": "addTasksToBatch",
  "params": {
    "batchId": "batch1",
    "taskIds": ["project-1:req-1", "project-1:req-2"]
  },
  "assigned": 2
}
```

#### `POST /api/bridge/batches/[id]/control`
Control batch execution.

**Body:**
```json
{
  "action": "start" | "pause" | "stop" | "resume"
}
```

---

### Real-Time Events (SSE)

#### `GET /api/bridge/stream`
Connect to the Server-Sent Events stream for real-time updates.

**Query Parameters:**
- `projectId`: Filter events by project (use `*` for all projects)

**Event Types:**

| Event | Description | Payload |
|-------|-------------|---------|
| `connection_established` | SSE connection opened | `{ clientId, projectId }` |
| `idea_generated` | New idea created | `{ ideaId, title, scanType }` |
| `idea_updated` | Idea status changed | `{ ideaId, status, previousStatus }` |
| `task_started` | Task execution began | `{ taskId, batchId, title }` |
| `task_completed` | Task finished successfully | `{ taskId, batchId, title }` |
| `task_failed` | Task failed | `{ taskId, batchId, title, error }` |
| `batch_progress` | Batch progress update | `{ batchId, completed, total }` |
| `goal_created` | New goal created | `{ goalId, name, projectId }` |
| `goal_deleted` | Goal deleted | `{ goalId, name, projectId }` |

**Example SSE Client (JavaScript):**
```javascript
const eventSource = new EventSource('/api/bridge/stream?projectId=*', {
  headers: { 'X-Bridge-API-Key': 'your-api-key' }
});

eventSource.addEventListener('task_completed', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Task completed: ${data.payload.title}`);
});

eventSource.onerror = () => {
  console.log('Connection lost, reconnecting...');
};
```

**Example SSE Client (Dart/Flutter):**
```dart
import 'package:eventsource/eventsource.dart';

final eventSource = EventSource(
  Uri.parse('http://localhost:3000/api/bridge/stream?projectId=*'),
  headers: {'X-Bridge-API-Key': 'your-api-key'},
);

eventSource.listen((Event event) {
  if (event.event == 'task_completed') {
    final data = jsonDecode(event.data!);
    print('Task completed: ${data['payload']['title']}');
  }
});
```

---

## Integration Examples

### Flutter Integration

```dart
// lib/services/vibeman_bridge.dart
class VibemanBridge {
  final String baseUrl;
  final String? apiKey;

  VibemanBridge({
    this.baseUrl = 'http://localhost:3000',
    this.apiKey,
  });

  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    if (apiKey != null) 'X-Bridge-API-Key': apiKey!,
  };

  // Get all ideas for a project
  Future<List<Idea>> getIdeas(String projectId, {String? status}) async {
    final uri = Uri.parse('$baseUrl/api/bridge/ideas')
      .replace(queryParameters: {
        'projectId': projectId,
        if (status != null) 'status': status,
      });

    final response = await http.get(uri, headers: headers);
    final data = jsonDecode(response.body);
    return (data['ideas'] as List).map((i) => Idea.fromJson(i)).toList();
  }

  // Accept an idea
  Future<void> acceptIdea(String ideaId) async {
    await http.post(
      Uri.parse('$baseUrl/api/bridge/ideas/$ideaId/action'),
      headers: headers,
      body: jsonEncode({'action': 'accept'}),
    );
  }

  // Generate new ideas
  Future<void> generateIdeas({
    required String projectId,
    required List<String> scanTypes,
    List<String>? contextIds,
  }) async {
    await http.post(
      Uri.parse('$baseUrl/api/bridge/ideas/generate'),
      headers: headers,
      body: jsonEncode({
        'projectId': projectId,
        'scanTypes': scanTypes,
        'contextIds': contextIds,
      }),
    );
  }

  // Connect to SSE stream
  Stream<BridgeEvent> connect(String projectId) {
    final controller = StreamController<BridgeEvent>();

    final eventSource = EventSource(
      Uri.parse('$baseUrl/api/bridge/stream?projectId=$projectId'),
      headers: headers,
    );

    eventSource.listen((event) {
      controller.add(BridgeEvent.fromEvent(event));
    });

    return controller.stream;
  }
}
```

### Python Integration

```python
import requests
from sseclient import SSEClient

class VibemanBridge:
    def __init__(self, base_url='http://localhost:3000', api_key=None):
        self.base_url = base_url
        self.headers = {'Content-Type': 'application/json'}
        if api_key:
            self.headers['X-Bridge-API-Key'] = api_key

    def get_ideas(self, project_id, status=None):
        params = {'projectId': project_id}
        if status:
            params['status'] = status

        response = requests.get(
            f'{self.base_url}/api/bridge/ideas',
            headers=self.headers,
            params=params
        )
        return response.json()['ideas']

    def accept_idea(self, idea_id):
        requests.post(
            f'{self.base_url}/api/bridge/ideas/{idea_id}/action',
            headers=self.headers,
            json={'action': 'accept'}
        )

    def stream_events(self, project_id='*'):
        response = requests.get(
            f'{self.base_url}/api/bridge/stream?projectId={project_id}',
            headers=self.headers,
            stream=True
        )

        client = SSEClient(response)
        for event in client.events():
            yield {
                'type': event.event,
                'data': json.loads(event.data)
            }

# Usage
bridge = VibemanBridge(api_key='your-key')
for event in bridge.stream_events():
    print(f"{event['type']}: {event['data']}")
```

---

## Zen Mode Monitoring

Vibeman includes a built-in Zen Mode (`/zen`) for minimal, calm batch monitoring. This is ideal for:
- Holiday monitoring
- Background execution tracking
- Multi-device status checks

Access it directly at: `http://localhost:3000` and select "Zen Mode" from the navigation.

---

## Cross-Device Task Offloading

For distributing work across multiple machines, see the [Offload Implementation Plan](../../../docs/OFFLOAD_IMPLEMENTATION_PLAN.md).

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Bridge Error",
  "message": "Description of what went wrong"
}
```

Common HTTP status codes:
- `400`: Bad request (missing/invalid parameters)
- `401`: Unauthorized (invalid or missing API key)
- `404`: Resource not found
- `500`: Internal server error

---

## Security Considerations

1. **API Key**: Always set `BRIDGE_API_KEY` in production
2. **Network**: Only expose Bridge API on trusted networks
3. **Project Isolation**: All operations are scoped by projectId
4. **Rate Limiting**: Consider adding rate limiting for production use

---

## Troubleshooting

### SSE Connection Drops
- Check network stability
- Verify API key is correct
- SSE has a 30-second ping interval; connections auto-recover

### Events Not Received
- Ensure correct `projectId` filter
- Check that TaskRunner is emitting events
- Verify SSE endpoint is accessible

### Batch Operations Not Working
- Batch state is client-side; use SSE for real-time state
- Ensure ideas have `requirement_id` before assigning to batch
