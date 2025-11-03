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
 * Helper: Create a standard module navigation scenario
 */
function createModuleScenario(
  moduleName: string,
  screenshotName: string,
  baseUrl = 'http://localhost:3000'
): TestScenario {
  return {
    id: moduleName.toLowerCase(),
    name: `${moduleName} Module Screenshot`,
    description: `Navigates to ${moduleName} module via TopBar and captures screenshot`,
    baseUrl,
    actions: [
      { type: 'navigate', url: baseUrl },
      { type: 'wait', delay: 3000 }, // Wait for initial page load and animations
      { type: 'click', selector: `text=${moduleName}` },
      { type: 'wait', delay: 2000 }, // Wait for module to load
    ],
    screenshotName,
  };
}

/**
 * Default scenarios for testing
 * These scenarios navigate through the TopBar navigation and capture screenshots
 */
export const TEST_SCENARIOS: Record<string, TestScenario> = {
  home: createModuleScenario('Home', 'home-module'),
  ideas: createModuleScenario('Ideas', 'ideas-module'),
  tinder: createModuleScenario('Tinder', 'tinder-module'),
  tasker: createModuleScenario('Tasker', 'tasker-module'),
  reflector: createModuleScenario('Reflector', 'reflector-module'),
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
