/**
 * Architecture Suggestion Generator
 * AI-powered suggestions for architecture improvements
 */

import { v4 as uuidv4 } from 'uuid';
import { llmManager } from '@/lib/llm/llm-manager';
import {
  DbArchitectureNode,
  DbArchitectureEdge,
  DbArchitectureDrift,
  DbArchitectureSuggestion,
  RefactoringActionType,
} from '@/app/db/models/architecture-graph.types';

export interface SuggestionContext {
  nodes: DbArchitectureNode[];
  edges: DbArchitectureEdge[];
  circularDependencies: string[][];
  layerViolations: Array<{
    edgeId: string;
    sourceNode: string;
    targetNode: string;
    violation: string;
  }>;
  extractionCandidates: Array<{
    nodeId: string;
    reason: string;
    score: number;
  }>;
}

export interface GeneratedSuggestion {
  suggestion_type: RefactoringActionType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string;
  affected_nodes: string[];
  affected_edges: string[];
  predicted_effort: number;
  predicted_impact: number;
  predicted_risk: number;
}

/**
 * Generate suggestions for circular dependencies
 */
function generateCircularDependencySuggestions(
  context: SuggestionContext
): GeneratedSuggestion[] {
  const suggestions: GeneratedSuggestion[] = [];
  const nodeMap = new Map(context.nodes.map(n => [n.id, n]));

  for (const cycle of context.circularDependencies) {
    if (cycle.length < 2) continue;

    const cycleNodes = cycle.map(id => nodeMap.get(id)).filter(Boolean) as DbArchitectureNode[];
    const cyclePaths = cycleNodes.map(n => n.path);

    // Find the best node to break the cycle (lowest coupling score)
    const breakPoint = cycleNodes.reduce((min, node) =>
      node.coupling_score < min.coupling_score ? node : min
    );

    suggestions.push({
      suggestion_type: 'break_circular',
      priority: cycle.length > 3 ? 'high' : 'medium',
      title: `Break circular dependency chain (${cycle.length} modules)`,
      description: `A circular dependency exists between: ${cyclePaths.slice(0, 3).join(' → ')}${cyclePaths.length > 3 ? ` and ${cyclePaths.length - 3} more` : ''}. Consider extracting shared code or introducing an interface.`,
      reasoning: `Circular dependencies make code harder to understand, test, and maintain. They can cause issues with module loading and create tight coupling.`,
      affected_nodes: cycle,
      affected_edges: [],
      predicted_effort: Math.min(cycle.length + 2, 8),
      predicted_impact: 7,
      predicted_risk: 4,
    });
  }

  return suggestions;
}

/**
 * Generate suggestions for layer violations
 */
function generateLayerViolationSuggestions(
  context: SuggestionContext
): GeneratedSuggestion[] {
  const suggestions: GeneratedSuggestion[] = [];
  const nodeMap = new Map(context.nodes.map(n => [n.id, n]));

  // Group violations by type
  const serverToClient = context.layerViolations.filter(v =>
    v.violation.includes('Server layer importing from client')
  );

  if (serverToClient.length > 0) {
    const affectedNodes = new Set<string>();
    const affectedEdges = new Set<string>();

    serverToClient.forEach(v => {
      affectedEdges.add(v.edgeId);
      context.nodes.forEach(n => {
        if (n.path === v.sourceNode || n.path === v.targetNode) {
          affectedNodes.add(n.id);
        }
      });
    });

    suggestions.push({
      suggestion_type: 'move_to_layer',
      priority: serverToClient.length > 5 ? 'critical' : 'high',
      title: `Fix ${serverToClient.length} server-to-client layer violations`,
      description: `Server-side code is importing from client-side modules. This can cause hydration issues, bundle bloat, and runtime errors.`,
      reasoning: `Architecture layers should follow a clear hierarchy where lower layers (server) don't depend on higher layers (client). This ensures proper separation of concerns.`,
      affected_nodes: Array.from(affectedNodes),
      affected_edges: Array.from(affectedEdges),
      predicted_effort: Math.min(serverToClient.length * 2, 10),
      predicted_impact: 8,
      predicted_risk: 5,
    });
  }

  return suggestions;
}

/**
 * Generate suggestions for extraction candidates
 */
