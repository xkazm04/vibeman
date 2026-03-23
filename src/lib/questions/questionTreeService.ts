/**
 * QuestionTreeService
 *
 * Owns all recursive tree operations on the question graph:
 * forest construction, ancestry traversal, depth tracking, and strategic brief generation.
 *
 * Extracted from question.repository.ts to separate flat CRUD (repository)
 * from recursive tree logic (this service).
 */

import { questionRepository } from '@/app/db/repositories/question.repository';
import type { DbQuestion } from '@/app/db/models/types';

// ─── Tree Node Type ──────────────────────────────────────────────────────────

export interface QuestionTreeNode extends DbQuestion {
  children: QuestionTreeNode[];
}

// ─── Forest Construction ─────────────────────────────────────────────────────

/**
 * Build a forest (array of trees) from a flat list of questions.
 * Questions with parent_id = null are roots.
 */
export function buildQuestionForest(questions: DbQuestion[]): QuestionTreeNode[] {
  const nodeMap = new Map<string, QuestionTreeNode>();
  const roots: QuestionTreeNode[] = [];

  for (const q of questions) {
    nodeMap.set(q.id, { ...q, children: [] });
  }

  for (const q of questions) {
    const node = nodeMap.get(q.id)!;
    if (q.parent_id && nodeMap.has(q.parent_id)) {
      nodeMap.get(q.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  roots.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return roots;
}

// ─── Tree Statistics ─────────────────────────────────────────────────────────

export function countNodes(node: QuestionTreeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

export function computeTreeDepth(node: QuestionTreeNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(computeTreeDepth));
}

export function countAnswered(node: QuestionTreeNode): number {
  const self = node.status === 'answered' ? 1 : 0;
  return self + node.children.reduce((sum, child) => sum + countAnswered(child), 0);
}

export function countPending(node: QuestionTreeNode): number {
  const self = node.status === 'pending' ? 1 : 0;
  return self + node.children.reduce((sum, child) => sum + countPending(child), 0);
}

// ─── QuestionTreeService ─────────────────────────────────────────────────────

export const questionTreeService = {
  /**
   * Get all question trees for a project as a nested structure.
   */
  getQuestionTrees(projectId: string): QuestionTreeNode[] {
    const allQuestions = questionRepository.getQuestionsByProject(projectId);
    return buildQuestionForest(allQuestions);
  },

  /**
   * Get root questions (no parent) for a project.
   */
  getRootQuestions(projectId: string): DbQuestion[] {
    return questionRepository.getRootQuestions(projectId);
  },

  /**
   * Get child questions of a parent question.
   */
  getChildQuestions(parentId: string): DbQuestion[] {
    return questionRepository.getChildQuestions(parentId);
  },

  /**
   * Get full ancestry chain from a question up to root.
   * Returns array ordered root-first: [root, ..., parent, self]
   */
  getAncestryChain(questionId: string): DbQuestion[] {
    return questionRepository.getAncestryChain(questionId);
  },

  /**
   * Get the full subtree under a question (flat array including root).
   */
  getSubtree(questionId: string): DbQuestion[] {
    return questionRepository.getSubtree(questionId);
  },

  /**
   * Get the maximum tree depth for any question tree in this project.
   */
  getMaxTreeDepth(projectId: string): number {
    return questionRepository.getMaxTreeDepth(projectId);
  },

  /**
   * Save a strategic brief on a question (typically the root of a deep tree).
   */
  saveStrategicBrief(questionId: string, brief: string): DbQuestion | null {
    return questionRepository.saveStrategicBrief(questionId, brief);
  },

  /**
   * Compute per-tree statistics for a project's question forest.
   */
  getTreeStats(trees: QuestionTreeNode[]) {
    return trees.map(root => ({
      rootId: root.id,
      rootQuestion: root.question,
      context: root.context_map_title,
      totalNodes: countNodes(root),
      maxDepth: computeTreeDepth(root),
      answeredCount: countAnswered(root),
      pendingCount: countPending(root),
      hasStrategicBrief: !!root.strategic_brief,
    }));
  },
};
