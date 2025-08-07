# Feature Context: [Feature Name]

file: feature_context.md

## Core Functionality

[2-3 sentences describing the main responsibility and how it fits into the system]

## Architecture

### Location Map

```
[Project structure showing where feature files are located]
Example:
src/
├── api/
│   └── [feature]/
├── components/
│   └── [feature]/
├── services/
│   └── [feature]/
└── types/
    └── [feature]/

```

### Key Files

| File | Purpose | Modify When |
| --- | --- | --- |
| `[path/to/file]` | [what it does] | [when to change it] |
| `[path/to/file]` | [what it does] | [when to change it] |

## Data Flow

```
[Visual representation or description of how data flows through the feature]

```

### State Management

- **Local State**: [what's managed locally]
- **Global State**: [what's in global store]
- **Server State**: [what's synchronized with backend]
- **Cache Strategy**: [how data is cached]

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

### [Operation Name]

**Endpoint**: `[METHOD] [path]`

**Purpose**: [what it does]

**Request**:

```json
{
  "field": "type/example"
}

```

**Response**: `[status code]` [description]

**Errors**: `[code]` [condition]

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