function generateExtractionSuggestions(
  context: SuggestionContext
): GeneratedSuggestion[] {
  const suggestions: GeneratedSuggestion[] = [];
  const nodeMap = new Map(context.nodes.map(n => [n.id, n]));

  // Take top 5 extraction candidates
  const topCandidates = context.extractionCandidates.slice(0, 5);

  for (const candidate of topCandidates) {
    const node = nodeMap.get(candidate.nodeId);
    if (!node) continue;

    const outgoingEdges = context.edges.filter(e => e.source_node_id === candidate.nodeId);
    const incomingEdges = context.edges.filter(e => e.target_node_id === candidate.nodeId);

    suggestions.push({
      suggestion_type: 'extract_module',
      priority: candidate.score > 70 ? 'high' : candidate.score > 50 ? 'medium' : 'low',
      title: `Consider splitting ${node.name}`,
      description: `${node.path} has ${candidate.reason.toLowerCase()}. It has ${node.outgoing_count} outgoing and ${node.incoming_count} incoming dependencies.`,
      reasoning: `Large, complex modules with many dependencies are harder to maintain and test. Extracting focused modules improves code organization.`,
      affected_nodes: [candidate.nodeId],
      affected_edges: [...outgoingEdges, ...incomingEdges].map(e => e.id),
      predicted_effort: Math.round(node.loc / 100) + 3,
      predicted_impact: 6,
      predicted_risk: 3,
    });
  }

  return suggestions;
}

/**
 * Generate suggestions for module consolidation
 */
function generateConsolidationSuggestions(
  context: SuggestionContext
): GeneratedSuggestion[] {
  const suggestions: GeneratedSuggestion[] = [];

  // Find small utility modules that could be consolidated
  const utilityNodes = context.nodes.filter(
    n => n.node_type === 'utility' && n.loc < 50 && n.outgoing_count <= 2
  );

  if (utilityNodes.length > 5) {
    suggestions.push({
      suggestion_type: 'consolidate_utilities',
      priority: 'low',
      title: `Consolidate ${utilityNodes.length} small utility modules`,
      description: `Found ${utilityNodes.length} small utility files with few dependencies. Consider grouping related utilities together.`,
      reasoning: `Many small files can increase cognitive load and make the codebase harder to navigate. Consolidating related utilities improves discoverability.`,
      affected_nodes: utilityNodes.map(n => n.id),
      affected_edges: [],
      predicted_effort: 4,
      predicted_impact: 4,
      predicted_risk: 2,
    });
  }

  return suggestions;
}

/**
 * Generate AI-powered suggestions using LLM
 */
