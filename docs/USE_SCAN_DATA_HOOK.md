# useScanData Hook Documentation

## Overview

The `useScanData` hook provides a clean, reusable interface for fetching scan data from the API with built-in pagination, caching, and error handling. This hook decouples UI components from the database implementation, making it easier to swap persistence strategies in the future.

## Features

- **Pagination Support**: Built-in offset-based pagination with `loadMore()` functionality
- **Intelligent Caching**: 5-minute TTL cache to reduce unnecessary API calls
- **Error Handling**: Comprehensive error states with retry capability
- **Loading States**: Loading indicators for initial load and pagination
- **Filter Support**: Filter by project ID and scan type
- **Cache Invalidation**: Manual cache clearing and project-specific invalidation
- **TypeScript Support**: Full type safety with TypeScript interfaces

## Installation

The hook is located at `src/hooks/useScanData.ts` and requires no additional dependencies beyond the project's existing setup.

## Basic Usage

```tsx
import { useScanData } from '@/hooks/useScanData';

function MyComponent() {
  const { scans, loading, error, refresh } = useScanData(
    { projectId: 'project-123' },
    { limit: 20 }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {scans.map(scan => (
        <div key={scan.id}>{scan.scan_type}</div>
      ))}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

## API Reference

### Hook Signature

```typescript
function useScanData(
  filters: ScanFilterConfig,
  paginationConfig?: ScanPaginationConfig
): UseScanDataResult
```

### Parameters

#### `filters: ScanFilterConfig`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID to filter scans |
| `scanType` | `string` | No | Filter by specific scan type |

#### `paginationConfig: ScanPaginationConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `limit` | `number` | `20` | Number of items per page |
| `offset` | `number` | `0` | Initial offset (managed internally) |

### Return Value: `UseScanDataResult`

| Property | Type | Description |
|----------|------|-------------|
| `scans` | `DbScan[]` | Array of scan objects |
| `loading` | `boolean` | Loading state indicator |
| `error` | `string \| null` | Error message if fetch failed |
| `pagination` | `PaginationInfo` | Pagination metadata |
| `refresh` | `() => Promise<void>` | Refresh data (bypass cache) |
| `loadMore` | `() => Promise<void>` | Load next page of results |
| `setFilters` | `(filters) => void` | Update filter criteria |

#### `pagination: PaginationInfo`

| Property | Type | Description |
|----------|------|-------------|
| `total` | `number` | Total number of scans |
| `offset` | `number` | Current offset position |
| `limit` | `number` | Items per page |
| `hasMore` | `boolean` | Whether more pages are available |

## Advanced Examples

### Pagination with Load More

```tsx
function ScanList({ projectId }: { projectId: string }) {
  const { scans, loading, pagination, loadMore } = useScanData(
    { projectId },
    { limit: 10 }
  );

  return (
    <div>
      {scans.map(scan => <ScanCard key={scan.id} scan={scan} />)}

      {pagination.hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}

      <p>Showing {scans.length} of {pagination.total}</p>
    </div>
  );
}
```

### Filter by Scan Type

```tsx
function FilteredScans({ projectId }: { projectId: string }) {
  const [scanType, setScanType] = useState<string | undefined>();

  const { scans, loading, error } = useScanData(
    { projectId, scanType },
    { limit: 20 }
  );

  return (
    <div>
      <select
        value={scanType || ''}
        onChange={(e) => setScanType(e.target.value || undefined)}
      >
        <option value="">All Types</option>
        <option value="zen_architect">Zen Architect</option>
        <option value="code_review">Code Review</option>
      </select>

      {loading && <Spinner />}
      {error && <Error message={error} />}
      {scans.map(scan => <ScanCard key={scan.id} scan={scan} />)}
    </div>
  );
}
```

### Error Handling with Retry

```tsx
function RobustScanList({ projectId }: { projectId: string }) {
  const { scans, loading, error, refresh } = useScanData(
    { projectId },
    { limit: 20 }
  );

  if (error) {
    return (
      <div className="error-state">
        <p>Failed to load scans: {error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (loading && scans.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {scans.map(scan => <ScanCard key={scan.id} scan={scan} />)}
    </div>
  );
}
```

### Manual Cache Management

```tsx
import { useScanData, invalidateScanDataCache, clearScanDataCache } from '@/hooks/useScanData';

function ScanManager({ projectId }: { projectId: string }) {
  const { scans, refresh } = useScanData({ projectId });

  const handleScanComplete = async () => {
    // After creating a new scan, invalidate the cache
    invalidateScanDataCache(projectId);
    await refresh();
  };

  const handleClearAllCache = () => {
    clearScanDataCache();
    refresh();
  };

  return (
    <div>
      {/* Component UI */}
      <button onClick={handleScanComplete}>Run New Scan</button>
      <button onClick={handleClearAllCache}>Clear All Cache</button>
    </div>
  );
}
```

## Caching Behavior

### Cache Key Structure

