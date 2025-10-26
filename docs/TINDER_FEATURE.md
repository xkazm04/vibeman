# Tinder Feature - Quick Idea Evaluation

## Overview

The Tinder feature provides a **Tinder-like swipe interface** for quickly evaluating AI-generated ideas. It replaces the manual goal creation workflow with automatic requirement file generation, enabling rapid idea review and implementation.

## Key Features

### 1. 🎴 Card-Based UI
- **Beautiful card design** showing all idea details
- **Stacked cards** with depth effect (shows next 3 cards)
- **Smooth animations** powered by Framer Motion
- **Gradient overlays** matching app theme (purple/pink)

### 2. 👆 Swipe Gestures
- **Swipe right** → Accept idea (creates requirement file)
- **Swipe left** → Reject idea
- **Visual feedback** with "ACCEPT" / "REJECT" overlays
- **Mobile-friendly** touch gestures

### 3. 🎯 Action Buttons
- **Green button (✓)** - Accept & create requirement
- **Red button (✗)** - Reject idea
- **Gray button (🗑️)** - Delete permanently

### 4. 📊 Real-time Stats
- **Remaining** ideas count
- **Accepted** ideas counter
- **Rejected** ideas counter
- **Deleted** ideas counter

### 5. 🔄 Batch Loading
- **Loads 20 ideas** at a time
- **Auto-loads more** when 5 cards remaining
- **Efficient pagination** to handle hundreds of ideas
- **Seamless experience** with background loading

## Architecture

```
vibeman/src/app/
├── tinder/
│   └── page.tsx                          # Main Tinder page
├── features/tinder/
│   ├── components/
│   │   ├── IdeaCard.tsx                  # Swipeable idea card
│   │   └── ActionButtons.tsx             # Accept/Reject/Delete buttons
│   └── lib/
│       └── tinderApi.ts                  # API client functions
└── api/ideas/tinder/
    ├── route.ts                          # GET - Fetch ideas batch
    ├── accept/route.ts                   # POST - Accept idea
    └── reject/route.ts                   # POST - Reject idea
```

## How It Works

### Workflow

```
1. User navigates to /tinder
   ↓
2. System loads first 20 pending ideas
   ↓
3. User sees top card with idea details
   ↓
4. User swipes or clicks action button
   ↓
5a. Swipe Right / Click Accept:
    - Idea status → "accepted"
    - Requirement file created in .claude/requirements/
    - Card animates away
    - Next card appears
   ↓
5b. Swipe Left / Click Reject:
    - Idea status → "rejected"
    - Card animates away
    - Next card appears
   ↓
5c. Click Delete:
    - Confirms deletion
    - Idea permanently removed
    - Card animates away
    - Next card appears
   ↓
6. When 5 cards remaining, loads next 20 automatically
   ↓
7. Loop continues until all ideas reviewed
```

### Accept Flow (Detailed)

```typescript
User accepts idea
    ↓
API: POST /api/ideas/tinder/accept
    ↓
1. Fetch idea from database
2. Update status to "accepted"
3. Generate requirement filename:
   "idea-<uuid8>-<sanitized-title>.md"
4. Build requirement content with:
   - Title & Metadata
   - Effort & Impact ratings
   - Description & Reasoning
   - Implementation guidelines
5. Create file in .claude/requirements/
6. Return success
    ↓
Frontend: Move to next card
```

## Card Information Display

Each card shows:

```
┌────────────────────────────────────────────┐
│ 🎨  Feature Title                         │
│     ui • category                          │
├────────────────────────────────────────────┤
│ ⚡ Effort: Low    📈 Impact: High         │
│ ✨ Scan: overall                          │
├────────────────────────────────────────────┤
│ Description                                │
│ Lorem ipsum dolor sit amet...             │
├────────────────────────────────────────────┤
│ Reasoning                                  │
│ This is valuable because...               │
├────────────────────────────────────────────┤
│ 🔵 Project Name           📅 01-15        │
└────────────────────────────────────────────┘
```

## API Endpoints

### GET /api/ideas/tinder
Fetch ideas in batches

**Query Parameters:**
- `projectId` (optional) - Filter by project
- `offset` (default: 0) - Pagination offset
- `limit` (default: 20) - Batch size
- `status` (default: pending) - Filter by status

**Response:**
```json
{
  "ideas": [...],
  "hasMore": true,
  "total": 150
}
```

### POST /api/ideas/tinder/accept
Accept idea and create requirement file

**Request:**
```json
{
  "ideaId": "550e8400-e29b-41d4-a716-446655440000",
  "projectPath": "C:/projects/myapp"
}
```

**Response:**
```json
{
  "success": true,
  "requirementName": "idea-550e8400-add-dark-mode",
  "message": "Idea accepted and requirement file created"
}
```

### POST /api/ideas/tinder/reject
Reject an idea

**Request:**
```json
{
  "ideaId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Idea rejected"
}
```

## UI/UX Details

### Colors & Theme

