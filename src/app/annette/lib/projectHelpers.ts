import { Project } from "@/types";

/**
 * Creates a project context object for API requests
 */
export function createProjectContext(project: Project) {
  return {
    state: { activeProject: project },
    version: 1
  };
}

/**
 * Gets the hardcoded active project for testing
 * TODO: Replace with actual project store integration
 */
export function getHardcodedActiveProject() {
  return {
    state: {
      activeProject: {
        id: "6546a5e3-78a0-4140-9b0f-5be5a9161189",
        name: "investigator",
        path: "C:\\Users\\kazda\\kiro\\investigator",
        port: 3002,
        type: "other",
        allowMultipleInstances: false,
        basePort: 3002,
        runScript: "npm run dev"
      }
    },
    version: 1
  };
}
