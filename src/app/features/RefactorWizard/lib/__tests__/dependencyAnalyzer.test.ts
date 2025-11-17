import { describe, it, expect } from '@jest/globals';
import { buildDependencyGraph, topologicalSort, validatePackageSelection, calculateExecutionLevels } from '../dependencyAnalyzer';
import { RefactoringPackage } from '../types';

describe('dependencyAnalyzer', () => {
  const mockPackages: RefactoringPackage[] = [
    {
      id: 'pkg-1',
      name: 'Foundation Package',
      description: 'Foundational package',
      strategy: {
        type: 'pattern-based',
        rationale: 'Test',
        approach: 'Test'
      },
      category: 'cleanup',
      scope: 'project',
      opportunities: [],
      issueCount: 0,
      impact: 'high',
      effort: 'medium',
      estimatedHours: 4,
      dependsOn: [],
      enables: [],
      executionOrder: 1,
      strategicGoal: 'Test goal',
      expectedOutcomes: [],
      relatedDocs: [],
      selected: false,
      executed: false,
    } as RefactoringPackage,
    {
      id: 'pkg-2',
      name: 'Dependent Package',
      description: 'Depends on pkg-1',
      strategy: {
        type: 'pattern-based',
        rationale: 'Test',
        approach: 'Test'
      },
      category: 'cleanup',
      scope: 'project',
      opportunities: [],
      issueCount: 0,
      impact: 'high',
      effort: 'medium',
      estimatedHours: 4,
      dependsOn: ['pkg-1'],
      enables: [],
      executionOrder: 2,
      strategicGoal: 'Test goal',
      expectedOutcomes: [],
      relatedDocs: [],
      selected: false,
      executed: false,
    } as RefactoringPackage,
    {
      id: 'pkg-3',
      name: 'Leaf Package',
      description: 'Depends on pkg-1 and pkg-2',
      strategy: {
        type: 'pattern-based',
        rationale: 'Test',
        approach: 'Test'
      },
      category: 'cleanup',
      scope: 'project',
      opportunities: [],
      issueCount: 0,
      impact: 'high',
      effort: 'medium',
      estimatedHours: 4,
      dependsOn: ['pkg-1', 'pkg-2'],
      enables: [],
      executionOrder: 3,
      strategicGoal: 'Test goal',
      expectedOutcomes: [],
      relatedDocs: [],
      selected: false,
      executed: false,
    } as RefactoringPackage,
  ];

  describe('buildDependencyGraph', () => {
    it('should build graph with correct nodes and edges', () => {
      const graph = buildDependencyGraph(mockPackages);

      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(3); // pkg-1->pkg-2, pkg-1->pkg-3, pkg-2->pkg-3
    });
  });

  describe('topologicalSort', () => {
    it('should sort packages in dependency order', () => {
      const sorted = topologicalSort(mockPackages);

      expect(sorted[0]).toBe('pkg-1'); // Foundational
      expect(sorted.indexOf('pkg-1')).toBeLessThan(sorted.indexOf('pkg-2'));
      expect(sorted.indexOf('pkg-2')).toBeLessThan(sorted.indexOf('pkg-3'));
    });
  });

  describe('validatePackageSelection', () => {
    it('should return missing prerequisites', () => {
      const selected = new Set(['pkg-3']); // Missing pkg-1 and pkg-2
      const missing = validatePackageSelection(selected, mockPackages);

      expect(missing).toContain('pkg-1');
      expect(missing).toContain('pkg-2');
    });

    it('should return empty array when all prerequisites selected', () => {
      const selected = new Set(['pkg-1', 'pkg-2', 'pkg-3']);
      const missing = validatePackageSelection(selected, mockPackages);

      expect(missing).toHaveLength(0);
    });
  });

  describe('calculateExecutionLevels', () => {
    it('should calculate correct levels', () => {
      const levels = calculateExecutionLevels(mockPackages);

      expect(levels.get('pkg-1')).toBe(0); // Foundational
      expect(levels.get('pkg-2')).toBe(1); // Depends on pkg-1
      expect(levels.get('pkg-3')).toBe(2); // Depends on pkg-2
    });
  });
});
