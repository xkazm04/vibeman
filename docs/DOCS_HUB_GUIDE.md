# Documentation Hub Guide

## Overview

The Documentation Hub is an AI-powered system that automatically generates and maintains comprehensive project documentation by analyzing your codebase, database schema, API endpoints, and context metadata.

## Features

- **Auto-Generated Documentation**: Uses LLM to create professional documentation from your project
- **Multiple Sections**: Overview, Architecture, API Reference, Database Schema, and Components
- **Smart Syncing**: Automatically updates stale documentation
- **Git Integration**: Optional post-commit hooks to trigger documentation updates
- **Markdown Export**: Download all documentation as a single markdown file
- **Real-time Updates**: Regenerate specific sections on-demand

## Usage

### Accessing the Docs Hub

1. Navigate to the top navigation bar
2. Click on "Docs" to open the Documentation Hub
3. Select a project from your active project list

### Generating Documentation

1. Click "Generate Docs" button
2. The system will analyze:
   - Project README and CLAUDE.md
   - Database schema from `src/app/db/schema.ts`
   - API endpoints from `src/app/api/`
   - Code contexts and goals
   - Existing documentation files

3. Documentation sections are created:
   - **Overview**: High-level project description and features
   - **Architecture**: System components and design patterns
   - **API Reference**: Endpoint documentation
   - **Database Schema**: Table structures and relationships
   - **Components**: UI components and utilities

### Regenerating Documentation

- **Regenerate All**: Click "Regenerate All" to update all sections
- **Regenerate Section**: Click "Regenerate" on a specific section card

### Exporting Documentation

Click "Export MD" to download all documentation as a single markdown file.

## Git Integration (Optional)

### Automatic Sync on Commit

To automatically sync documentation after each git commit:

1. **Copy the hook script**:
   ```bash
   cp scripts/git-hooks/post-commit-docs-sync.sh .git/hooks/post-commit
   chmod +x .git/hooks/post-commit
   ```

2. **Configure the hook**:
   Edit `.git/hooks/post-commit` and set:
   - `PROJECT_ID`: Your project's UUID
   - `API_URL`: Your local server URL (default: http://localhost:3000)

3. **Test the hook**:
   ```bash
   git commit -m "Test commit"
   ```

The documentation will be synced in the background after each commit.

### Manual Sync API

You can also trigger sync manually via API:

```bash
curl -X POST http://localhost:3000/api/docs/sync-on-commit \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "projectPath": "/path/to/project",
    "projectName": "Your Project"
  }'
```

## API Endpoints

### GET /api/docs
Get all documentation for a project.

**Query Parameters**:
- `projectId` (required): Project UUID
- `sectionType` (optional): Filter by section type

### POST /api/docs/generate
Generate new documentation.

**Body**:
```json
{
  "projectId": "uuid",
  "projectPath": "/path/to/project",
  "projectName": "Project Name",
  "sectionTypes": ["overview", "architecture", "api", "database", "components"],
  "provider": "gemini",
  "model": "gemini-flash-latest"
}
```

### PUT /api/docs/generate
Regenerate a specific documentation section.

**Body**:
```json
{
  "docId": "doc-uuid",
  "projectId": "project-uuid",
  "projectPath": "/path/to/project",
  "projectName": "Project Name"
}
```

### POST /api/docs/sync
Sync stale documentation (older than specified minutes).

**Body**:
```json
{
  "projectId": "uuid",
  "projectPath": "/path/to/project",
  "projectName": "Project Name",
  "minutesOld": 60
}
```

### DELETE /api/docs
Delete documentation.

**Query Parameters**:
- `docId` (optional): Delete specific doc
- `projectId` (optional): Delete all docs for project

## Database Schema

### documentation Table

```sql
CREATE TABLE documentation (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('overview', 'architecture', 'api', 'database', 'components', 'custom')),
  auto_generated INTEGER DEFAULT 1,
  source_metadata TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## LLM Provider Configuration

The Docs Hub uses the same LLM configuration as other parts of Vibeman:

- **Gemini** (default): Fast and cost-effective
- **OpenAI**: GPT-4o for high-quality documentation
- **Anthropic**: Claude for detailed technical writing
- **Ollama**: Local models for privacy

Configure providers in the project settings.

## Best Practices

1. **Regular Updates**: Run "Regenerate All" after major code changes
2. **Manual Review**: Always review auto-generated docs for accuracy
3. **Context Groups**: Organize code contexts for better documentation
4. **Custom Sections**: Add custom documentation for project-specific needs
5. **Git Hooks**: Enable post-commit sync for continuous documentation

## Troubleshooting

### Documentation Generation Fails

- Check that project path is correct
- Verify LLM provider is configured
- Ensure sufficient API credits/quota
- Check console logs for detailed errors

### Stale Documentation

- Use "Regenerate All" to force update
- Check `last_sync_at` timestamp
- Adjust sync threshold in settings

### Git Hook Not Working

- Verify hook file has execute permissions: `chmod +x .git/hooks/post-commit`
- Check that server is running on correct port
- Review project ID in hook script

## Integration with Annette Voicebot

The Documentation Hub feeds data to Annette AI for enhanced insights:

- Annette can query documentation via LangGraph tools
- Documentation context improves response accuracy
- Auto-generated docs provide up-to-date project knowledge

## Future Enhancements

- **Versioned Documentation**: Track documentation changes over time
- **Collaborative Editing**: Allow manual edits alongside auto-generation
- **Multi-format Export**: PDF, HTML, and other formats
- **Documentation Diff**: Compare documentation versions
- **AI Suggestions**: Recommend documentation improvements
