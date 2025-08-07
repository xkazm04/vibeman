You are tasked with creating or updating a `feature_context.md` file that documents a software feature. This file serves as both human documentation and machine-readable context for AI assistants.

## Instructions

### General Guidelines

1. **Be concise and accurate** - Focus on essential information that helps understand the feature
2. **Leave sections empty if not applicable** - Use `[Not applicable]` or omit subsections entirely if they don't apply
3. **Use real paths and names** - Replace all placeholders `[bracketed items]` with actual values
4. **Keep technical accuracy** - Ensure all code examples, types, and endpoints are correct
5. **Always update the log** - Add an entry to the Update Log section for any changes made

### Section-Specific Instructions

### Core Functionality

- Write 2-3 clear sentences maximum
- First sentence: What the feature does
- Second sentence: How it integrates with the system
- Third sentence (optional): Key benefit or unique aspect

### Architecture → Location Map

- Show only directories that actually contain feature files
- Use tree format with actual file names
- Include only relevant subdirectories
- If files are scattered, show the main locations

### Architecture → Key Files

- List only the 3-5 most important files
- Use actual relative paths from project root
- Be specific about when modifications are needed
- Format as a proper markdown table

### Data Flow

- Can be a simple text description OR ASCII diagram
- Focus on the main path, not edge cases
- If no complex flow exists, write "Simple request-response pattern" or similar

### State Management

- Only include types that are actually used
- If stateless, note that explicitly
- Use `N/A` for unused state types

### Data Models → Primary Schema

- Include only the main interface/type
- Use actual TypeScript/language syntax
- Show only essential fields
- Add comments only for non-obvious fields

### Data Models → Database

- List actual table/collection names
- Only mention indexes that exist and matter for performance
- Skip if using external API only

### Business Rules

- Include only non-obvious rules
- Focus on what would surprise a new developer
- If standard CRUD with no special rules, write "Standard CRUD operations"

### API Specifications

- Document 1-3 most important endpoints only
- Use actual endpoints from the code
- Show realistic request/response examples
- Include most common error codes

### Update Log

- **ALWAYS add an entry when making changes**
- Format: `YYYY-MM-DD | [Your identifier/Model name] | Brief description of changes`
- List newest entries first
- Keep to one line per entry

### Notes for LLM/Developer

- Include only critical warnings or non-obvious patterns
- Mention any technical debt or planned refactoring
- Note any naming conventions specific to this feature

### Example of Good vs Bad Filling

**BAD (too vague):**

```markdown
## Core Functionality
This feature handles users and does various user-related things in the system.

```

**GOOD (specific):**

```markdown
## Core Functionality
Manages user authentication and session management using JWT tokens. Integrates with the main API gateway to validate requests and maintains user sessions in Redis cache.

```

**BAD (placeholder not replaced):**

```markdown
### Key Files
| File | Purpose | Modify When |
| `[path/to/file]` | [what it does] | [when to change it] |

```

**GOOD (actual values):**

```markdown
### Key Files
| File | Purpose | Modify When |
| `src/auth/jwt.service.ts` | JWT token generation and validation | Adding new token claims or changing expiry |
| `src/auth/auth.guard.ts` | Route protection middleware | Changing authorization logic |

```

### Minimal Feature Example

For simple features, your output might look like:

```markdown
# Feature Context: Health Check
file: feature_context.md

## Core Functionality
Provides system health status endpoint for monitoring. Returns service status, database connectivity, and response time metrics.

## Architecture
### Location Map

```

src/
└── api/
└── health/
└── health.controller.ts

```

### Key Files
| File | Purpose | Modify When |
| `src/api/health/health.controller.ts` | Health check endpoint | Adding new service checks |

## Data Flow
Simple request-response pattern - GET request returns current system status.

## State Management
* **Local State**: N/A
* **Global State**: N/A
* **Server State**: Real-time system metrics
* **Cache Strategy**: No caching - always return current status

## Data Models
[Not applicable - returns simple status object]

## Business Rules
### Validation Rules
* Response time must be under 5 seconds to be considered healthy

### Access Control
* **Public**: Health endpoint is publicly accessible

## API Specifications
### Health Check
**Endpoint**: `GET /health`
**Purpose**: Monitor system availability
**Response**: `200` System status object
**Errors**: `503` Service unavailable

## Update Log
| Date       | Author | Changes                       |
| ---------- | ------ | ----------------------------- |
| 2024-03-15 | Claude | Initial documentation created |

## Notes for LLM/Developer
Health endpoint should never include sensitive system details in response.

```

### Output Format

1. Provide the complete filled template as a markdown code block
2. Below the template, add a brief summary of what was documented and any sections that were intentionally left empty

Remember: The goal is to create useful documentation, not to fill every field. Quality over quantity.