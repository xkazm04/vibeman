import React from 'react';

interface PathDisplayProps {
  path: string;
}

export default function PathDisplay({ path }: PathDisplayProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Project Path
      </label>
      <div className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-gray-300 text-sm font-mono">
        {path}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        Path cannot be changed after project creation
      </div>
    </div>
  );
}
