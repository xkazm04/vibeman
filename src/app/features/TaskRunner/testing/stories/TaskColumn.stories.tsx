/**
 * TaskColumn Component Stories
 *
 * Demonstrates all visual states and interactions of the TaskColumn component.
 * Shows project grouping, selection states, and requirement lists.
 */

'use client';

import React, { useState } from 'react';
import TaskColumn from '../../TaskColumn';
import {
  createMockRequirementsForProject,
  createMixedStatusRequirements,
  generateProjectId,
} from '../mockGenerators';
import { getRequirementId } from '../testUtils';
import type { ProjectRequirement } from '../../lib/types';
import { isRequirementRunning, isRequirementQueued } from '../../lib/types';

// ============================================================================
// Story Wrapper Component
// ============================================================================

interface StoryWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}

function StoryWrapper({ title, description, children, wide }: StoryWrapperProps) {
  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <div className={wide ? 'max-w-2xl' : 'max-w-sm'}>{children}</div>
    </div>
  );
}

// ============================================================================
// Individual Stories
// ============================================================================

/**
 * Empty column with no requirements
 */
export function EmptyColumn() {
  return (
    <StoryWrapper title="Empty Column" description="No requirements in project">
      <TaskColumn
        projectId="empty-project"
        projectName="Empty Project"
        projectPath="/projects/empty"
        requirements={[]}
        selectedRequirements={new Set()}
        onToggleSelect={() => {}}
        onDelete={() => {}}
        onToggleProjectSelection={() => {}}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Column with a few requirements
 */
export function FewRequirements() {
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const projectId = 'demo-project';
  const requirements = createMockRequirementsForProject(projectId, 3, {
    projectName: 'Demo Project',
  });

  const toggleSelect = (reqId: string) => {
    setSelectedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  return (
    <StoryWrapper title="Few Requirements" description="Column with 3 requirements">
      <TaskColumn
        projectId={projectId}
        projectName="Demo Project"
        projectPath="/projects/demo"
        requirements={requirements}
        selectedRequirements={selectedRequirements}
        onToggleSelect={toggleSelect}
        onDelete={(reqId) => console.log('Delete:', reqId)}
        onToggleProjectSelection={() => console.log('Toggle project selection')}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Column with many requirements (scrollable)
 */
export function ManyRequirements() {
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const projectId = 'large-project';
  const requirements = createMockRequirementsForProject(projectId, 15, {
    projectName: 'Large Project',
  });

  const toggleSelect = (reqId: string) => {
    setSelectedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  return (
    <StoryWrapper title="Many Requirements" description="Scrollable list with 15 requirements">
      <TaskColumn
        projectId={projectId}
        projectName="Large Project"
        projectPath="/projects/large"
        requirements={requirements}
        selectedRequirements={selectedRequirements}
        onToggleSelect={toggleSelect}
        onDelete={(reqId) => console.log('Delete:', reqId)}
        onToggleProjectSelection={() => console.log('Toggle project selection')}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Column with mixed statuses
 */
export function MixedStatuses() {
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const projectId = 'mixed-project';
  const requirements = createMixedStatusRequirements(projectId);

  // Add project info
  requirements.forEach((req) => {
    req.projectName = 'Mixed Status Project';
    req.projectPath = '/projects/mixed';
  });

  const toggleSelect = (reqId: string) => {
    const req = requirements.find((r) => getRequirementId(r) === reqId);
    if (req && (isRequirementRunning(req.status) || isRequirementQueued(req.status))) return;

    setSelectedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  return (
    <StoryWrapper
      title="Mixed Statuses"
      description="Shows all status variants (idle, queued, running, completed, failed, session-limit)"
    >
      <TaskColumn
        projectId={projectId}
        projectName="Mixed Status Project"
        projectPath="/projects/mixed"
        requirements={requirements}
        selectedRequirements={selectedRequirements}
        onToggleSelect={toggleSelect}
        onDelete={(reqId) => console.log('Delete:', reqId)}
        onToggleProjectSelection={() => console.log('Toggle project selection')}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Column with all items selected
 */
export function AllSelected() {
  const projectId = 'selected-project';
  const requirements = createMockRequirementsForProject(projectId, 5, {
    projectName: 'All Selected Project',
  });

  // Pre-select all
  const selectedRequirements = new Set(requirements.map(getRequirementId));

  return (
    <StoryWrapper title="All Selected" description="All requirements are selected">
      <TaskColumn
        projectId={projectId}
        projectName="All Selected Project"
        projectPath="/projects/all-selected"
        requirements={requirements}
        selectedRequirements={selectedRequirements}
        onToggleSelect={() => {}}
        onDelete={() => {}}
        onToggleProjectSelection={() => console.log('Toggle project selection')}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Column with some items selected (partial selection)
 */
export function PartialSelection() {
  const projectId = 'partial-project';
  const requirements = createMockRequirementsForProject(projectId, 5, {
    projectName: 'Partial Selection Project',
  });

  // Select only first 2
  const selectedRequirements = new Set(requirements.slice(0, 2).map(getRequirementId));

  return (
    <StoryWrapper title="Partial Selection" description="Some requirements are selected">
      <TaskColumn
        projectId={projectId}
        projectName="Partial Selection Project"
        projectPath="/projects/partial"
        requirements={requirements}
        selectedRequirements={selectedRequirements}
        onToggleSelect={() => {}}
        onDelete={() => {}}
        onToggleProjectSelection={() => console.log('Toggle project selection')}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Column with long project name
 */
export function LongProjectName() {
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const projectId = 'long-name-project';
  const requirements = createMockRequirementsForProject(projectId, 3, {
    projectName: 'This Is A Very Long Project Name That Should Be Truncated',
  });

  return (
    <StoryWrapper title="Long Project Name" description="Project name should truncate">
      <TaskColumn
        projectId={projectId}
        projectName="This Is A Very Long Project Name That Should Be Truncated"
        projectPath="/projects/long-name"
        requirements={requirements}
        selectedRequirements={selectedRequirements}
        onToggleSelect={(reqId) =>
          setSelectedRequirements((prev) => {
            const next = new Set(prev);
            if (next.has(reqId)) next.delete(reqId);
            else next.add(reqId);
            return next;
          })
        }
        onDelete={() => {}}
        onToggleProjectSelection={() => {}}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

// ============================================================================
// Multiple Columns Grid
// ============================================================================

/**
 * Multiple columns in a grid layout
 */
export function MultipleColumnsGrid() {
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());

  const projects = [
    { id: 'proj-1', name: 'Frontend App', count: 5 },
    { id: 'proj-2', name: 'API Service', count: 3 },
    { id: 'proj-3', name: 'Shared Library', count: 7 },
    { id: 'proj-4', name: 'Mobile App', count: 4 },
  ];

  const allRequirements = projects.flatMap((p) =>
    createMockRequirementsForProject(p.id, p.count, { projectName: p.name })
  );

  const toggleSelect = (reqId: string) => {
    setSelectedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  const toggleProjectSelection = (projectId: string) => {
    const projectReqs = allRequirements.filter((r) => r.projectId === projectId);
    const allSelected = projectReqs.every((r) => selectedRequirements.has(getRequirementId(r)));

    setSelectedRequirements((prev) => {
      const next = new Set(prev);
      projectReqs.forEach((r) => {
        const id = getRequirementId(r);
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Multiple Columns Grid</h3>
        <p className="text-xs text-gray-500">
          Selected: {selectedRequirements.size} / {allRequirements.length}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {projects.map((project) => {
          const reqs = allRequirements.filter((r) => r.projectId === project.id);
          return (
            <TaskColumn
              key={project.id}
              projectId={project.id}
              projectName={project.name}
              projectPath={`/projects/${project.id}`}
              requirements={reqs}
              selectedRequirements={selectedRequirements}
              onToggleSelect={toggleSelect}
              onDelete={(reqId) => console.log('Delete:', reqId)}
              onToggleProjectSelection={toggleProjectSelection}
              getRequirementId={getRequirementId}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Interactive Demo
// ============================================================================

/**
 * Interactive demo with full functionality
 */
export function InteractiveDemo() {
  const [requirementCount, setRequirementCount] = useState(5);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());

  const projectId = 'interactive-project';
  const requirements = createMockRequirementsForProject(projectId, requirementCount, {
    projectName: 'Interactive Demo Project',
  });

  const toggleSelect = (reqId: string) => {
    setSelectedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  const toggleProjectSelection = () => {
    const allSelected = requirements.every((r) => selectedRequirements.has(getRequirementId(r)));
    setSelectedRequirements((prev) => {
      const next = new Set(prev);
      requirements.forEach((r) => {
        const id = getRequirementId(r);
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-lg font-bold text-white mb-4">TaskColumn - Interactive Demo</h2>

      {/* Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-32">Requirement count:</span>
          <input
            type="range"
            min="0"
            max="20"
            value={requirementCount}
            onChange={(e) => {
              setRequirementCount(Number(e.target.value));
              setSelectedRequirements(new Set());
            }}
            className="w-32"
          />
          <span className="text-xs text-gray-300 w-8">{requirementCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-32">Selected:</span>
          <span className="text-xs text-emerald-400">
            {selectedRequirements.size} / {requirements.length}
          </span>
          <button
            onClick={() => setSelectedRequirements(new Set())}
            className="ml-2 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Column */}
      <div className="max-w-sm">
        <TaskColumn
          projectId={projectId}
          projectName="Interactive Demo Project"
          projectPath="/projects/interactive"
          requirements={requirements}
          selectedRequirements={selectedRequirements}
          onToggleSelect={toggleSelect}
          onDelete={(reqId) => {
            console.log('Delete:', reqId);
            alert(`Delete: ${reqId}`);
          }}
          onToggleProjectSelection={toggleProjectSelection}
          getRequirementId={getRequirementId}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Default Export for Storybook
// ============================================================================

export default {
  title: 'TaskRunner/TaskColumn',
  component: TaskColumn,
};
