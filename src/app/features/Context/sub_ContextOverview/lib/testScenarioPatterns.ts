/**
 * Test Scenario Patterns Library
 *
 * A collection of reusable, well-documented step sequences for common testing scenarios.
 * These patterns can be composed together to create complex test scenarios without
 * writing raw JSON. Each function returns typed step arrays that can be combined
 * using the `compose()` function.
 *
 * @example
 * ```typescript
 * import {
 *   compose,
 *   navigateTo,
 *   formSubmission,
 *   modalInteraction
 * } from './testScenarioPatterns';
 *
 * const scenario = compose(
 *   navigateTo('/settings'),
 *   modalInteraction('settings-modal', {
 *     triggerSelector: 'open-settings-btn',
 *     actions: [{ type: 'click', selector: 'save-btn' }]
 *   }),
 *   waitFor(2000)
 * );
 * ```
 *
 * @module testScenarioPatterns
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Supported step types for test scenarios
 */
export type StepType = 'navigate' | 'wait' | 'click' | 'type' | 'scroll' | 'screenshot';

/**
 * A single test step that can be executed by Playwright
 */
export interface TestStep {
  /** The type of action to perform */
  type: StepType;
  /** URL for navigate steps */
  url?: string;
  /** Delay in milliseconds for wait steps */
  delay?: number;
  /** CSS selector or data-testid selector for click/type steps */
  selector?: string;
  /** Text to type for type steps */
  text?: string;
  /** Scroll position for scroll steps */
  scrollY?: number;
}

/**
 * Configuration for form field filling
 */
export interface FormFieldConfig {
  /** The data-testid of the input field (without the full selector syntax) */
  testId: string;
  /** The value to enter in the field */
  value: string;
  /** Optional: delay after filling this field (default: 300ms) */
  delayAfter?: number;
}

/**
 * Configuration for modal interactions
 */
export interface ModalConfig {
  /** The data-testid of the trigger element that opens the modal */
  triggerSelector?: string;
  /** Actions to perform inside the modal */
  actions?: Array<{ type: 'click' | 'type'; selector: string; text?: string }>;
  /** Whether to wait for the modal to close after actions (default: true) */
  waitForClose?: boolean;
  /** Custom close delay in ms (default: 1000) */
  closeDelay?: number;
}

/**
 * Configuration for navigation flow
 */
export interface NavigationFlowConfig {
  /** Array of navigation steps with optional actions */
  steps: Array<{
    /** Path to navigate to */
    path: string;
    /** Actions to perform on this page */
    actions?: TestStep[];
    /** Wait time after navigation (default: 2000ms) */
    waitAfter?: number;
  }>;
}

/**
 * Configuration for data validation scenarios
 */
