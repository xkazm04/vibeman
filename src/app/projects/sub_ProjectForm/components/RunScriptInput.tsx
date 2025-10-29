import React from 'react';

interface RunScriptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RunScriptInput({ value, onChange }: RunScriptInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Run Script
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="npm run dev"
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
      />
      <div className="text-sm text-gray-500 mt-1">
        Command to start the development server
      </div>
    </div>
  );
}
