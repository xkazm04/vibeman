/**
 * Example Usage: Idea Aggregation Service
 * This file demonstrates how to use the ideaAggregationService in React components
 */

import {
  getAllIdeasWithMetadata,
  getProjectStats,
  getContextStats,
  getIdeasGroupedByProjectAndContext,
  getOverallStats,
  type IdeaWithMetadata,
  type ProjectStats,
  type ContextStats,
  type GroupedIdeas,
  type OverallStats,
} from './ideaAggregationService';
import { useContextStore } from '@/stores/contextStore';

/**
 * Example 1: Get all ideas with enriched metadata
 */
function ExampleGetAllIdeas() {
  const contextStore = useContextStore();
  const contexts = contextStore.contexts;

  // Get all ideas with project names and context colors
  const ideasWithMetadata = getAllIdeasWithMetadata(contexts);

  console.log('Total ideas:', ideasWithMetadata.length);
  console.log('First idea:', ideasWithMetadata[0]);
  // Output: { id, title, description, projectName, contextName, contextColor, ... }
}

/**
 * Example 2: Get project statistics
 */
function ExampleGetProjectStats() {
  const projectStats = getProjectStats();

  // Display stats for each project
  projectStats.forEach(stats => {
    console.log(`Project: ${stats.projectName}`);
    console.log(`  Total Ideas: ${stats.totalIdeas}`);
    console.log(`  Pending: ${stats.statusDistribution.pending}`);
    console.log(`  Accepted: ${stats.statusDistribution.accepted}`);
    console.log(`  Rejected: ${stats.statusDistribution.rejected}`);
    console.log(`  Implemented: ${stats.statusDistribution.implemented}`);
    console.log(`  Date Range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
    console.log(`  Avg Effort: ${stats.averageScanMetrics.effort?.toFixed(2)}`);
    console.log(`  Avg Impact: ${stats.averageScanMetrics.impact?.toFixed(2)}`);
  });

  // Find project with most ideas
  const topProject = projectStats[0];
  console.log(`Top project: ${topProject.projectName} with ${topProject.totalIdeas} ideas`);
}

/**
 * Example 3: Get context statistics across all projects
 */
function ExampleGetContextStats() {
  const contextStore = useContextStore();
  const contexts = contextStore.contexts;

  const contextStats = getContextStats(contexts);

  // Display stats for each context
  contextStats.forEach(stats => {
    console.log(`Context: ${stats.contextName} (${stats.projectName})`);
    console.log(`  Color: ${stats.contextColor}`);
    console.log(`  Total Ideas: ${stats.ideaCount}`);
    console.log(`  Pending: ${stats.statusDistribution.pending}`);
    console.log(`  Implemented: ${stats.statusDistribution.implemented}`);
  });

  // Find most active context
  const topContext = contextStats[0];
  console.log(`Top context: ${topContext.contextName} with ${topContext.ideaCount} ideas`);
}

/**
 * Example 4: Get ideas grouped by project and context
 */
function ExampleGetGroupedIdeas() {
  const contextStore = useContextStore();
  const contexts = contextStore.contexts;

  const groupedIdeas = getIdeasGroupedByProjectAndContext(contexts);

  // Display grouped structure
  groupedIdeas.forEach(projectGroup => {
    console.log(`Project: ${projectGroup.projectName} (${projectGroup.totalIdeas} ideas)`);

    projectGroup.contexts.forEach(contextGroup => {
      console.log(`  Context: ${contextGroup.contextName} (${contextGroup.count} ideas)`);

      contextGroup.ideas.slice(0, 3).forEach(idea => {
        console.log(`    - ${idea.title} [${idea.status}]`);
      });
    });
  });
}

/**
 * Example 5: Get overall statistics summary
 */
function ExampleGetOverallStats() {
  const contextStore = useContextStore();
  const contexts = contextStore.contexts;

  const overallStats = getOverallStats(contexts);

  console.log('=== Overall Statistics ===');
  console.log(`Total Ideas: ${overallStats.totalIdeas}`);
  console.log(`Total Projects: ${overallStats.totalProjects}`);
  console.log(`Total Contexts: ${overallStats.totalContexts}`);
  console.log('\nStatus Distribution:');
  console.log(`  Pending: ${overallStats.statusDistribution.pending}`);
  console.log(`  Accepted: ${overallStats.statusDistribution.accepted}`);
  console.log(`  Rejected: ${overallStats.statusDistribution.rejected}`);
  console.log(`  Implemented: ${overallStats.statusDistribution.implemented}`);

  console.log('\nTop 3 Projects:');
  overallStats.topProjects.forEach((project, idx) => {
    console.log(`  ${idx + 1}. ${project.projectName} - ${project.ideaCount} ideas`);
  });

  console.log('\nTop 3 Contexts:');
  overallStats.topContexts.forEach((context, idx) => {
    console.log(`  ${idx + 1}. ${context.contextName} - ${context.ideaCount} ideas`);
  });
}

/**
 * Example 6: React Component Usage
 */
function TotalViewDashboardExample() {
  const contextStore = useContextStore();
  const contexts = contextStore.contexts;

  // Load data
  const overallStats = getOverallStats(contexts);
  const projectStats = getProjectStats();
  const groupedIdeas = getIdeasGroupedByProjectAndContext(contexts);

  return (
    <div>
      {/* Header with overall stats */}
      <header>
        <h1>Total Ideas: {overallStats.totalIdeas}</h1>
        <div>
          {overallStats.topProjects.map(project => (
            <div key={project.projectId}>
              {project.projectName}: {project.ideaCount} ideas
            </div>
          ))}
        </div>
      </header>

      {/* Project breakdown */}
      <section>
        {groupedIdeas.map(projectGroup => (
          <div key={projectGroup.projectId}>
            <h2>{projectGroup.projectName} ({projectGroup.totalIdeas})</h2>
            {projectGroup.contexts.map(contextGroup => (
              <div key={contextGroup.contextId || 'no-context'}>
                <h3 style={{ color: contextGroup.contextColor }}>
                  {contextGroup.contextName} ({contextGroup.count})
                </h3>
                {contextGroup.ideas.map(idea => (
                  <div key={idea.id}>
                    {idea.title} - {idea.status}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

/**
 * Example 7: Filtering and searching within aggregated data
 */
function ExampleFilteringIdeas() {
  const contextStore = useContextStore();
  const contexts = contextStore.contexts;

  const allIdeas = getAllIdeasWithMetadata(contexts);

  // Filter by status
  const pendingIdeas = allIdeas.filter(idea => idea.status === 'pending');
  console.log(`Pending ideas: ${pendingIdeas.length}`);

  // Filter by project
  const projectIdeas = allIdeas.filter(idea => idea.projectName === 'My Project');
  console.log(`Ideas in 'My Project': ${projectIdeas.length}`);

  // Search by keyword
  const searchQuery = 'authentication';
  const searchResults = allIdeas.filter(idea =>
    idea.title.toLowerCase().includes(searchQuery) ||
    idea.description?.toLowerCase().includes(searchQuery)
  );
  console.log(`Search results for '${searchQuery}': ${searchResults.length}`);

  // Filter by date range
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentIdeas = allIdeas.filter(idea =>
    new Date(idea.created_at) >= thirtyDaysAgo
  );
  console.log(`Recent ideas (last 30 days): ${recentIdeas.length}`);
}

/**
 * Example 8: Performance monitoring
 */
function ExamplePerformanceMonitoring() {
  const contextStore = useContextStore();
  const contexts = contextStore.contexts;

  console.time('getAllIdeasWithMetadata');
  const ideas = getAllIdeasWithMetadata(contexts);
  console.timeEnd('getAllIdeasWithMetadata');

  console.time('getProjectStats');
  const projectStats = getProjectStats();
  console.timeEnd('getProjectStats');

  console.time('getContextStats');
  const contextStats = getContextStats(contexts);
  console.timeEnd('getContextStats');

  console.time('getIdeasGroupedByProjectAndContext');
  const grouped = getIdeasGroupedByProjectAndContext(contexts);
  console.timeEnd('getIdeasGroupedByProjectAndContext');

  console.time('getOverallStats');
  const overall = getOverallStats(contexts);
  console.timeEnd('getOverallStats');

  console.log('Performance summary:');
  console.log(`  Total ideas processed: ${ideas.length}`);
  console.log(`  Projects analyzed: ${projectStats.length}`);
  console.log(`  Contexts analyzed: ${contextStats.length}`);
}

// Export examples for testing
export {
  ExampleGetAllIdeas,
  ExampleGetProjectStats,
  ExampleGetContextStats,
  ExampleGetGroupedIdeas,
  ExampleGetOverallStats,
  TotalViewDashboardExample,
  ExampleFilteringIdeas,
  ExamplePerformanceMonitoring,
};