The cache uses a composite key based on:
- Project ID
- Scan Type (or 'all')
- Offset
- Limit

Example: `"project-123:zen_architect:0:20"`

### Cache Lifetime

- **TTL**: 5 minutes (300,000ms)
- Automatically cleaned on read if expired
- Can be manually invalidated

### Cache Invalidation

```typescript
// Clear entire cache
clearScanDataCache();

// Clear cache for specific project
invalidateScanDataCache('project-123');

// Bypass cache on fetch
const { refresh } = useScanData({ projectId });
refresh(); // Forces fresh fetch
```

## Best Practices

### 1. Use Consistent Page Sizes

```tsx
// ✅ Good: Consistent page size
const { scans } = useScanData({ projectId }, { limit: 20 });

// ❌ Avoid: Changing page size dynamically
const [limit, setLimit] = useState(20);
const { scans } = useScanData({ projectId }, { limit }); // Causes cache misses
```

### 2. Handle Loading States Properly

```tsx
// ✅ Good: Differentiate initial load from pagination
if (loading && scans.length === 0) {
  return <InitialLoader />;
}

return (
  <div>
    {scans.map(scan => <ScanCard key={scan.id} scan={scan} />)}
    {loading && <PaginationLoader />}
  </div>
);
```

### 3. Invalidate Cache After Mutations

```tsx
// ✅ Good: Invalidate cache after creating/updating scans
const handleCreateScan = async () => {
  await createScan(data);
  invalidateScanDataCache(projectId);
  refresh();
};
```

### 4. Error Handling

```tsx
// ✅ Good: Provide user-friendly error UI with retry
if (error) {
  return (
    <ErrorBoundary
      error={error}
      onRetry={refresh}
      fallback={<DefaultError />}
    />
  );
}
```

## Performance Considerations

### Cache Efficiency

The hook implements a simple in-memory cache with:
- **O(1)** cache lookups using Map
- Automatic expiration cleanup
- Project-level invalidation

### Network Optimization

- Initial render uses cache if available
- `refresh()` bypasses cache for fresh data
- Pagination appends to existing data without refetch

### Memory Management

- Cache entries are automatically cleaned on expiry
- Manual cache clearing available
- Scoped invalidation prevents unnecessary clears

## Type Definitions

```typescript
interface ScanFilterConfig {
  projectId?: string;
  scanType?: string;
}

interface ScanPaginationConfig {
  limit?: number;
  offset?: number;
}

interface UseScanDataResult {
  scans: DbScan[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: ScanFilterConfig) => void;
}
```

## Related Files

- **Hook**: `src/hooks/useScanData.ts`
- **API Route**: `src/app/api/scans/route.ts`
- **Repository**: `src/app/db/repositories/scan.repository.ts`
- **Types**: `src/app/db/models/types.ts`
- **Example Component**: `src/app/features/scans/components/ScanDataList.tsx`

## Migration from Direct Repository Access

### Before (Direct DB Access)

```tsx
'use client';
import { scanRepository } from '@/app/db';

function ScanList({ projectId }) {
  const [scans, setScans] = useState([]);

  useEffect(() => {
    const data = scanRepository.getScansByProject(projectId);
    setScans(data);
  }, [projectId]);

  return <div>{/* render scans */}</div>;
}
```

### After (Using Hook)

```tsx
'use client';
import { useScanData } from '@/hooks/useScanData';

function ScanList({ projectId }) {
  const { scans, loading, error } = useScanData({ projectId });

  if (loading) return <Loader />;
  if (error) return <Error message={error} />;

  return <div>{/* render scans */}</div>;
}
```

## Future Enhancements

Potential improvements for the hook:

1. **Infinite Scroll**: Automatic loading on scroll
2. **Real-time Updates**: WebSocket integration
3. **Optimistic Updates**: Instant UI feedback
4. **Query Invalidation**: React Query integration
5. **Prefetching**: Preload next page
6. **Debounced Filters**: Delay API calls on filter changes

## Troubleshooting

### Cache Not Updating

**Problem**: UI shows stale data after mutation

**Solution**: Call `invalidateScanDataCache()` or `refresh()`

```tsx
await createScan(data);
invalidateScanDataCache(projectId);
```

### Pagination Not Working

**Problem**: `loadMore()` doesn't fetch new data

**Solution**: Check `pagination.hasMore` before calling

```tsx
{pagination.hasMore && (
  <button onClick={loadMore}>Load More</button>
)}
```

### projectId Required Error

**Problem**: Error "projectId is required"

**Solution**: Always provide projectId in filters

```tsx
// ❌ Wrong
useScanData({}, { limit: 20 });

// ✅ Correct
useScanData({ projectId: 'project-123' }, { limit: 20 });
```

## Support

For issues or questions:
- Check the example component: `src/app/features/scans/components/ScanDataList.tsx`
- Review API endpoint: `src/app/api/scans/route.ts`
- See repository layer: `src/app/db/repositories/scan.repository.ts`
