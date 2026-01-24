'use client';

import React from 'react';
import { createDeferredWidget, DeferredWidgetPresets } from './DeferredWidget';

// Deferred widgets that load during browser idle time
const DeferredContextOverview = createDeferredWidget(
  () => import('@/app/features/Context/sub_ContextOverview/ContextOverview'),
  DeferredWidgetPresets.modal('ContextOverview')
);

/**
 * Container for deferred non-critical widgets.
 * These widgets load after the initial page render during browser idle time.
 */
export default function DeferredWidgets() {
  return (
    <>
      <DeferredContextOverview />
    </>
  );
}
