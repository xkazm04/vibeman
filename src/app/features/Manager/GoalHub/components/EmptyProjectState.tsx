/**
 * EmptyProjectState Component
 * Displayed when no project is selected
 */

'use client';

import { Target } from 'lucide-react';

export default function EmptyProjectState() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Select a Project</h2>
        <p className="text-gray-500">Choose a project to start managing goals</p>
      </div>
    </div>
  );
}