async function generateAISuggestions(
  projectId: string,
  context: SuggestionContext,
  scanId?: string
): Promise<GeneratedSuggestion[]> {
  try {
    // Prepare context summary for LLM
    const contextSummary = {
      totalModules: context.nodes.length,
      byType: context.nodes.reduce((acc, n) => {
        acc[n.node_type] = (acc[n.node_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byLayer: context.nodes.reduce((acc, n) => {
        if (n.layer) acc[n.layer] = (acc[n.layer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      circularCount: context.circularDependencies.length,
      layerViolations: context.layerViolations.length,
      avgComplexity: Math.round(
        context.nodes.reduce((sum, n) => sum + n.complexity_score, 0) / context.nodes.length
      ),
      avgCoupling: Math.round(
        context.nodes.reduce((sum, n) => sum + n.coupling_score, 0) / context.nodes.length
      ),
      highCouplingModules: context.nodes.filter(n => n.coupling_score > 70).map(n => ({
        path: n.path,
        coupling: n.coupling_score,
        complexity: n.complexity_score,
      })).slice(0, 5),
    };

    const prompt = `You are an expert software architect analyzing a codebase architecture.

Architecture Summary:
${JSON.stringify(contextSummary, null, 2)}

Based on this analysis, suggest 1-3 specific, actionable architecture improvements.

For each suggestion, provide:
1. suggestion_type: One of: extract_module, merge_modules, break_circular, move_to_layer, introduce_interface, remove_dependency, consolidate_utilities
2. priority: low, medium, high, or critical
3. title: Short descriptive title (max 60 chars)
4. description: Detailed description of what to do
5. reasoning: Why this improvement matters
6. predicted_effort: 1-10 scale
7. predicted_impact: 1-10 scale
8. predicted_risk: 1-10 scale

Respond with a JSON array of suggestions. Focus on the most impactful improvements first.`;

    const response = await llmManager.generate({
      prompt,
      taskType: 'architecture_analysis',
      taskDescription: 'Generate architecture improvement suggestions',
    });

    // Parse response
    try {
      const responseText = response.response || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]) as Array<{
          suggestion_type: RefactoringActionType;
          priority: 'low' | 'medium' | 'high' | 'critical';
          title: string;
          description: string;
          reasoning: string;
          predicted_effort: number;
          predicted_impact: number;
          predicted_risk: number;
        }>;

        return suggestions.map(s => ({
          ...s,
          affected_nodes: [],
          affected_edges: [],
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse AI suggestions:', parseError);
    }

    return [];
  } catch (error) {
    console.error('Failed to generate AI suggestions:', error);
    return [];
  }
}

// Type for suggestion input to repository (uses arrays, not JSON strings)
export interface SuggestionInput {
  project_id: string;
  scan_id: string | null;
  suggestion_type: RefactoringActionType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string;
  affected_nodes: string[];
  affected_edges: string[];
  predicted_effort: number;
  predicted_impact: number;
  predicted_risk: number;
  status: 'pending';
  user_feedback: null;
  implemented_at: null;
}

/**
 * Main function to generate all suggestions
 */
export async function generateArchitectureSuggestions(
  projectId: string,
  context: SuggestionContext,
  options: {
    includeAI?: boolean;
    scanId?: string;
  } = {}
): Promise<SuggestionInput[]> {
  const allSuggestions: GeneratedSuggestion[] = [];

  // Rule-based suggestions
  allSuggestions.push(...generateCircularDependencySuggestions(context));
  allSuggestions.push(...generateLayerViolationSuggestions(context));
  allSuggestions.push(...generateExtractionSuggestions(context));
  allSuggestions.push(...generateConsolidationSuggestions(context));

  // AI-powered suggestions
  if (options.includeAI) {
    const aiSuggestions = await generateAISuggestions(projectId, context, options.scanId);
    allSuggestions.push(...aiSuggestions);
  }

  // Convert to database format
  return allSuggestions.map(s => ({
    project_id: projectId,
    scan_id: options.scanId || null,
    suggestion_type: s.suggestion_type,
    priority: s.priority,
    title: s.title,
    description: s.description,
    reasoning: s.reasoning,
    affected_nodes: s.affected_nodes,
    affected_edges: s.affected_edges,
    predicted_effort: s.predicted_effort,
    predicted_impact: s.predicted_impact,
    predicted_risk: s.predicted_risk,
    status: 'pending' as const,
    user_feedback: null,
    implemented_at: null,
  }));
}

/**
 * Generate drift alerts from analysis
 */
export function generateDriftAlerts(
  projectId: string,
  context: SuggestionContext
): Array<Omit<DbArchitectureDrift, 'id' | 'created_at' | 'updated_at'>> {
  const drifts: Array<Omit<DbArchitectureDrift, 'id' | 'created_at' | 'updated_at'>> = [];

  // Circular dependency drifts
  for (const cycle of context.circularDependencies) {
    drifts.push({
      project_id: projectId,
      node_id: cycle[0] || null,
      edge_id: null,
      drift_type: 'circular_dependency',
      severity: cycle.length > 4 ? 'critical' : 'warning',
      title: `Circular dependency detected (${cycle.length} modules)`,
      description: `A circular dependency chain was detected involving ${cycle.length} modules.`,
      detected_pattern: JSON.stringify({ cycle }),
      ideal_pattern: JSON.stringify({ pattern: 'acyclic_graph' }),
      status: 'active',
      resolved_at: null,
    });
  }

  // Layer violation drifts
  for (const violation of context.layerViolations) {
    drifts.push({
      project_id: projectId,
      node_id: null,
      edge_id: violation.edgeId,
      drift_type: 'layer_violation',
      severity: 'warning',
      title: violation.violation,
      description: `${violation.sourceNode} → ${violation.targetNode}`,
      detected_pattern: JSON.stringify(violation),
      ideal_pattern: JSON.stringify({ rule: 'layer_hierarchy' }),
      status: 'active',
      resolved_at: null,
    });
  }

  return drifts;
}
