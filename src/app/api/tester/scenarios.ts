/**
 * Test scenario definitions for automated screenshot testing
 * Each scenario defines a sequence of actions to perform in the browser
 */

export interface ScenarioAction {
  type: 'navigate' | 'click' | 'wait' | 'scroll' | 'type';
  selector?: string; // CSS selector for click/type actions
  url?: string; // URL for navigate actions
  text?: string; // Text for type actions
  delay?: number; // Delay in milliseconds for wait actions
  scrollY?: number; // Scroll position for scroll actions
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  baseUrl: string; // Base URL (usually localhost:3000)
  actions: ScenarioAction[];
  screenshotName?: string; // Optional custom screenshot name
}

/**
 * Default scenarios for testing
 * These scenarios navigate through the TopBar navigation and capture screenshots
 */
export const TEST_SCENARIOS: Record<string, TestScenario> = {
  home: {
    id: 'home',
    name: 'Home Module Screenshot',
    description: 'Navigates to Home module via TopBar and captures screenshot',
    baseUrl: 'http://localhost:3000',
    actions: [
      { type: 'navigate', url: 'http://localhost:3000' },
      { type: 'wait', delay: 3000 }, // Wait for initial page load and animations
      { type: 'click', selector: 'text=Home' },
      { type: 'wait', delay: 2000 }, // Wait for module to load
    ],
    screenshotName: 'home-module',
  },

  ideas: {
    id: 'ideas',
    name: 'Ideas Module Screenshot',
    description: 'Navigates to Ideas module via TopBar and captures screenshot',
    baseUrl: 'http://localhost:3000',
    actions: [
      { type: 'navigate', url: 'http://localhost:3000' },
      { type: 'wait', delay: 3000 },
      { type: 'click', selector: 'text=Ideas' },
      { type: 'wait', delay: 2000 },
    ],
    screenshotName: 'ideas-module',
  },

  tinder: {
    id: 'tinder',
    name: 'Tinder Module Screenshot',
    description: 'Navigates to Tinder module via TopBar and captures screenshot',
    baseUrl: 'http://localhost:3000',
    actions: [
      { type: 'navigate', url: 'http://localhost:3000' },
      { type: 'wait', delay: 3000 },
      { type: 'click', selector: 'text=Tinder' },
      { type: 'wait', delay: 2000 },
    ],
    screenshotName: 'tinder-module',
  },

  tasker: {
    id: 'tasker',
    name: 'Tasker Module Screenshot',
    description: 'Navigates to Tasker module via TopBar and captures screenshot',
    baseUrl: 'http://localhost:3000',
    actions: [
      { type: 'navigate', url: 'http://localhost:3000' },
      { type: 'wait', delay: 3000 },
      { type: 'click', selector: 'text=Tasker' },
      { type: 'wait', delay: 2000 },
    ],
    screenshotName: 'tasker-module',
  },

  reflector: {
    id: 'reflector',
    name: 'Reflector Module Screenshot',
    description: 'Navigates to Reflector module via TopBar and captures screenshot',
    baseUrl: 'http://localhost:3000',
    actions: [
      { type: 'navigate', url: 'http://localhost:3000' },
      { type: 'wait', delay: 3000 },
      { type: 'click', selector: 'text=Reflector' },
      { type: 'wait', delay: 2000 },
    ],
    screenshotName: 'reflector-module',
  },
};

/**
 * Get a scenario by ID
 */
export function getScenario(scenarioId: string): TestScenario | null {
  return TEST_SCENARIOS[scenarioId] || null;
}

/**
 * Get all available scenarios
 */
export function getAllScenarios(): TestScenario[] {
  return Object.values(TEST_SCENARIOS);
}
