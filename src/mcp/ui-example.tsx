import React, { useState, useEffect } from 'react';
import { Save, Play, FileJson, GitBranch, Terminal, CheckCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  type: string;
  priority: string;
  description: string;
  acceptanceCriteria: string[];
  technicalDetails: string;
  estimatedComplexity: string;
}

const CursorTaskGenerator = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task>({
    id: '',
    title: '',
    type: 'feature',
    priority: 'medium',
    description: '',
    acceptanceCriteria: [],
    technicalDetails: '',
    estimatedComplexity: 'medium'
  });

  // Task template for Cursor agents
  const generateCursorTask = (task: Task) => {
    const template = `# Task: ${task.title}
## ID: ${task.id}
## Type: ${task.type}
## Priority: ${task.priority}
## Created: ${new Date().toISOString()}

## Description
${task.description}

## Acceptance Criteria
${task.acceptanceCriteria.map(criteria => `- [ ] ${criteria}`).join('\n')}

## Technical Implementation Details
${task.technicalDetails}

## Cursor Agent Instructions
Please implement this ${task.type} following these steps:
1. Analyze the existing codebase structure
2. Create necessary files following project conventions
3. Implement the feature/fix with proper error handling
4. Add appropriate tests (minimum 80% coverage)
5. Update documentation as needed
6. Ensure all acceptance criteria are met

## Estimated Complexity: ${task.estimatedComplexity}
## Branch Name: ${task.type}/${task.id}-${task.title.toLowerCase().replace(/\s+/g, '-')}

---
END OF TASK DEFINITION
`;
    return template;
  };

  // Generate agent instruction file
  const generateAgentInstructions = (tasks: Task[]) => {
    const instructions = `# Cursor Agent Batch Instructions
## Generated: ${new Date().toISOString()}
## Total Tasks: ${tasks.length}

## Execution Order
${tasks.map((task, index) => `${index + 1}. ${task.title} (Priority: ${task.priority})`).join('\n')}

## General Guidelines
- Create separate branches for each task
- Follow the project's .cursorrules file
- Commit with conventional commit messages
- Create PRs with detailed descriptions
- Tag PRs with appropriate labels

## Task Files
${tasks.map(task => `- ./cursor-tasks/${task.id}.md`).join('\n')}
`;
    return instructions;
  };

  // File system simulation (in real app, this would write to disk)
  const saveTaskFiles = () => {
    const fileStructure = {
      'cursor-tasks': {
        '_manifest.json': JSON.stringify({
          generated: new Date().toISOString(),
          tasks: tasks.map(t => ({
            id: t.id,
            file: `${t.id}.md`,
            status: 'pending'
          })),
          totalTasks: tasks.length
        }, null, 2),
        '_instructions.md': generateAgentInstructions(tasks),
        ...tasks.reduce((acc, task) => ({
          ...acc,
          [`${task.id}.md`]: generateCursorTask(task)
        }), {})
      }
    };

    console.log('Generated file structure:', fileStructure);
    // In real implementation, this would use fs.writeFileSync or an API endpoint
    alert('Task files generated! Check console for structure.');
  };

  const addTask = () => {
    if (!currentTask.title || !currentTask.description) {
      alert('Please fill in title and description');
      return;
    }
    
    const newTask = {
      ...currentTask,
      id: `task-${Date.now()}`,
      acceptanceCriteria: currentTask.acceptanceCriteria.filter(c => c)
    };
    
    setTasks([...tasks, newTask]);
    setCurrentTask({
      id: '',
      title: '',
      type: 'feature',
      priority: 'medium',
      description: '',
      acceptanceCriteria: [],
      technicalDetails: '',
      estimatedComplexity: 'medium'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Cursor Task Generator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Input Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            Create New Task
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                value={currentTask.title}
                onChange={(e) => setCurrentTask({...currentTask, title: e.target.value})}
                placeholder="e.g., Implement user authentication"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={currentTask.type}
                  onChange={(e) => setCurrentTask({...currentTask, type: e.target.value})}
                >
                  <option value="feature">Feature</option>
                  <option value="bug">Bug Fix</option>
                  <option value="refactor">Refactor</option>
                  <option value="test">Testing</option>
                  <option value="docs">Documentation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={currentTask.priority}
                  onChange={(e) => setCurrentTask({...currentTask, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={4}
                value={currentTask.description}
                onChange={(e) => setCurrentTask({...currentTask, description: e.target.value})}
                placeholder="Detailed description of what needs to be done..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Acceptance Criteria</label>
              {currentTask.acceptanceCriteria.map((criteria, index) => (
                <input
                  key={index}
                  type="text"
                  className="w-full p-2 border rounded-md mb-2"
                  value={criteria}
                  onChange={(e) => {
                    const newCriteria = [...currentTask.acceptanceCriteria];
                    newCriteria[index] = e.target.value;
                    setCurrentTask({...currentTask, acceptanceCriteria: newCriteria});
                  }}
                  placeholder="Success criterion..."
                />
              ))}
              <button
                onClick={() => setCurrentTask({
                  ...currentTask,
                  acceptanceCriteria: [...currentTask.acceptanceCriteria, '']
                })}
                className="text-blue-600 text-sm hover:underline"
              >
                + Add criterion
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Technical Details</label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={3}
                value={currentTask.technicalDetails}
                onChange={(e) => setCurrentTask({...currentTask, technicalDetails: e.target.value})}
                placeholder="Any specific technical requirements or considerations..."
              />
            </div>
            
            <button
              onClick={addTask}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Add Task to Queue
            </button>
          </div>
        </div>
        
        {/* Task Queue */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Task Queue ({tasks.length})
          </h2>
          
          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tasks added yet</p>
            ) : (
              tasks.map((task, index) => (
                <div key={task.id} className="border rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{task.type} • {task.priority} priority</p>
                    </div>
                    <button
                      onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {tasks.length > 0 && (
            <button
              onClick={saveTaskFiles}
              className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Generate Cursor Task Files
            </button>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          How to Use Generated Tasks in Cursor
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Generate task files using this interface</li>
          <li>Copy the generated files to your project's <code className="bg-gray-200 px-1 rounded">cursor-tasks/</code> directory</li>
          <li>In Cursor, start a Background Agent (Cmd/Ctrl+E)</li>
          <li>Tell the agent: "Please execute all tasks in the cursor-tasks directory following the manifest"</li>
          <li>Or for specific tasks: "Please execute task-[ID].md from cursor-tasks"</li>
          <li>Monitor progress via Cursor's web interface or GitHub PRs</li>
        </ol>
      </div>
    </div>
  );
};

export default CursorTaskGenerator;