'use client';

import React, { useState, useEffect, ComponentType, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { markLazyLoadStart, markLazyLoadEnd } from '@/lib/performance';

interface DeferredWidgetOptions {
  /** Widget name for metrics */
  widgetName: string;
  /** Delay in ms before starting to load (default: 0, loads after first paint) */
  delay?: number;
  /** Whether to start loading immediately on mount or wait for idle time */
  loadStrategy?: 'immediate' | 'idle' | 'visible';
  /** Disable server-side rendering */
  ssr?: boolean;
}

/**
 * Creates a widget that defers loading until after initial page load.
 * Useful for non-critical UI elements like modals, sidebars, and overlays.
 *
 * @example
 * const DeferredMarketplace = createDeferredWidget(
 *   () => import('@/app/features/Marketplace/MarketplaceLayout'),
 *   { widgetName: 'Marketplace', loadStrategy: 'idle' }
 * );
 */
export function createDeferredWidget<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: DeferredWidgetOptions
): ComponentType<P> {
  const {
    widgetName,
    delay = 0,
    loadStrategy = 'immediate',
    ssr = false,
  } = options;

  // Create the dynamic component
  const DynamicComponent = dynamic(
    async () => {
      const startTime = markLazyLoadStart(widgetName);
      try {
        const module = await importFn();
        markLazyLoadEnd(widgetName, startTime, true);
        return module;
      } catch (error) {
        markLazyLoadEnd(
          widgetName,
          startTime,
          false,
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    },
    {
      ssr,
      // No loading component needed for deferred widgets - they load silently
    }
  );

  const DeferredWidgetWrapper = (props: P) => {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
      let timeoutId: NodeJS.Timeout;
      let idleCallbackId: number;

      const startLoading = () => setShouldLoad(true);

      switch (loadStrategy) {
        case 'idle':
          // Use requestIdleCallback if available, otherwise use setTimeout
          if ('requestIdleCallback' in window) {
            idleCallbackId = window.requestIdleCallback(() => {
              if (delay > 0) {
                timeoutId = setTimeout(startLoading, delay);
              } else {
                startLoading();
              }
            });
          } else {
            // Fallback: wait for next animation frame + delay
            timeoutId = setTimeout(startLoading, delay + 100);
          }
          break;

        case 'visible':
          // For visibility-based loading, use IntersectionObserver
          // This is a simplified version - the component loads when the page is visible
          if (document.visibilityState === 'visible') {
            timeoutId = setTimeout(startLoading, delay);
          } else {
            const handleVisibilityChange = () => {
              if (document.visibilityState === 'visible') {
                timeoutId = setTimeout(startLoading, delay);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
              }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => {
              document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
          }
          break;

        case 'immediate':
        default:
          // Load after a microtask to not block initial render
          if (delay > 0) {
            timeoutId = setTimeout(startLoading, delay);
          } else {
            // Use queueMicrotask to load after current render
            queueMicrotask(startLoading);
          }
          break;
      }

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (idleCallbackId && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleCallbackId);
        }
      };
    }, []);

    if (!shouldLoad) {
      // Return null while waiting - the widget will appear when ready
      return null;
    }

    return (
      <Suspense fallback={null}>
        <DynamicComponent {...props} />
      </Suspense>
    );
  };

  DeferredWidgetWrapper.displayName = `DeferredWidget(${widgetName})`;

  return DeferredWidgetWrapper;
}

/**
 * Pre-defined deferred widget configurations
 */
export const DeferredWidgetPresets = {
  /** For modals and overlays that can load during idle time */
  modal: (widgetName: string) => ({
    widgetName,
    loadStrategy: 'idle' as const,
    delay: 100,
    ssr: false,
  }),

  /** For non-critical sidebar widgets */
  sidebar: (widgetName: string) => ({
    widgetName,
    loadStrategy: 'idle' as const,
    delay: 200,
    ssr: false,
  }),

  /** For widgets that should load almost immediately after first paint */
  afterPaint: (widgetName: string) => ({
    widgetName,
    loadStrategy: 'immediate' as const,
    delay: 50,
    ssr: false,
  }),
};
