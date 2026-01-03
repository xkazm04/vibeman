'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { useRefactorStore } from '@/stores/refactorStore';
import { FullPageSpinner } from '@/components/ui/Spinner';

// Lazy load the entire wizard layout
const RefactorWizardLayout = dynamic(
  () => import('@/app/features/RefactorWizard/RefactorWizardLayout'),
  {
    loading: () => <FullPageSpinner label="Loading Refactor Wizard..." />,
    ssr: false
  }
);

export default function RefactorPage() {
  const { openWizard, isWizardOpen } = useRefactorStore();

  // Auto-open wizard when this page is rendered
  useEffect(() => {
    if (!isWizardOpen) {
      openWizard();
    }
  }, [openWizard, isWizardOpen]);

  return (
    <Suspense fallback={<FullPageSpinner label="Loading Refactor Wizard..." />}>
      <RefactorWizardLayout />
    </Suspense>
  );
}
