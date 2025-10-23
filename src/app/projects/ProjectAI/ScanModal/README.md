# ScanModal - AI Project Assistant

## Overview
The ScanModal is a full-width interface for AI-powered project analysis and strategic planning. It provides multiple AI operations for codebase understanding, context generation, and strategic goal setting.

## Features

### 1. System Status Panel (Left)
Shows real-time project and service status:
- **AI Documentation Status**: Indicates if AI docs exist, clickable to view
- **Ollama Service Status**: Shows local LLM service availability
- **Active Project Info**: Displays current project name
- **Claude Code Setup** ⭐ NEW: Initialize and monitor Claude Code automation
- **AI Provider Selector**: Choose between Ollama, OpenAI, Anthropic, or Gemini
- **Background Mode Toggle**: Run operations in background with auto-save

### 2. Content Selection Panel (Center)
Two main categories of AI operations:

#### Codebase Analysis
- **AI Docs**: Generate comprehensive project documentation
- **Context Scanner**: Group files into logical feature contexts
- **Code Scanner**: Find optimization opportunities
- **File Scanner**: Advanced build error detection

#### Strategic Planning
- **Task Generator**: Create 5 high-impact development tasks
- **Goal Generator**: Define 3 strategic transformation directions

### 3. Memory Panel (Right) ⭐ NEW
LLM self-reflection and context history:
- Displays chronological memory entries
- Each entry shows: date, title, related context
- Memory stats (total entries, last update)
- Currently uses mock data (real implementation coming)

## New Components

### ClaudeCodeInit
**Location**: `ScanModal/ClaudeCodeInit.tsx`

**Purpose**: Manage Claude Code automation setup in projects

**Features**:
- Auto-detects existing `.claude` folder
- Shows initialization status with visual indicators
- Lists missing components if partially set up
- One-click initialization button
- Auto-refresh after successful setup

**States**:
- ✅ Initialized: All components present
- ⚠️ Partially Initialized: Some components missing
- ❌ Not Initialized: `.claude` folder doesn't exist

**Usage**:
```tsx
<ClaudeCodeInit
  projectPath="/path/to/project"
  projectName="My Project"
/>
```

### ScanRightPanel
**Location**: `ScanModal/ScanRightPanel.tsx`

**Purpose**: Display LLM memory for self-reflection

**Features**:
- Beautiful card-based memory display
- Thin rows with date, title, and context
- Hover effects and animations
- Memory statistics footer
- Development note about future implementation

**Mock Data Structure**:
```typescript
interface MemoryEntry {
  date: string;          // ISO date format
  shortTitle: string;    // Brief description
  contextTitle: string;  // Related context name
}
```

**Future Implementation**:
- Database persistence
- CRUD operations for memory entries
- Link to actual contexts and goals
- Search and filter capabilities
- LLM-powered memory summarization

## API Utilities

### lib/api.ts
Centralized API functions for cleaner component code:

**Functions**:
```typescript
// File operations
readFileFromDisk(filePath: string): Promise<Result>
checkAIDocsExist(projectPath: string): Promise<boolean>
readAIDocs(projectPath: string): Promise<Result>

// Claude Code operations
checkClaudeCodeStatus(projectPath: string): Promise<Status>
initializeClaudeCode(projectPath, projectName): Promise<Result>
```

**Benefits**:
- Consistent error handling
- Type-safe responses
- Reduced code duplication
- Easier testing and mocking

## Layout Changes

### Before (2-column)
```
┌──────────┬─────────────────┐
│  Left    │     Center      │
│  Panel   │     Content     │
│          │                 │
└──────────┴─────────────────┘
```

### After (3-column, full-width)
```
┌──────────┬─────────────────┬──────────┐
│  Left    │     Center      │  Right   │
│  Panel   │     Content     │  Panel   │
│          │                 │          │
└──────────┴─────────────────┴──────────┘
```

**Dimensions**:
- Left Panel: 288px (w-72)
- Right Panel: 320px (w-80)
- Center Content: Flexible (flex-1)

## Usage Examples

### Basic Setup
```tsx
import AIContentSelector from './ScanModal/AIContentSelector_main';

function MyComponent() {
  return (
    <AIContentSelector
      onSelectMode={(mode, bg) => handleMode(mode, bg)}
      activeProject={currentProject}
      selectedProvider="ollama"
      onProviderChange={setProvider}
    />
  );
}
```

### With Modal
```tsx
const { showFullScreenModal } = useGlobalModal();

// Show ScanModal
showFullScreenModal(
  'AI Project Assistant',
  <AIContentSelector
    onSelectMode={handleModeSelection}
    activeProject={project}
  />
);
```