- **Accept**: Green (#22c55e)
- **Reject**: Red (#ef4444)
- **Delete**: Gray (#6b7280)
- **Background**: Gray-900 with purple gradient
- **Cards**: Gray-800/900 with glassmorphism

### Animations

1. **Card Swipe**
   - Rotation: ±15° based on drag
   - Opacity fade on extreme positions
   - Spring physics for natural feel

2. **Card Stack**
   - Scale: 1.0, 0.95, 0.9 for 3 visible cards
   - Y offset: 0px, 10px, 20px
   - Brightness: 100%, 70%, 70%

3. **Button Interactions**
   - Hover: Scale 1.1
   - Tap: Scale 0.9
   - Disabled: Opacity 0.5

### Mobile Responsiveness

- **Touch optimized** drag thresholds
- **Larger buttons** on mobile (48px min)
- **Responsive card size** based on viewport
- **Gesture priority** over click on touch devices

## Comparison: Tinder vs Ideas Page

| Feature | Ideas Page | Tinder Page |
|---------|-----------|-------------|
| **View Style** | Grid/List | Card Stack |
| **Interaction** | Click cards | Swipe/Buttons |
| **Speed** | Moderate | Very Fast |
| **Detail Level** | Full modal | Card view |
| **Workflow** | Select → Modal → Accept → Create Goal | Swipe → Auto-create requirement |
| **Use Case** | Detailed review | Quick evaluation |
| **Mobile UX** | Good | Excellent |

## Performance Optimizations

### 1. Batch Loading
```typescript
const BATCH_SIZE = 20;

// Loads ideas in chunks of 20
fetchIdeasBatch(projectId, offset, BATCH_SIZE);
```

### 2. Pre-loading
```typescript
// Loads next batch when 5 cards remaining
if (currentIndex >= ideas.length - 5) {
  loadMoreIfNeeded();
}
```

### 3. Card Rendering
```typescript
// Only renders 3 cards (current + 2 behind)
ideas.slice(currentIndex, currentIndex + 3).map(...)
```

### 4. AnimatePresence
```typescript
// Efficient enter/exit animations
<AnimatePresence mode="wait">
  {currentCard && <IdeaCard />}
</AnimatePresence>
```

## User Guide

### Getting Started

1. **Navigate** to Tinder page (click "Tinder" in top nav)
2. **Select project** from dropdown (optional)
3. **Review** the top card
4. **Make decision**:
   - Swipe right or click green ✓ to accept
   - Swipe left or click red ✗ to reject
   - Click gray 🗑️ to delete

### Tips

- **Swipe threshold**: Drag at least 150px to trigger action
- **Keyboard shortcuts**: ← and → arrow keys work (if implemented)
- **Undo**: Not available - decisions are final
- **Speed**: Aim for 2-3 seconds per idea for optimal flow

### Best Practices

1. **Filter by project** for focused review
2. **Accept high-impact, low-effort** ideas first
3. **Use reject** instead of delete (preserves history)
4. **Review in batches** of 20-30 for sustained focus
5. **Reset stats** when starting new session

## Integration with Claude Code

### Requirement File Format

When you accept an idea, the system creates:

**File**: `.claude/requirements/idea-<id>-<title>.md`

**Content:**
```markdown
# Feature Title

## Metadata
- Category: functionality
- Effort: Low (1/3)
- Impact: High (3/3)
- Scan Type: overall
- Generated: 2025-01-15 10:30:00
- Accepted via: Tinder UI

## Description
[Idea description]

## Reasoning
[Why this is valuable]

## Implementation Guidelines
1. Code Quality: Follow existing patterns
2. Testing: Add appropriate tests
3. Documentation: Update docs
4. Error Handling: Include edge cases
5. User Experience: Consider accessibility

## Acceptance Criteria
- Fulfill description and reasoning
- Maintain code quality
- Be well-tested and documented
- Follow project conventions

## Notes
Original idea ID: 550e8400-e29b-41d4-a716-446655440000
```

### Next Steps After Accept

1. **Requirement file created** in `.claude/requirements/`
2. **Idea status** changed to "accepted"
3. **Ready for implementation**:
   - Manually execute via Claude page
   - Or use Vibeman automation
   - Or queue with execution system

## Troubleshooting

### Issue: Cards not loading
**Cause**: No pending ideas or API error
**Solution**: Check console, verify ideas exist, check project filter

### Issue: Swipe not working
**Cause**: Drag threshold not met
**Solution**: Swipe at least 150px, or use action buttons

### Issue: Accept fails
**Cause**: Project path not configured
**Solution**: Ensure project has valid path in settings

### Issue: Requirement file not created
**Cause**: .claude folder not initialized
**Solution**: Initialize Claude Code for project first

## Future Enhancements

### Planned Features

1. **Keyboard Shortcuts**
   - ← : Reject
   - → : Accept
   - Delete : Delete
   - Space : Skip

2. **Undo Last Action**
   - Keep history of last 5 actions
   - Allow undo with animation

3. **Filters**
   - Filter by category
   - Filter by effort/impact
   - Filter by scan type

4. **Sorting**
   - Sort by impact/effort ratio
   - Sort by date
   - Custom sort order

5. **Batch Actions**
   - Accept all high-impact/low-effort
   - Reject all low-impact/high-effort
   - Smart suggestions

6. **Analytics**
   - Time per card
   - Acceptance rate by category
   - Most common rejection reasons

## Technical Details

### Dependencies

- **framer-motion**: Card animations and gestures
- **lucide-react**: Icons
- **next**: Routing and API
- **@/app/db**: Database access
- **@/stores**: Zustand state management

### State Management

```typescript
const [ideas, setIdeas] = useState<DbIdea[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [loading, setLoading] = useState(true);
const [processing, setProcessing] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [stats, setStats] = useState({ accepted: 0, rejected: 0, deleted: 0 });
```

### Gesture Detection

```typescript
const handleDragEnd = (_: any, info: PanInfo) => {
  const threshold = 150;

  if (Math.abs(info.offset.x) > threshold) {
    if (info.offset.x > 0) {
      onSwipeRight(); // Accept
    } else {
      onSwipeLeft(); // Reject
    }
  }
};
```

## Security Considerations

1. **Idea ownership**: Only shows ideas user has access to
2. **Project validation**: Verifies project path exists before creating files
3. **File system safety**: Sanitizes filenames, prevents path traversal
4. **Rate limiting**: Could be added for rapid accept/reject
5. **Confirmation**: Delete requires explicit confirmation

---

**The Tinder feature makes idea evaluation 10x faster!** 🚀
