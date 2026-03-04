'use client';

/**
 * TestingTab - Test scenario/selector features removed (deprecated)
 * Keeping as stub to avoid breaking ContextOverview imports.
 */
export default function TestingTab(_props: Record<string, unknown> & {
  onTestScenarioChange?: (value: string) => void;
  onPreviewUpdate?: (previewPath: string) => void;
}) {
  return null;
}