export interface ValidationConfig {
  /** The data-testid of the form or container */
  formTestId?: string;
  /** Fields to fill and validate */
  fields: Array<{
    testId: string;
    value: string;
    /** Whether this should trigger a validation error */
    expectError?: boolean;
  }>;
  /** Submit button test ID */
  submitTestId?: string;
  /** Whether to expect form submission to succeed */
  expectSuccess?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a test ID into a proper selector
 * @param testId - The data-testid value (e.g., 'submit-btn')
 * @returns The full selector (e.g., "[data-testid='submit-btn']")
 *
 * @example
 * ```typescript
 * toSelector('my-button') // Returns "[data-testid='my-button']"
 * toSelector('[data-testid="already-formatted"]') // Returns as-is
 * ```
 */
export function toSelector(testId: string): string {
  // If already a selector, return as-is
  if (testId.startsWith('[') || testId.startsWith('.') || testId.startsWith('#')) {
    return testId;
  }
  return `[data-testid='${testId}']`;
}

/**
 * Composes multiple step arrays into a single scenario
 * Use this to combine patterns into complete test scenarios
 *
 * @param stepArrays - Arrays of test steps to combine
 * @returns A single array containing all steps in order
 *
 * @example
 * ```typescript
 * const scenario = compose(
 *   navigateTo('/login'),
 *   formSubmission({
 *     fields: [{ testId: 'email-input', value: 'test@example.com' }],
 *     submitTestId: 'login-btn'
 *   }),
 *   waitFor(3000)
 * );
 * ```
 */
export function compose(...stepArrays: TestStep[][]): TestStep[] {
  return stepArrays.flat();
}

/**
 * Converts a TestStep array to JSON string for storage
 *
 * @param steps - Array of test steps
 * @param pretty - Whether to pretty-print the JSON (default: true)
 * @returns JSON string representation
 */
export function toJSON(steps: TestStep[], pretty = true): string {
  return JSON.stringify(steps, null, pretty ? 2 : undefined);
}

// ============================================================================
// Basic Step Patterns
// ============================================================================

/**
 * Creates a navigation step to a specific URL
 * Use this as the first step in most test scenarios
 *
 * @param url - The URL to navigate to (can be relative path like '/dashboard')
 * @param options - Optional configuration
 * @returns Array containing the navigation step and optional wait
 *
 * @example
 * ```typescript
 * // Navigate to dashboard and wait for page load
 * navigateTo('/dashboard')
 *
 * // Navigate with custom wait time
 * navigateTo('/slow-page', { waitAfter: 5000 })
 *
 * // Navigate without waiting (for chaining with specific element wait)
 * navigateTo('/dashboard', { waitAfter: 0 })
 * ```
 */
export function navigateTo(
  url: string,
  options: { waitAfter?: number } = {}
): TestStep[] {
  const { waitAfter = 2000 } = options;

  const steps: TestStep[] = [{ type: 'navigate', url }];

  if (waitAfter > 0) {
    steps.push({ type: 'wait', delay: waitAfter });
  }

  return steps;
}

/**
 * Creates a wait step for a specified duration
 * Use between actions that need time to complete
 *
 * @param ms - Duration to wait in milliseconds
 * @returns Array containing the wait step
 *
 * @example
 * ```typescript
 * // Wait for animation to complete
 * waitFor(500)
 *
 * // Wait for API response
 * waitFor(2000)
 * ```
 */
export function waitFor(ms: number): TestStep[] {
  return [{ type: 'wait', delay: ms }];
}

/**
 * Creates a click step for an element
 * Automatically formats test IDs into selectors
 *
 * @param testIdOrSelector - The data-testid or CSS selector of the element
 * @param options - Optional configuration
 * @returns Array containing the click step and optional wait
 *
 * @example
 * ```typescript
 * // Click a button by test ID
 * clickElement('submit-btn')
 *
 * // Click with custom wait after
 * clickElement('dropdown-trigger', { waitAfter: 1000 })
 *
 * // Click using CSS selector
 * clickElement('.custom-class', { waitAfter: 500 })
 * ```
 */
export function clickElement(
  testIdOrSelector: string,
  options: { waitAfter?: number } = {}
): TestStep[] {
  const { waitAfter = 500 } = options;

  const steps: TestStep[] = [
    { type: 'click', selector: toSelector(testIdOrSelector) }
  ];

  if (waitAfter > 0) {
    steps.push({ type: 'wait', delay: waitAfter });
  }

  return steps;
}

/**
 * Creates a type step for entering text into an input
 * Automatically formats test IDs into selectors
 *
 * @param testIdOrSelector - The data-testid or CSS selector of the input
 * @param text - The text to type
 * @param options - Optional configuration
 * @returns Array containing the type step and optional wait
 *
 * @example
 * ```typescript
 * // Type into an input by test ID
 * typeText('email-input', 'user@example.com')
 *
 * // Type with longer wait (for autocomplete)
 * typeText('search-input', 'query', { waitAfter: 1500 })
 * ```
 */
export function typeText(
  testIdOrSelector: string,
  text: string,
  options: { waitAfter?: number } = {}
): TestStep[] {
  const { waitAfter = 300 } = options;

  const steps: TestStep[] = [
    { type: 'type', selector: toSelector(testIdOrSelector), text }
  ];

  if (waitAfter > 0) {
    steps.push({ type: 'wait', delay: waitAfter });
  }

  return steps;
}

/**
 * Creates a scroll step to scroll the page
 *
 * @param scrollY - The Y position to scroll to (or undefined for full page scroll)
 * @param options - Optional configuration
 * @returns Array containing the scroll step and optional wait
 *
 * @example
 * ```typescript
 * // Scroll to bottom of page
 * scrollPage()
 *
 * // Scroll to specific position
 * scrollPage(500)
 * ```
 */
export function scrollPage(
  scrollY?: number,
  options: { waitAfter?: number } = {}
): TestStep[] {
  const { waitAfter = 500 } = options;

  const steps: TestStep[] = [{ type: 'scroll', scrollY }];

  if (waitAfter > 0) {
    steps.push({ type: 'wait', delay: waitAfter });
  }

  return steps;
}

/**
 * Creates a screenshot capture step
 * Use at key points to capture visual state
 *
 * @returns Array containing the screenshot step
 *
 * @example
 * ```typescript
 * compose(
 *   navigateTo('/dashboard'),
 *   takeScreenshot() // Capture the dashboard state
 * )
 * ```
 */
export function takeScreenshot(): TestStep[] {
  return [{ type: 'screenshot' }];
}

// ============================================================================
// Composite Patterns
// ============================================================================

/**
 * Creates a form submission pattern with field filling and submit
 * This is the most common pattern for testing forms
 *
 * @param config - Form submission configuration
 * @returns Array of steps to fill and submit the form
 *
 * @example
 * ```typescript
 * // Simple login form
 * formSubmission({
 *   fields: [
 *     { testId: 'email-input', value: 'user@example.com' },
 *     { testId: 'password-input', value: 'password123' }
 *   ],
 *   submitTestId: 'login-btn'
 * })
 *
 * // Form with custom delays
 * formSubmission({
 *   fields: [
 *     { testId: 'search-input', value: 'query', delayAfter: 1000 }
 *   ],
 *   submitTestId: 'search-btn',
 *   waitAfterSubmit: 3000
 * })
 * ```
 */
export function formSubmission(config: {
  /** Fields to fill in the form */
  fields: FormFieldConfig[];
  /** The data-testid of the submit button */
  submitTestId: string;
  /** Wait time after form submission (default: 2000ms) */
  waitAfterSubmit?: number;
}): TestStep[] {
  const { fields, submitTestId, waitAfterSubmit = 2000 } = config;

  const steps: TestStep[] = [];

  // Fill each field
  for (const field of fields) {
    steps.push({
      type: 'type',
      selector: toSelector(field.testId),
      text: field.value
    });
    steps.push({
      type: 'wait',
      delay: field.delayAfter ?? 300
    });
  }

  // Click submit
  steps.push({
    type: 'click',
    selector: toSelector(submitTestId)
  });

  // Wait for submission to complete
  steps.push({
    type: 'wait',
    delay: waitAfterSubmit
  });

  return steps;
}

/**
 * Creates a navigation flow pattern for multi-page testing
 * Use when testing user journeys across multiple pages
 *
 * @param config - Navigation flow configuration
 * @returns Array of steps to navigate through pages
 *
 * @example
 * ```typescript
 * // Navigate through onboarding flow
 * navigationFlow({
 *   steps: [
 *     { path: '/onboarding/step-1' },
 *     {
 *       path: '/onboarding/step-2',
 *       actions: [{ type: 'click', selector: "[data-testid='next-btn']" }]
 *     },
 *     { path: '/onboarding/complete', waitAfter: 3000 }
 *   ]
 * })
 * ```
 */
export function navigationFlow(config: NavigationFlowConfig): TestStep[] {
  const steps: TestStep[] = [];

  for (const navStep of config.steps) {
    // Navigate to path
    steps.push({ type: 'navigate', url: navStep.path });
    steps.push({ type: 'wait', delay: navStep.waitAfter ?? 2000 });

    // Execute any actions on this page
    if (navStep.actions) {
      steps.push(...navStep.actions);
    }
  }

  return steps;
}

/**
 * Creates a modal interaction pattern
 * Handles opening, interacting with, and closing modals
 *
 * @param modalTestId - The data-testid of the modal container (for verification)
 * @param config - Modal interaction configuration
 * @returns Array of steps to interact with the modal
 *
 * @example
 * ```typescript
 * // Open settings modal and save
 * modalInteraction('settings-modal', {
 *   triggerSelector: 'open-settings-btn',
 *   actions: [
 *     { type: 'type', selector: 'name-input', text: 'New Name' },
 *     { type: 'click', selector: 'save-btn' }
 *   ]
 * })
 *
 * // Confirmation dialog
 * modalInteraction('confirm-dialog', {
 *   triggerSelector: 'delete-btn',
 *   actions: [{ type: 'click', selector: 'confirm-delete-btn' }],
 *   closeDelay: 500
 * })
 * ```
 */
export function modalInteraction(
  modalTestId: string,
  config: ModalConfig = {}
): TestStep[] {
  const {
    triggerSelector,
    actions = [],
    waitForClose = true,
    closeDelay = 1000
  } = config;

  const steps: TestStep[] = [];

  // Open modal if trigger provided
  if (triggerSelector) {
    steps.push({
      type: 'click',
      selector: toSelector(triggerSelector)
    });
    steps.push({ type: 'wait', delay: 500 }); // Wait for modal animation
  }

  // Execute modal actions
  for (const action of actions) {
    if (action.type === 'click') {
      steps.push({
        type: 'click',
        selector: toSelector(action.selector)
      });
    } else if (action.type === 'type' && action.text) {
      steps.push({
        type: 'type',
        selector: toSelector(action.selector),
        text: action.text
      });
    }
    steps.push({ type: 'wait', delay: 300 });
  }

  // Wait for modal to close
  if (waitForClose) {
    steps.push({ type: 'wait', delay: closeDelay });
  }

  return steps;
}

/**
 * Creates a data validation pattern for testing form validation
 * Tests both valid and invalid input scenarios
 *
 * @param config - Validation test configuration
 * @returns Array of steps to test validation
 *
 * @example
 * ```typescript
 * // Test email validation
 * dataValidation({
 *   fields: [
 *     { testId: 'email-input', value: 'invalid-email', expectError: true },
 *     { testId: 'email-input', value: 'valid@email.com', expectError: false }
 *   ],
 *   submitTestId: 'submit-btn'
 * })
 * ```
 */
export function dataValidation(config: ValidationConfig): TestStep[] {
  const { fields, submitTestId, expectSuccess = true } = config;

  const steps: TestStep[] = [];

  // Fill validation fields
  for (const field of fields) {
    steps.push({
      type: 'type',
      selector: toSelector(field.testId),
      text: field.value
    });
    steps.push({ type: 'wait', delay: 500 }); // Allow validation to trigger
  }

  // Submit if submit button provided
  if (submitTestId) {
    steps.push({
      type: 'click',
      selector: toSelector(submitTestId)
    });
    steps.push({
      type: 'wait',
      delay: expectSuccess ? 2000 : 1000
    });
  }

  return steps;
}

/**
 * Creates a dropdown/select interaction pattern
 * Opens dropdown and selects an option
 *
 * @param dropdownTestId - The data-testid of the dropdown trigger
 * @param optionTestId - The data-testid of the option to select
 * @param options - Optional configuration
 * @returns Array of steps to interact with dropdown
 *
 * @example
 * ```typescript
 * // Select from a dropdown
 * dropdownSelection('country-dropdown', 'option-usa')
 *
 * // With longer animation wait
 * dropdownSelection('theme-select', 'option-dark', { waitAfterOpen: 500 })
 * ```
 */
export function dropdownSelection(
  dropdownTestId: string,
  optionTestId: string,
  options: { waitAfterOpen?: number; waitAfterSelect?: number } = {}
): TestStep[] {
  const { waitAfterOpen = 300, waitAfterSelect = 500 } = options;

  return [
    { type: 'click', selector: toSelector(dropdownTestId) },
    { type: 'wait', delay: waitAfterOpen },
    { type: 'click', selector: toSelector(optionTestId) },
    { type: 'wait', delay: waitAfterSelect }
  ];
}

/**
 * Creates a tab navigation pattern
 * Clicks through tabs and optionally performs actions on each
 *
 * @param tabs - Array of tab configurations
 * @returns Array of steps to navigate through tabs
 *
 * @example
 * ```typescript
 * tabNavigation([
 *   { tabTestId: 'settings-tab', waitAfter: 1000 },
 *   { tabTestId: 'profile-tab', waitAfter: 1000 },
 *   { tabTestId: 'security-tab', waitAfter: 1000 }
 * ])
 * ```
 */
export function tabNavigation(
  tabs: Array<{ tabTestId: string; waitAfter?: number; actions?: TestStep[] }>
): TestStep[] {
  const steps: TestStep[] = [];

  for (const tab of tabs) {
    steps.push({
      type: 'click',
      selector: toSelector(tab.tabTestId)
    });
    steps.push({ type: 'wait', delay: tab.waitAfter ?? 500 });

    if (tab.actions) {
      steps.push(...tab.actions);
    }
  }

  return steps;
}

/**
 * Creates a list item interaction pattern
 * Useful for testing list views with clickable items
 *
 * @param listItemTestId - The data-testid of the list item
 * @param action - The action to perform ('click', 'expand', 'select')
 * @param options - Optional configuration
 * @returns Array of steps to interact with list item
 *
 * @example
 * ```typescript
 * // Click to view details
 * listItemAction('task-item-1', 'click')
 *
 * // Expand with custom wait
 * listItemAction('folder-item-docs', 'expand', { waitAfter: 1000 })
 * ```
 */
export function listItemAction(
  listItemTestId: string,
  action: 'click' | 'expand' | 'select' = 'click',
  options: { waitAfter?: number } = {}
): TestStep[] {
  const { waitAfter = 500 } = options;

  return [
    { type: 'click', selector: toSelector(listItemTestId) },
    { type: 'wait', delay: waitAfter }
  ];
}

/**
 * Creates a search and filter pattern
 * Types search query and waits for results
 *
 * @param searchTestId - The data-testid of the search input
 * @param query - The search query to type
 * @param options - Optional configuration
 * @returns Array of steps to perform search
 *
 * @example
 * ```typescript
 * // Basic search
 * searchAndFilter('search-input', 'react components')
 *
 * // Search with result click
 * compose(
 *   searchAndFilter('global-search', 'dashboard', { debounceWait: 1000 }),
 *   clickElement('search-result-0')
 * )
 * ```
 */
export function searchAndFilter(
  searchTestId: string,
  query: string,
  options: { debounceWait?: number; clearFirst?: boolean } = {}
): TestStep[] {
  const { debounceWait = 500, clearFirst = false } = options;

  const steps: TestStep[] = [];

  // Clear input if needed (by selecting all and replacing)
  if (clearFirst) {
    steps.push({
      type: 'click',
      selector: toSelector(searchTestId)
    });
    steps.push({ type: 'wait', delay: 100 });
  }

  steps.push({
    type: 'type',
    selector: toSelector(searchTestId),
    text: query
  });

  // Wait for debounce/search
  steps.push({ type: 'wait', delay: debounceWait });

  return steps;
}

/**
 * Creates a toggle/switch interaction pattern
 *
 * @param toggleTestId - The data-testid of the toggle
 * @param options - Optional configuration
 * @returns Array of steps to toggle the switch
 *
 * @example
 * ```typescript
 * // Toggle a setting
 * toggleSwitch('dark-mode-toggle')
 *
 * // Toggle with state verification wait
 * toggleSwitch('notifications-toggle', { waitAfter: 1000 })
 * ```
 */
export function toggleSwitch(
  toggleTestId: string,
  options: { waitAfter?: number } = {}
): TestStep[] {
  const { waitAfter = 300 } = options;

  return [
    { type: 'click', selector: toSelector(toggleTestId) },
    { type: 'wait', delay: waitAfter }
  ];
}

// ============================================================================
// Pre-built Complete Scenarios
// ============================================================================

/**
 * Creates a standard login flow scenario
 * Use as a template for authentication testing
 *
 * @param config - Login configuration
 * @returns Complete login scenario steps
 *
 * @example
 * ```typescript
 * loginScenario({
 *   loginPath: '/auth/login',
 *   emailTestId: 'email-input',
 *   passwordTestId: 'password-input',
 *   submitTestId: 'login-btn',
 *   email: 'test@example.com',
 *   password: 'password123'
 * })
 * ```
 */
export function loginScenario(config: {
  loginPath: string;
  emailTestId: string;
  passwordTestId: string;
  submitTestId: string;
  email: string;
  password: string;
  redirectPath?: string;
}): TestStep[] {
  const steps = compose(
    navigateTo(config.loginPath),
    formSubmission({
      fields: [
        { testId: config.emailTestId, value: config.email },
        { testId: config.passwordTestId, value: config.password }
      ],
      submitTestId: config.submitTestId,
      waitAfterSubmit: 3000
    })
  );

  // Optionally verify redirect
  if (config.redirectPath) {
    steps.push({ type: 'wait', delay: 1000 });
  }

  return steps;
}

/**
 * Creates a CRUD operation scenario (Create, Read, Update, Delete)
 * Common pattern for admin interfaces
 *
 * @param config - CRUD configuration
 * @returns Complete CRUD scenario steps
 *
 * @example
 * ```typescript
 * crudScenario({
 *   listPath: '/admin/users',
 *   createBtnTestId: 'create-user-btn',
 *   formFields: [{ testId: 'name-input', value: 'Test User' }],
 *   submitTestId: 'save-btn'
 * })
 * ```
 */
export function crudScenario(config: {
  listPath: string;
  createBtnTestId: string;
  formFields: FormFieldConfig[];
  submitTestId: string;
}): TestStep[] {
  return compose(
    navigateTo(config.listPath),
    clickElement(config.createBtnTestId, { waitAfter: 500 }),
    formSubmission({
      fields: config.formFields,
      submitTestId: config.submitTestId,
      waitAfterSubmit: 2000
    })
  );
}

/**
 * Creates a settings page scenario
 * Common pattern for testing configuration pages
 *
 * @param config - Settings scenario configuration
 * @returns Complete settings scenario steps
 *
 * @example
 * ```typescript
 * settingsScenario({
 *   settingsPath: '/settings',
 *   sections: [
 *     { tabTestId: 'profile-tab', fields: [{ testId: 'name', value: 'New Name' }] },
 *     { tabTestId: 'security-tab', fields: [] }
 *   ],
 *   saveTestId: 'save-settings-btn'
 * })
 * ```
 */
export function settingsScenario(config: {
  settingsPath: string;
  sections?: Array<{ tabTestId: string; fields?: FormFieldConfig[] }>;
  saveTestId?: string;
}): TestStep[] {
  const steps = navigateTo(config.settingsPath);

  if (config.sections) {
    for (const section of config.sections) {
      steps.push({
        type: 'click',
        selector: toSelector(section.tabTestId)
      });
      steps.push({ type: 'wait', delay: 500 });

      if (section.fields) {
        for (const field of section.fields) {
          steps.push({
            type: 'type',
            selector: toSelector(field.testId),
            text: field.value
          });
          steps.push({ type: 'wait', delay: 300 });
        }
      }
    }
  }

  if (config.saveTestId) {
    steps.push({
      type: 'click',
      selector: toSelector(config.saveTestId)
    });
    steps.push({ type: 'wait', delay: 2000 });
  }

  return steps;
}

// ============================================================================
// Export Default Object for Convenience
// ============================================================================

/**
 * Default export containing all patterns for easy destructuring
 *
 * @example
 * ```typescript
 * import patterns from './testScenarioPatterns';
 *
 * const scenario = patterns.compose(
 *   patterns.navigateTo('/dashboard'),
 *   patterns.clickElement('menu-btn')
 * );
 * ```
 */
const patterns = {
  // Helpers
  toSelector,
  compose,
  toJSON,

  // Basic steps
  navigateTo,
  waitFor,
  clickElement,
  typeText,
  scrollPage,
  takeScreenshot,

  // Composite patterns
  formSubmission,
  navigationFlow,
  modalInteraction,
  dataValidation,
  dropdownSelection,
  tabNavigation,
  listItemAction,
  searchAndFilter,
  toggleSwitch,

  // Complete scenarios
  loginScenario,
  crudScenario,
  settingsScenario,
};

export default patterns;
