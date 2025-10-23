# ProjectAI Architecture

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI Content Selector (Full Width)                    │
├──────────────┬────────────────────────────────────────────┬─────────────────┤
│              │                                            │                 │
│  Left Panel  │         Center Content Area                │  Right Panel    │
│   (w-72)     │           (flex-1)                         │    (w-80)       │
│              │                                            │                 │
│ ┌──────────┐ │  ┌──────────────────────────────────┐     │ ┌─────────────┐ │
│ │ System   │ │  │                                  │     │ │ LLM Memory  │ │
│ │ Status   │ │  │    Codebase Analysis Section     │     │ │             │ │
│ │          │ │  │                                  │     │ │ ┌─────────┐ │ │
│ │ • AI Docs│ │  │  ┌────────┐  ┌────────┐         │     │ │ │ Memory  │ │ │
│ │ • Ollama │ │  │  │  Docs  │  │Context │         │     │ │ │ Entry 1 │ │ │
│ │ • Project│ │  │  │  Card  │  │  Card  │         │     │ │ └─────────┘ │ │
│ └──────────┘ │  │  └────────┘  └────────┘         │     │ │             │ │
│              │  │                                  │     │ │ ┌─────────┐ │ │
│ ┌──────────┐ │  │  ┌────────┐  ┌────────┐         │     │ │ │ Memory  │ │ │
│ │ Claude   │ │  │  │  Code  │  │  File  │         │     │ │ │ Entry 2 │ │ │
│ │ Code     │ │  │  │ Scanner│  │Scanner │         │     │ │ └─────────┘ │ │
│ │ Status   │ │  │  └────────┘  └────────┘         │     │ │             │ │
│ │          │ │  │                                  │     │ │ ┌─────────┐ │ │
│ │[Init Btn]│ │  └──────────────────────────────────┘     │ │ │ Memory  │ │ │
│ └──────────┘ │                                            │ │ │ Entry 3 │ │ │
│              │  ┌──────────────────────────────────┐     │ │ └─────────┘ │ │
│ ┌──────────┐ │  │                                  │     │ │             │ │
│ │ AI       │ │  │   Strategic Planning Section     │     │ │ ┌─────────┐ │ │
│ │ Provider │ │  │                                  │     │ │ │ Memory  │ │ │
│ │          │ │  │  ┌────────┐  ┌────────┐         │     │ │ │  Stats  │ │ │
│ │ Selector │ │  │  │  Task  │  │  Goal  │         │     │ │ └─────────┘ │ │
│ └──────────┘ │  │  │  Gen   │  │  Gen   │         │     │ └─────────────┘ │
│              │  │  └────────┘  └────────┘         │     │                 │
│ ┌──────────┐ │  │                                  │     │                 │
│ │Background│ │  └──────────────────────────────────┘     │                 │
│ │  Mode    │ │                                            │                 │
│ └──────────┘ │                                            │                 │
│              │                                            │                 │
└──────────────┴────────────────────────────────────────────┴─────────────────┘
```

## Component Tree

```
AIContentSelector_main
├── AILeftPanel
│   ├── System Status Section
│   │   ├── AI Documentation Status (clickable if exists)
│   │   ├── Ollama Service Status
│   │   └── Active Project Info
│   ├── ClaudeCodeInit ⭐ NEW
│   │   ├── Status Display
│   │   ├── Missing Components List
│   │   └── Initialize Button
│   ├── LLM Provider Selector
│   └── Background Task Toggle
│
├── AIScanSelection (Center)
│   ├── Codebase Analysis Section
│   │   ├── AIContentCard (AI Docs)
│   │   ├── AIContentCard (Context Scanner)
│   │   ├── AIContentCard (Code Scanner)
│   │   └── AIContentCard (File Scanner)
│   └── Strategic Planning Section
│       ├── AIContentCard (Task Generator)
│       └── AIContentCard (Goal Generator)
│
└── ScanRightPanel ⭐ NEW
    ├── Header (Brain Icon)
    ├── Memory Entries List
    │   ├── Memory Entry 1 (hardcoded)
    │   ├── Memory Entry 2 (hardcoded)
    │   └── Memory Entry 3 (hardcoded)
    ├── Memory Stats Footer
    └── Dev Note Banner
```

## Data Flow

### Claude Code Initialization Flow
```
User clicks "Initialize Claude Code"
         ↓
