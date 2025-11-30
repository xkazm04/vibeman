// Project utilities and API functions
export * from './projectUtils';
// Exclude getConnectedProjects from projectApi as it's already exported from projectUtils
export {
  fetchProjectsDirectly,
  deleteProject,
  getRelatedProject
} from './projectApi';