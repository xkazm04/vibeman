# RepoSync Component Architecture

A modular, premium UI/UX component system for repository synchronization with vector databases.

## 📁 File Structure

```
RepoSync/
├── README.md              # This documentation
├── index.ts               # Barrel exports for clean imports
├── types.ts               # TypeScript interfaces and types
├── variants.ts            # Framer Motion animation variants
├── functions.ts           # API calls and utility functions
├── SyncStatusCard.tsx     # System health monitoring component
├── SyncControls.tsx       # Sync controls and statistics
└── SyncRepoList.tsx       # Repository list with sync management
```

## 🎯 Component Overview

### **Main Component: RepoSync.tsx**
The orchestrator component that manages state and coordinates all sub-components.

### **SyncStatusCard.tsx**
- **Purpose**: Displays system health status for Qdrant, OpenAI, and overall system
- **Features**: Real-time status indicators, animated health checks, refresh functionality
- **Props**: `healthStatus`, `onRefresh`

### **SyncControls.tsx**
- **Purpose**: Quick actions panel with sync-all functionality and statistics
- **Features**: Batch operations, live statistics, status messages
- **Props**: `repositories`, `activeSyncs`, `syncStatuses`, `healthStatus`, `onSyncAll`

### **SyncRepoList.tsx**
- **Purpose**: Individual repository management with sync controls
- **Features**: Progress tracking, status indicators, error handling, animations
- **Props**: `repositories`, `syncStatuses`, `activeSyncs`, `healthStatus`, `onStartSync`

## 🔧 Utility Files

### **types.ts**
Comprehensive TypeScript interfaces:
- `Repository`: Repository metadata
- `SyncStatus`: Sync operation status and progress
- `HealthStatus`: System health information
- `SyncResult`: API response structure
- `SyncState`: Complete application state

### **variants.ts**
Framer Motion animation configurations:
- `containerVariants`: Page-level animations
- `itemVariants`: Individual item animations
- `cardVariants`: Card hover and entrance effects
- `pulseVariants`: Pulsing animations for active elements
- `progressVariants`: Progress bar animations
- `slideInVariants`: List item entrance animations
- `fadeVariants`: Fade in/out transitions

### **functions.ts**
API and utility functions:
- **API Functions**: `checkHealthAPI`, `loadRepositoriesAPI`, `startSyncAPI`, etc.
- **Helper Functions**: `getStatusText`, `getProgressPercent`, `formatDuration`
- **Polling**: `createPollingFunction` for real-time status updates

## 🚀 Usage Examples

### Basic Implementation
```tsx
import RepositorySync from './cursor/RepoSync';

export default function SyncPage() {
  return <RepositorySync />;
}
```

### Using Individual Components
```tsx
import { SyncStatusCard, SyncControls } from './cursor/RepoSync';
import { HealthStatus } from './cursor/RepoSync/types';

function CustomSyncInterface() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  
  return (
    <div>
      <SyncStatusCard 
        healthStatus={healthStatus}
        onRefresh={() => checkHealth()}
      />
      <SyncControls 
        repositories={repositories}
        activeSyncs={activeSyncs}
        syncStatuses={syncStatuses}
        healthStatus={healthStatus}
        onSyncAll={handleSyncAll}
      />
    </div>
  );
}
```

### Custom Animation Variants
```tsx
import { motion } from 'framer-motion';
import { cardVariants, itemVariants } from './cursor/RepoSync/variants';

function CustomCard() {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <motion.div variants={itemVariants}>
        Content here
      </motion.div>
    </motion.div>
  );
}
```

## 🎨 Design System

### **Color Palette**
- **Primary**: Indigo (500-600) to Purple (500-600) gradients
- **Success**: Emerald (500-600) to Teal (500-600)
- **Warning**: Amber (500-600)
- **Error**: Red (500-600) to Pink (500-600)
- **Neutral**: Slate (50-900)

### **Animation Principles**
- **Spring Physics**: Natural, bouncy animations using Framer Motion springs
- **Staggered Entrances**: Sequential item animations for visual hierarchy
- **Micro-interactions**: Hover states, button presses, and status changes
- **Reduced Motion**: Respects user accessibility preferences

### **Typography**
- **Headers**: Bold weights with gradient text effects
- **Body**: Medium weights for readability
- **Code**: Monospace fonts for paths and technical data
- **Status**: Small, medium-weight text with color coding

## 🔄 State Management

### **Local State**
- `repositories`: Array of repository configurations
- `syncStatuses`: Map of repository names to sync status
- `activeSyncs`: Set of currently syncing repositories
- `healthStatus`: System health information
- `isInitializing`: Loading state flag

### **State Flow**
1. **Initialization**: Load repositories and check system health
2. **Health Monitoring**: Periodic health checks with visual feedback
3. **Sync Operations**: Individual or batch repository synchronization
4. **Status Polling**: Real-time progress updates via polling
5. **Error Handling**: Graceful error recovery and user feedback

## 🛠 API Integration

### **Endpoints**
- `GET /api/repo-sync?action=health` - System health check
- `GET /api/repo-sync?action=repositories` - Repository list
- `POST /api/repo-sync` - Start sync operations
- `GET /api/repo-sync?action=status&sync_id={id}` - Sync status polling

### **Error Handling**
- Network failures with retry mechanisms
- API errors with user-friendly messages
- Timeout handling for long-running operations
- Graceful degradation when services are unavailable

## 🎯 Performance Optimizations

### **React Optimizations**
- `useCallback` for function memoization
- Efficient state updates with functional setters
- Minimal re-renders through proper dependency arrays

### **Animation Performance**
- Hardware-accelerated transforms
- 60fps animations with optimized easing
- Reduced motion support for accessibility
- Efficient AnimatePresence usage

### **Memory Management**
- Cleanup of polling intervals
- Proper component unmounting
- Efficient Map and Set operations for state

## 🧪 Testing Considerations

### **Component Testing**
- Individual component isolation
- Props validation and edge cases
- Animation state testing
- Error boundary testing

### **Integration Testing**
- API integration with mock responses
- State management across components
- User interaction flows
- Real-time polling behavior

## 📱 Responsive Design

### **Breakpoints**
- **Mobile**: Single column layout, stacked components
- **Tablet**: Two-column grids, optimized touch targets
- **Desktop**: Full three-column layouts, hover interactions

### **Accessibility**
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

## 🔮 Future Enhancements

### **Potential Features**
- WebSocket integration for real-time updates
- Drag-and-drop repository reordering
- Advanced filtering and search
- Export/import configuration
- Dark mode theme support
- Internationalization (i18n)

### **Performance Improvements**
- Virtual scrolling for large repository lists
- Background sync with service workers
- Optimistic UI updates
- Caching strategies for API responses

---

This modular architecture provides a solid foundation for building scalable, maintainable repository synchronization interfaces with premium user experience and developer-friendly APIs.