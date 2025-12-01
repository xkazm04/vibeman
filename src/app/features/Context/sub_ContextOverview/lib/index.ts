/**
 * Context Overview Library Exports
 *
 * This module provides utilities for test scenario creation.
 * JSON parsing has been consolidated into the useJsonValidation hook
 * located at: components/useJsonValidation.ts
 */

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
