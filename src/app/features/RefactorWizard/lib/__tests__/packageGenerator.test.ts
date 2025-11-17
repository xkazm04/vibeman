import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { generatePackages } from '../packageGenerator';
import { RefactorOpportunity, ProjectContext } from '../types';

// Mock llmManager
jest.mock('@/lib/llm', () => ({
  llmManager: {
    generate: jest.fn(),
  },
}));

describe('packageGenerator', () => {
  const mockOpportunities: RefactorOpportunity[] = [
    {
      id: 'opp-1',
      title: 'Fix any type in utils.ts',
      description: 'Replace any type with specific type',
      category: 'code-quality',
      severity: 'high',
      impact: 'Improves type safety',
      effort: 'low',
      files: ['src/lib/utils.ts'],
      autoFixAvailable: false,
    } as RefactorOpportunity,
    {
      id: 'opp-2',
      title: 'Add return type to function',
      description: 'Explicit return types improve type safety',
      category: 'code-quality',
      severity: 'medium',
      impact: 'Better type checking',
      effort: 'low',
      files: ['src/lib/helpers.ts'],
      autoFixAvailable: false,
    } as RefactorOpportunity,
    {
      id: 'opp-3',
      title: 'Fix security vulnerability in auth',
      description: 'SQL injection risk',
      category: 'security',
      severity: 'critical',
      impact: 'Prevents SQL injection',
      effort: 'medium',
      files: ['src/api/auth/login.ts'],
      autoFixAvailable: false,
    } as RefactorOpportunity,
    {
      id: 'opp-4',
      title: 'Optimize database query',
      description: 'N+1 query issue',
      category: 'performance',
      severity: 'high',
      impact: 'Faster queries',
      effort: 'medium',
      files: ['src/api/users/list.ts'],
      autoFixAvailable: false,
    } as RefactorOpportunity,
    {
      id: 'opp-5',
      title: 'Remove unused imports',
      description: 'Clean up unused code',
      category: 'maintainability',
      severity: 'low',
      impact: 'Cleaner codebase',
      effort: 'low',
      files: ['src/components/Button.tsx'],
      autoFixAvailable: true,
    } as RefactorOpportunity,
    {
      id: 'opp-6',
      title: 'Fix TypeScript error in form',
      description: 'Type mismatch in form component',
      category: 'code-quality',
      severity: 'high',
      impact: 'Better type safety',
      effort: 'low',
      files: ['src/components/Form.tsx'],
      autoFixAvailable: false,
    } as RefactorOpportunity,
  ];

  const mockContext: ProjectContext = {
    claudeMd: '# Test Project\n\nThis is a test project for refactoring.',
    readme: '# README\n\nProject description',
    projectType: 'next.js',
    techStack: ['Next.js 14', 'TypeScript 5.0', 'React 18'],
    architecture: 'Next.js app with App Router, Tailwind CSS, and Zustand state management',
    priorities: ['Type safety', 'Security first', 'Performance optimization'],
    conventions: ['Use data-testid for all interactive elements', 'Follow Blueprint design patterns'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI-powered package generation', () => {
    it('should generate packages from opportunities', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue(JSON.stringify({
        packages: [
          {
            name: 'TypeScript Type Safety Improvements',
            description: 'Fix all TypeScript type issues across the codebase',
            strategy: {
              type: 'pattern-based',
              rationale: 'Type safety is critical for long-term maintainability',
              approach: 'Fix shared utilities first, then components',
            },
            category: 'migration',
            scope: 'project',
            modulePattern: null,
            opportunityIds: ['opp-1', 'opp-2', 'opp-6'],
            impact: 'high',
            effort: 'medium',
            estimatedHours: 6,
            dependsOn: [],
            enables: [],
            strategicGoal: 'Achieve 100% type safety in the codebase',
            expectedOutcomes: [
              'Zero implicit any types',
              'All functions have explicit return types',
            ],
            relatedDocs: ['tsconfig.json'],
          },
          {
            name: 'Security Hardening',
            description: 'Address critical security vulnerabilities',
            strategy: {
              type: 'pattern-based',
              rationale: 'Security is top priority',
              approach: 'Fix authentication issues first',
            },
            category: 'security',
            scope: 'project',
            modulePattern: 'src/api',
            opportunityIds: ['opp-3'],
            impact: 'critical',
            effort: 'medium',
            estimatedHours: 4,
            dependsOn: [],
            enables: [],
            strategicGoal: 'Eliminate all critical security vulnerabilities',
            expectedOutcomes: ['No SQL injection vulnerabilities'],
            relatedDocs: [],
          },
        ],
        reasoning: 'Organized into type safety and security packages based on priority',
      }));

      const packages = await generatePackages(mockOpportunities, mockContext);

      expect(packages.length).toBe(2);
      expect(packages[0]).toHaveProperty('name');
      expect(packages[0]).toHaveProperty('opportunities');
      expect(packages[0]).toHaveProperty('strategicGoal');
      expect(packages[0].opportunities.length).toBe(3);
      expect(packages[1].opportunities.length).toBe(1);

      // Verify LLM was called
      expect(llmManager.generate).toHaveBeenCalledTimes(1);
      expect(llmManager.generate).toHaveBeenCalledWith(
        expect.stringContaining('senior software architect'),
        expect.objectContaining({
          provider: 'gemini',
          model: 'gemini-2.0-flash-exp',
          temperature: 0.3,
        })
      );
    });

    it('should handle markdown code blocks in AI response', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue(`\`\`\`json
{
  "packages": [
    {
      "name": "Test Package",
      "description": "Test",
      "strategy": { "type": "pattern-based", "rationale": "Test", "approach": "Test" },
      "category": "cleanup",
      "scope": "project",
      "opportunityIds": ["opp-1", "opp-2"],
      "impact": "medium",
      "effort": "small",
      "estimatedHours": 4,
      "dependsOn": [],
      "enables": [],
      "strategicGoal": "Test goal",
      "expectedOutcomes": ["Test outcome"],
      "relatedDocs": []
    }
  ]
}
\`\`\``);

      const packages = await generatePackages(mockOpportunities, mockContext);

      expect(packages.length).toBe(1);
      expect(packages[0].name).toBe('Test Package');
    });

    it('should filter out packages with no valid opportunities', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue(JSON.stringify({
        packages: [
          {
            name: 'Valid Package',
            description: 'Has valid opportunities',
            strategy: { type: 'pattern-based', rationale: 'Test', approach: 'Test' },
            category: 'cleanup',
            scope: 'project',
            opportunityIds: ['opp-1'],
            impact: 'medium',
            effort: 'small',
            estimatedHours: 4,
            dependsOn: [],
            enables: [],
            strategicGoal: 'Test',
            expectedOutcomes: [],
            relatedDocs: [],
          },
          {
            name: 'Invalid Package',
            description: 'Has invalid opportunity IDs',
            strategy: { type: 'pattern-based', rationale: 'Test', approach: 'Test' },
            category: 'cleanup',
            scope: 'project',
            opportunityIds: ['opp-999', 'opp-888'],
            impact: 'medium',
            effort: 'small',
            estimatedHours: 4,
            dependsOn: [],
            enables: [],
            strategicGoal: 'Test',
            expectedOutcomes: [],
            relatedDocs: [],
          },
        ],
      }));

      const packages = await generatePackages(mockOpportunities, mockContext);

      expect(packages.length).toBe(1);
      expect(packages[0].name).toBe('Valid Package');
    });

    it('should calculate execution order correctly', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue(JSON.stringify({
        packages: [
          {
            name: 'Foundational Package',
            description: 'No dependencies',
            strategy: { type: 'pattern-based', rationale: 'Test', approach: 'Test' },
            category: 'cleanup',
            scope: 'project',
            opportunityIds: ['opp-1'],
            impact: 'high',
            effort: 'medium',
            estimatedHours: 4,
            dependsOn: [],
            enables: ['Dependent Package'],
            strategicGoal: 'Foundation',
            expectedOutcomes: [],
            relatedDocs: [],
          },
          {
            name: 'Dependent Package',
            description: 'Depends on foundational',
            strategy: { type: 'pattern-based', rationale: 'Test', approach: 'Test' },
            category: 'cleanup',
            scope: 'project',
            opportunityIds: ['opp-2'],
            impact: 'medium',
            effort: 'small',
            estimatedHours: 2,
            dependsOn: ['Foundational Package'],
            enables: [],
            strategicGoal: 'Build on foundation',
            expectedOutcomes: [],
            relatedDocs: [],
          },
        ],
      }));

      const packages = await generatePackages(mockOpportunities, mockContext);

      expect(packages[0].executionOrder).toBe(1);
      expect(packages[1].executionOrder).toBe(2);
    });
  });

  describe('Fallback package generation', () => {
    it('should fall back to rule-based packaging on AI failure', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockRejectedValue(new Error('AI service unavailable'));

      const packages = await generatePackages(mockOpportunities, mockContext);

      // Should still generate packages (fallback mode)
      expect(packages.length).toBeGreaterThan(0);
      expect(packages[0]).toHaveProperty('name');
      expect(packages[0]).toHaveProperty('opportunities');
    });

    it('should create category-based packages in fallback mode', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockRejectedValue(new Error('AI failed'));

      const packages = await generatePackages(mockOpportunities, mockContext, {
        minIssuesPerPackage: 1, // Allow small packages for testing
      });

      // Should have packages for each category with enough issues
      const categories = new Set(packages.map(p => p.name));
      expect(categories.size).toBeGreaterThan(0);

      // All packages should have opportunities
      packages.forEach(pkg => {
        expect(pkg.opportunities.length).toBeGreaterThan(0);
      });
    });

    it('should handle invalid JSON in AI response', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue('This is not JSON');

      const packages = await generatePackages(mockOpportunities, mockContext);

      // Should fall back to rule-based packaging
      expect(packages.length).toBeGreaterThan(0);
    });
  });

  describe('Package optimization', () => {
    it('should split large packages into phases', async () => {
      const largeOpportunities: RefactorOpportunity[] = [];
      for (let i = 0; i < 60; i++) {
        largeOpportunities.push({
          id: `opp-${i}`,
          title: `Issue ${i}`,
          description: 'Test issue',
          category: 'code-quality',
          severity: 'medium',
          impact: 'Test',
          effort: 'low',
          files: [`file-${i}.ts`],
          autoFixAvailable: false,
        } as RefactorOpportunity);
      }

      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue(JSON.stringify({
        packages: [
          {
            name: 'Large Package',
            description: 'Has many issues',
            strategy: { type: 'pattern-based', rationale: 'Test', approach: 'Test' },
            category: 'cleanup',
            scope: 'project',
            opportunityIds: largeOpportunities.map(o => o.id),
            impact: 'high',
            effort: 'large',
            estimatedHours: 30,
            dependsOn: [],
            enables: [],
            strategicGoal: 'Fix all issues',
            expectedOutcomes: [],
            relatedDocs: [],
          },
        ],
      }));

      const packages = await generatePackages(largeOpportunities, mockContext, {
        maxIssuesPerPackage: 50,
      });

      expect(packages[0].phases).toBeDefined();
      expect(packages[0].phases!.length).toBeGreaterThan(1);
    });

    it('should respect minIssuesPerPackage constraint', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue(JSON.stringify({
        packages: [
          {
            name: 'Small Package',
            description: 'Too few issues',
            strategy: { type: 'pattern-based', rationale: 'Test', approach: 'Test' },
            category: 'cleanup',
            scope: 'project',
            opportunityIds: ['opp-1'],
            impact: 'low',
            effort: 'small',
            estimatedHours: 1,
            dependsOn: [],
            enables: [],
            strategicGoal: 'Test',
            expectedOutcomes: [],
            relatedDocs: [],
          },
          {
            name: 'Large Enough Package',
            description: 'Has enough issues',
            strategy: { type: 'pattern-based', rationale: 'Test', approach: 'Test' },
            category: 'cleanup',
            scope: 'project',
            opportunityIds: ['opp-2', 'opp-3', 'opp-4', 'opp-5', 'opp-6'],
            impact: 'medium',
            effort: 'medium',
            estimatedHours: 10,
            dependsOn: [],
            enables: [],
            strategicGoal: 'Test',
            expectedOutcomes: [],
            relatedDocs: [],
          },
        ],
      }));

      const packages = await generatePackages(mockOpportunities, mockContext, {
        minIssuesPerPackage: 5,
      });

      // Should filter out package with < 5 issues
      expect(packages.length).toBe(1);
      expect(packages[0].name).toBe('Large Enough Package');
    });
  });

  describe('Custom options', () => {
    it('should use custom provider and model', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue(JSON.stringify({
        packages: [],
      }));

      await generatePackages(mockOpportunities, mockContext, {
        provider: 'openai',
        model: 'gpt-4',
      });

      expect(llmManager.generate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
        })
      );
    });

    it('should respect maxPackages option', async () => {
      const { llmManager } = await import('@/lib/llm');
      (llmManager.generate as jest.Mock).mockResolvedValue(JSON.stringify({
        packages: Array.from({ length: 5 }, (_, i) => ({
          name: `Package ${i + 1}`,
          description: 'Test',
          strategy: { type: 'pattern-based', rationale: 'Test', approach: 'Test' },
          category: 'cleanup',
          scope: 'project',
          opportunityIds: [`opp-${i + 1}`],
          impact: 'medium',
          effort: 'small',
          estimatedHours: 4,
          dependsOn: [],
          enables: [],
          strategicGoal: 'Test',
          expectedOutcomes: [],
          relatedDocs: [],
        })),
      }));

      await generatePackages(mockOpportunities, mockContext, {
        maxPackages: 3,
      });

      // Verify prompt mentions maxPackages
      expect(llmManager.generate).toHaveBeenCalledWith(
        expect.stringContaining('Create **3** strategic refactoring packages'),
        expect.any(Object)
      );
    });
  });
});
