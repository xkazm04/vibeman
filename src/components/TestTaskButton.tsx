'use client';

import { useState } from 'react';

export default function TestTaskButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastTask, setLastTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateTestTask = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/cursor-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Create Hello Page',
          description: 'Create a new page called "Hello" in the current project directory. The page should display a simple greeting message "Hello from Cursor Background Agent!" with some basic styling using Tailwind CSS.',
          type: 'feature',
          priority: 'high'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate task');
      }

      const result = await response.json();
      setLastTask(result.taskId);
      
      // Show success message
      alert(`Task generated successfully! Task ID: ${result.taskId}\n\nNext steps:\n1. Open Cursor IDE\n2. Press Cmd/Ctrl+E to start Background Agent\n3. Tell the agent: "Execute task ${result.taskId} from cursor-tasks directory"`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error generating task:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 rounded-lg shadow-md">      
      <button
        onClick={generateTestTask}
        disabled={isGenerating}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          isGenerating
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isGenerating ? 'Generating...' : 'Generate Test Task'}
      </button>
      
      {lastTask && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            <strong>Task Generated:</strong> {lastTask}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Check the cursor-tasks directory for the generated task file.
          </p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}
    </div>
  );
} 