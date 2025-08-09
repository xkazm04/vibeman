# Feature Context: [Complete Feature Name]

file: feature_context.md

## Core Functionality

[2-3 sentences describing the complete user-facing capability, how users interact with it, and how it spans multiple architectural layers]

## Architecture

### Location Map

```
[Complete project structure showing ALL layers of the feature]
Example for a complete feature:
src/
├── components/
│   └── [feature]/           # Frontend UI components
│       ├── [Feature]Page.tsx
│       ├── [Feature]Form.tsx
│       └── [Feature]List.tsx
├── api/
│   └── [feature]/           # Backend API endpoints
│       ├── route.ts
│       └── [feature].service.ts
├── lib/
│   ├── database.ts          # Database schema/models
│   └── [feature]Utils.ts    # Business logic
├── types/
│   └── [feature].ts         # Type definitions
└── hooks/
    └── use[Feature].ts      # State management

```

### Key Files by Layer

**Frontend Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `[path/to/component]` | [UI component responsibility] | [when to change UI] |
| `[path/to/hook]` | [state management] | [when to change data flow] |

**Backend Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `[path/to/api]` | [API endpoint responsibility] | [when to change endpoints] |
| `[path/to/service]` | [business logic] | [when to change rules] |

**Database Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `[path/to/schema]` | [data model] | [when to change schema] |

## Data Flow

### Complete User Journey

```
[End-to-end flow from user interaction to data persistence]
Example:
User Action → Frontend Component → API Call → Business Logic → Database → Response → UI Update

1. User interacts with [UI Component]
2. Frontend validates and sends request to [API Endpoint]
3. Backend processes via [Service/Controller]
4. Data persisted to [Database Table/Collection]
5. Response sent back to frontend
6. UI updated with new state

```

### State Management Across Layers

- **Frontend State**: [React state, form data, UI state]
- **API State**: [request/response handling, caching]
- **Database State**: [persistent data, relationships]
- **Cache Strategy**: [how data is cached across layers]

## Data Models

### Primary Schema

```tsx
// Main data structures used by this feature
interface [ModelName] {
  [field]: [type];
}

```

### Database

- **Tables**: [list of database tables]
- **Collections**: [for NoSQL, list collections]
- **Indexes**: [important indexes]
- **Relations**: [key relationships]

## Business Rules

### Validation Rules

- [Rule description and requirements]
- [Rule description and requirements]

### Access Control

- **Public**: [what's publicly accessible]
- **Authenticated**: [what requires login]
- **Authorized**: [what requires specific permissions]
- **Admin**: [admin-only operations]

### Constraints

- [Business constraint or limitation]
- [Performance constraint]
- [Security constraint]

## API Specifications

### Complete Feature API Endpoints

#### [Primary Operation] (e.g., Create/Read/Update/Delete)

**Endpoint**: `[METHOD] [path]`

**Purpose**: [main user action this supports]

**Request**:

```json
{
  "field": "type/example"
}

```

**Response**: `[status code]` [description]

**Errors**: `[code]` [condition]

#### [Secondary Operation] (if applicable)

**Endpoint**: `[METHOD] [path]`

**Purpose**: [supporting user action]

**Request**: [request format]

**Response**: `[status code]` [description]

### Integration Points

- **External APIs**: [third-party services used]
- **Internal Services**: [other system components this feature depends on]
- **Webhooks/Events**: [async processing or notifications]

---

## Update Log

| Date | Author | Changes |
| --- | --- | --- |
| YYYY-MM-DD | [name/LLM] | [what was changed] |

## Notes for LLM/Developer

[Any special instructions for updating or working with this feature]

- [Important consideration]
- [Gotcha to be aware of]
- [Preferred patterns or approaches]