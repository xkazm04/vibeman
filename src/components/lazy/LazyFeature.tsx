'use client';

import React, { Suspense, useEffect, useRef, ComponentType } from 'react';
import dynamic from 'next/dynamic';
import FeatureLoadingSkeleton from './FeatureLoadingSkeleton';
import {
  markLazyLoadStart,
  markLazyLoadEnd,
  createMountMeasure,
} from '@/lib/performance';

type SkeletonVariant = 'default' | 'sidebar' | 'cards' | 'table' | 'minimal';

interface LazyFeatureOptions {
  /** Feature name for metrics and display */
  featureName: string;
  /** Skeleton variant to show while loading */
  skeletonVariant?: SkeletonVariant;
  /** Disable server-side rendering */
  ssr?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

/**
 * Creates a lazily-loaded feature component with performance tracking.
 *
 * @example
 * const LazyIdeasLayout = createLazyFeature(
 *   () => import('@/app/features/Ideas/IdeasLayout'),
 *   { featureName: 'Ideas', skeletonVariant: 'cards' }
 * );
 */
export function createLazyFeature<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyFeatureOptions
): ComponentType<P> {
  const {
    featureName,
    skeletonVariant = 'default',
    ssr = false,
    loadingComponent,
  } = options;

  // Track load timing
  let loadStartTime: number | null = null;
  let hasLoaded = false;

  const LoadingFallback = () => {
    // Mark start time when we begin loading
    if (loadStartTime === null) {
      loadStartTime = markLazyLoadStart(featureName);
    }

    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <FeatureLoadingSkeleton
        featureName={featureName}
        variant={skeletonVariant}
        data-testid={`lazy-loading-${featureName.toLowerCase()}`}
      />
    );
  };

  // Create the dynamic import with tracking
  const DynamicComponent = dynamic(
    async () => {
      // Start timing if not already started
      if (loadStartTime === null) {
        loadStartTime = markLazyLoadStart(featureName);
      }

      try {
        const module = await importFn();

        // Record successful load
        if (loadStartTime !== null && !hasLoaded) {
          markLazyLoadEnd(featureName, loadStartTime, true);
          hasLoaded = true;
        }

        return module;
      } catch (error) {
        // Record failed load
        if (loadStartTime !== null) {
          markLazyLoadEnd(
            featureName,
            loadStartTime,
            false,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
        throw error;
      }
    },
    {
      loading: LoadingFallback,
      ssr,
    }
  );

  // Wrapper component with Suspense boundary
  const LazyFeatureWrapper = (props: P) => {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <DynamicComponent {...props} />
      </Suspense>
    );
  };

  LazyFeatureWrapper.displayName = `LazyFeature(${featureName})`;

  return LazyFeatureWrapper;
}

/**
 * Hook to track component mount performance.
 * Call in useEffect to measure time from render to mount.
 *
 * @example
 * function MyComponent() {
 *   useTrackMount('MyComponent');
 *   return <div>...</div>;
 * }
 */
export function useTrackMount(componentName: string): void {
  const measureRef = useRef<(() => void) | null>(null);

  // Create measure on first render
  if (measureRef.current === null) {
    measureRef.current = createMountMeasure(componentName);
  }

  useEffect(() => {
    // Call measure on mount
    if (measureRef.current) {
      measureRef.current();
      measureRef.current = null;
    }
  }, []);
}

/**
 * Pre-defined lazy feature configurations for common patterns
 */
export const LazyFeaturePresets = {
  /** For features with sidebar navigation */
  withSidebar: (featureName: string) => ({
    featureName,
    skeletonVariant: 'sidebar' as const,
    ssr: false,
  }),

  /** For features displaying card grids */
  withCards: (featureName: string) => ({
    featureName,
    skeletonVariant: 'cards' as const,
    ssr: false,
  }),

  /** For features with data tables */
  withTable: (featureName: string) => ({
    featureName,
    skeletonVariant: 'table' as const,
    ssr: false,
  }),

  /** For lightweight features */
  minimal: (featureName: string) => ({
    featureName,
    skeletonVariant: 'minimal' as const,
    ssr: false,
  }),
};