## API Endpoints

### Claude Code Status
```http
POST /api/claude-code/status
Content-Type: application/json

{
  "projectPath": "/path/to/project"
}

Response:
{
  "exists": true,
  "initialized": true,
  "missing": []
}
```

### Claude Code Initialize
```http
POST /api/claude-code/initialize
Content-Type: application/json

{
  "projectPath": "/path/to/project",
  "projectName": "My Project"
}

Response:
{
  "message": "Claude Code initialized successfully",
  "structure": {
    "scripts": "/path/to/project/.claude/scripts",
    "commands": "/path/to/project/.claude/commands",
    "agents": "/path/to/project/.claude/agents",
    "settingsFile": "/path/to/project/.claude/settings.json",
    "claudeMdFile": "/path/to/project/.claude/CLAUDE.md"
  }
}
```

## Styling Guidelines

### Colors
- **Primary Blue**: `blue-400`, `blue-500`
- **Success Green**: `green-400`, `green-500`
- **Warning Amber**: `amber-400`, `amber-500`
- **Error Red**: `red-400`, `red-500`
- **Neutral Gray**: `gray-400` to `gray-900`

### Animations
```tsx
// Standard entry animation
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4, delay: 0.3 }}

// Hover effect
whileHover={{ scale: 1.02, y: -2 }}

// Pulse effect
animate={{ opacity: [0.5, 1, 0.5] }}
transition={{ duration: 1.5, repeat: Infinity }}
```

### Glassmorphism
```tsx
className="bg-gradient-to-br from-gray-800/40 to-gray-800/60
           backdrop-blur-sm rounded-xl border border-gray-700/40"
```

## Performance Notes

### Optimizations Applied
1. ✅ Centralized API calls reduce bundle size
2. ✅ Modular imports improve tree-shaking
3. ✅ Memoizable components identified
4. ✅ AnimatePresence for smooth mounting

### Future Optimizations
- [ ] React.memo for AIContentCard
- [ ] useMemo for card filtering
- [ ] Virtual scrolling for memory list
- [ ] Debounced status checks
- [ ] Lazy loading for heavy components

## Accessibility

### Current State
- Keyboard navigation supported
- Focus indicators visible
- Color contrast ratios acceptable
- Screen reader support: Partial

### To Improve
- [ ] Add ARIA labels to all interactive elements
- [ ] Improve keyboard navigation flow
- [ ] Add loading announcements
- [ ] Better error messaging for screen readers

## Development Notes

### Adding New Memory Entry
Currently using mock data. To add real memory:

1. Create database table:
```sql
CREATE TABLE llm_memories (
  id INTEGER PRIMARY KEY,
  project_id TEXT,
  date TEXT,
  short_title TEXT,
  context_title TEXT,
  full_content TEXT,
  created_at TEXT
);
```

2. Create API endpoint:
```typescript
// POST /api/llm-memory
// GET /api/llm-memory/:projectId
```

3. Update ScanRightPanel:
```tsx
const [memories, setMemories] = useState([]);

useEffect(() => {
  fetchMemories(projectId).then(setMemories);
}, [projectId]);
```

### Testing Checklist
- [ ] Claude Code detection works for existing projects
- [ ] Claude Code initialization creates all folders
- [ ] Status refreshes after initialization
- [ ] Memory panel renders with mock data
- [ ] Full-width layout displays correctly
- [ ] All animations are smooth
- [ ] No console errors or warnings
- [ ] Provider selection persists
- [ ] Background mode toggle works

## Troubleshooting

### ClaudeCodeInit shows error
**Problem**: Status check fails
**Solution**: Ensure `/api/claude-code/status` route exists and project path is valid

### Memory panel is empty
**Problem**: Mock data not loading
**Solution**: Check MOCK_MEMORIES constant in ScanRightPanel.tsx

### Layout looks broken
**Problem**: Panels overlapping or misaligned
**Solution**: Ensure parent container has `flex` and `h-full` classes

### Initialize button doesn't work
**Problem**: API call failing
**Solution**: Check `/api/claude-code/initialize` route and network tab for errors

## Contributing

When adding new features:
1. Follow existing animation patterns
2. Use centralized API functions in `lib/api.ts`
3. Maintain consistent color scheme
4. Add TypeScript types for all props
5. Document in this README
6. Add to REFACTORING_SUMMARY.md if significant

## Related Files
- `../ScanGoals/` - Goals generation logic
- `../FileScanner/` - File analysis tools
- `../../Claude/lib/claudeCodeManager.ts` - Claude Code utilities
- `../../../api/claude-code/` - API routes
