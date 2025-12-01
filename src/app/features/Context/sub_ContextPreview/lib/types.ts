/**
 * Test Selector Types
 */

export interface TestSelector {
  id: string;
  contextId: string;
  dataTestid: string;
  title: string;
  filepath: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  success: boolean;
  contextId: string;
  contextName: string;
  totalFound: number;
  newSelectors: number;
  existingSelectors: number;
  totalInDb: number;
  selectors: Array<{
    testid: string;
    filepath: string;
    isNew: boolean;
  }>;
  savedSelectors: Array<{
    id: string;
    dataTestid: string;
    filepath: string;
  }>;
  message?: string;
  error?: string;
}