ClaudeCodeInit component
         ↓
API: POST /api/claude-code/initialize
         ↓
claudeCodeManager.initializeClaudeFolder()
         ↓
Creates folder structure:
  .claude/
  ├── scripts/
  ├── commands/
  ├── agents/
  ├── settings.json
  └── CLAUDE.md
         ↓
Returns success + structure
         ↓
ClaudeCodeInit refreshes status
         ↓
Displays "Ready for automation"
```

### Goals Generation Flow (Refactored)
```
User selects "Goal Generator"
         ↓
generateGoals() function
         ↓
├── Read AI Docs (utils.ts)
├── Read Template (utils.ts)
├── Get Existing Goals (database)
├── Build Sections (sectionBuilders.ts)
│   ├── buildAnalysisSection()
│   ├── buildExistingGoalsSection()
│   └── buildAIDocsSection()
└── Build Prompt (prompts.ts)
         ↓
Send to LLM via generateWithLLM()
         ↓
Return JSON goals
```

## File Organization

### ScanModal Module
```
ScanModal/
├── lib/
│   └── api.ts              # API utilities
├── ClaudeCodeInit.tsx      # Claude Code setup
├── ScanRightPanel.tsx      # Memory panel
├── AILeftPanel.tsx         # Left sidebar
├── AIContentSelector_main.tsx  # Main container
├── AIScanSelection.tsx     # Center content
├── AIContentCard.tsx       # Card component
└── aiContentConfig.ts      # Card configurations
```

### ScanGoals Module
```
ScanGoals/
├── lib/
│   ├── prompts.ts          # LLM prompts
│   ├── sectionBuilders.ts  # Section builders
│   └── utils.ts            # File I/O utilities
├── generateGoals.ts        # Main generation logic
└── GoalResultDisplay.tsx   # Display component
```

## API Endpoints

### New Endpoints
- `POST /api/claude-code/status` - Check Claude Code initialization status
- `POST /api/claude-code/initialize` - Initialize Claude Code folder

### Existing Endpoints (used)
- `POST /api/disk/read-file` - Read files from disk (used by api.ts)

## State Management

### Component State
- `AIContentSelector_main`
  - `backgroundTask: boolean` - Background mode toggle
  - `aiDocsExist: boolean` - AI docs availability
  - `checkingDocs: boolean` - Loading state
  - `showFileScanner: boolean` - Modal visibility
  - `selectedProvider: SupportedProvider` - LLM provider

- `ClaudeCodeInit`
  - `status: object` - Claude Code folder status
  - `initializing: boolean` - Initialization in progress

- `ScanRightPanel`
  - `memories: MemoryEntry[]` - Memory entries (hardcoded for now)

## Styling & Animations

### Color Scheme
- Primary: Blue (#3B82F6)
- Secondary: Purple/Red gradients
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)

### Animation Patterns
1. **Entry animations**: `initial={{ opacity: 0, y: 20 }}`
2. **Hover effects**: `whileHover={{ scale: 1.02 }}`
3. **Pulse animations**: For status indicators
4. **Gradient flows**: For headers and borders
5. **Particle effects**: Floating dots in backgrounds

### Layout Breakpoints
- Left Panel: Fixed 288px (18rem)
- Right Panel: Fixed 320px (20rem)
- Center: Fluid (flex-1)
- Mobile: Not yet responsive (future enhancement)

## Performance Considerations

### Optimizations
1. ✅ Centralized API calls (reduce duplication)
2. ✅ Code splitting by feature (lib folders)
3. ✅ Lazy loading potential (AnimatePresence)
4. ✅ Memoization candidates identified
5. ✅ Reduced bundle size through modularization

### Future Optimizations
- [ ] React.memo for expensive components
- [ ] useMemo for computed values
- [ ] useCallback for event handlers
- [ ] Virtual scrolling for memory list (when real data)
- [ ] Debounce for status checks

## Testing Strategy

### Unit Tests (To Be Added)
- `lib/api.ts` - API function mocking
- `lib/sectionBuilders.ts` - Section generation logic
- `lib/prompts.ts` - Prompt construction
- `lib/utils.ts` - File I/O mocking

### Integration Tests (To Be Added)
- ClaudeCodeInit component workflow
- Goals generation end-to-end
- API route handlers

### E2E Tests (To Be Added)
- Full ScanModal interaction flow
- Claude Code initialization flow
- Goals generation and display
