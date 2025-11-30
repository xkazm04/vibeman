/**
 * Property-based tests for WizardProgress
 * **Feature: wizard-redesign, Property 2: Progress Indicator Consistency**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the stores before importing the component
vi.mock('@/stores/refactorStore', () => ({
  useRefactorStore: vi.fn(),
}));

vi.mock('@/stores/themeStore', () => ({
  useThemeStore: vi.fn(() => ({
    getThemeColors: () => ({
      primary: 'from-blue-500 to-cyan-500',
      primaryFrom: 'from-blue-500',
      textDark: 'text-blue-400',
      bgLight: 'from-blue-500/10',
      baseColor: '#3b82f6',
      borderHover: 'border-blue-500',
      accent: 'bg-blue-500',
    }),
  })),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="check-icon">✓</span>,
  Settings: () => <span data-testid="settings-icon">⚙</span>,
  Scan: () => <span data-testid="scan-icon">🔍</span>,
  Lightbulb: () => <span data-testid="lightbulb-icon">💡</span>,
  Eye: () => <span data-testid="eye-icon">👁</span>,
  Package: () => <span data-testid="package-icon">📦</span>,
  Play: () => <span data-testid="play-icon">▶</span>,
  BarChart3: () => <span data-testid="barchart-icon">📊</span>,
}));

import { useRefactorStore } from '@/stores/refactorStore';
import WizardProgress from './WizardProgress';

// Define wizard steps for property testing (must match component's steps array)
const WIZARD_STEPS = ['settings', 'scan', 'plan', 'review', 'package', 'execute', 'results'] as const;
type WizardStep = typeof WIZARD_STEPS[number];

describe('WizardProgress - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: wizard-redesign, Property 2: Progress Indicator Consistency**
   * **Validates: Requirements 2.3**
   * 
   * For any wizard step from the set {settings, scan, plan, review, package, execute, results},
   * the WizardProgress component SHALL highlight exactly one step as current and mark all
   * preceding steps as completed.
   */
  it('Property 2: WizardProgress highlights exactly one current step and marks preceding steps as completed', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...WIZARD_STEPS),
        (currentStep: WizardStep) => {
          // Setup mock store with given step
          const mockStore = {
            currentStep,
            analysisProgress: 50,
            analysisStatus: 'idle',
          };

          vi.mocked(useRefactorStore).mockReturnValue(mockStore as any);

          const React = require('react');
          const { renderToString } = require('react-dom/server');
          
          const html = renderToString(React.createElement(WizardProgress));
          
          const currentIndex = WIZARD_STEPS.indexOf(currentStep);
          
          // Count check icons (completed steps) - they appear for steps before current
          const checkIconMatches = html.match(/data-testid="check-icon"/g) || [];
          const completedCount = checkIconMatches.length;
          
          // The number of completed steps should equal the current step's index
          // (all steps before the current one should be completed)
          expect(completedCount).toBe(currentIndex);
          
          // Verify the current step has the "current" styling (bg-gradient class)
          // The current step should have the bgLight gradient class applied
          const hasBgGradient = html.includes('from-blue-500/10');
          expect(hasBgGradient).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2b: Progress percentage is correctly calculated based on current step
   */
  it('Property 2b: Progress percentage matches current step position', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...WIZARD_STEPS),
        (currentStep: WizardStep) => {
          const mockStore = {
            currentStep,
            analysisProgress: 50,
            analysisStatus: 'idle',
          };

          vi.mocked(useRefactorStore).mockReturnValue(mockStore as any);

          const React = require('react');
          const { renderToString } = require('react-dom/server');
          
          const html = renderToString(React.createElement(WizardProgress));
          
          const currentIndex = WIZARD_STEPS.indexOf(currentStep);
          const expectedProgress = Math.round((currentIndex / (WIZARD_STEPS.length - 1)) * 100);
          
          // The progress percentage should be displayed in the component
          // React SSR may add comment nodes, so we check for the number followed by %
          const progressRegex = new RegExp(`>${expectedProgress}(<!-- -->)?%<`);
          expect(html).toMatch(progressRegex);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2c: Steps completed counter matches current step index
   */
  it('Property 2c: Steps completed counter is accurate', () => {
    fc.assert(
      fc.property(
        // Only test steps after the first one (index > 0) since the counter only shows when currentIndex > 0
        fc.constantFrom('scan', 'plan', 'review', 'package', 'execute', 'results') as fc.Arbitrary<WizardStep>,
        (currentStep: WizardStep) => {
          const mockStore = {
            currentStep,
            analysisProgress: 50,
            analysisStatus: 'idle',
          };

          vi.mocked(useRefactorStore).mockReturnValue(mockStore as any);

          const React = require('react');
          const { renderToString } = require('react-dom/server');
          
          const html = renderToString(React.createElement(WizardProgress));
          
          const currentIndex = WIZARD_STEPS.indexOf(currentStep);
          
          // The "Steps completed" section should show "X / 7" where X is the current index
          // React SSR may add comment nodes between elements, so we use a regex
          const counterRegex = new RegExp(`>${currentIndex}(<!-- -->)? \\/ (<!-- -->)?${WIZARD_STEPS.length}<`);
          expect(html).toMatch(counterRegex);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
