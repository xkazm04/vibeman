'use client';
import React from 'react';
import CombinedBottomLayout from '../combined-layout/CombinedBottomLayoutMain';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Main content area */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Project Dashboard</h1>
        
        {/* Your main content goes here */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Project Overview</h2>
            <p className="text-gray-300">
              This is where your main project content would go. The combined Events & Background Tasks 
              panel is available at the bottom of the screen.
            </p>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                <strong>New:</strong> Use the Start/Stop button in the bottom panel to control polling. 
                By default, polling is stopped to save resources.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <p className="text-gray-300">
              Use the AI Project Assistant to generate documentation, tasks, goals, 
              and context files. These will be processed in the background queue.
            </p>
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm">
                <strong>Tip:</strong> Start the queue processing to automatically handle background tasks. 
                The queue will stop automatically when no tasks are pending.
              </p>
            </div>
          </div>
        </div>
        
        {/* Test buttons for creating background tasks */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Background Tasks</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={async () => {
                const response = await fetch('/api/kiro/background-tasks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId: 'test-project',
                    projectName: 'Test Project',
                    projectPath: '/test/project',
                    taskType: 'docs',
                    priority: 1
                  })
                });
                const result = await response.json();
                console.log('Created docs task:', result);
              }}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-300 hover:text-purple-200 transition-all"
            >
              Create Docs Task
            </button>
            <button
              onClick={async () => {
                const response = await fetch('/api/kiro/background-tasks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId: 'test-project',
                    projectName: 'Test Project',
                    projectPath: '/test/project',
                    taskType: 'tasks',
                    priority: 2
                  })
                });
                const result = await response.json();
                console.log('Created tasks task:', result);
              }}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-300 hover:text-blue-200 transition-all"
            >
              Create Tasks Task
            </button>
            <button
              onClick={async () => {
                const response = await fetch('/api/kiro/background-tasks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId: 'test-project',
                    projectName: 'Test Project',
                    projectPath: '/test/project',
                    taskType: 'goals',
                    priority: 1
                  })
                });
                const result = await response.json();
                console.log('Created goals task:', result);
              }}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-300 hover:text-green-200 transition-all"
            >
              Create Goals Task
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Click these buttons to create test background tasks, then use the controls in the bottom panel 
            to start polling and queue processing.
          </p>
        </div>
        
        {/* Add some padding at the bottom to account for the fixed bottom panel */}
        <div className="pb-32">
          {/* More content can go here */}
        </div>
      </div>

      {/* Combined bottom layout with Events and Background Tasks */}
      <CombinedBottomLayout />
    </div>
  );
}