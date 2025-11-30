/**
 * Context Overview Library Exports
 *
 * This module provides utilities for test scenario creation and JSON parsing.
 */

// JSON parsing utilities
export {
  parseJsonResponse,
  parseTestScenario,
  validateTestSteps,
  isValidTestStep,
  safeStringify,
  type ParseResult,
  type TestStep as JsonParserTestStep,
} from './jsonParser';

// Test scenario patterns library
export {
  // Helpers
  toSelector,
  compose,
  toJSON,

  // Basic step patterns
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

  // Types
  type TestStep,
  type StepType,
  type FormFieldConfig,
  type ModalConfig,
  type NavigationFlowConfig,
  type ValidationConfig,

  // Default export for convenience
  default as patterns,
} from './testScenarioPatterns';
