// Configuration constants for the application

// Default port ranges for different types of projects
export const DEFAULT_PORT_RANGES = {
  development: { start: 3000, end: 3999 },
  production: { start: 4000, end: 4999 },
  testing: { start: 5000, end: 5999 }
};

// Default project settings
export const DEFAULT_PROJECT_SETTINGS = {
  allowMultipleInstances: false,
  gitBranch: 'main',
  gitAutoSync: false
};

// Application constants
export const APP_CONSTANTS = {
  maxProjectNameLength: 50,
  maxDescriptionLength: 200,
  defaultTimeout: 30000
};