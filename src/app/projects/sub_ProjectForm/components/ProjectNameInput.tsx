import React from 'react';

interface ProjectNameInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ProjectNameInput({ value, onChange }: ProjectNameInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Project Name *
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., My Next.js App"
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
        maxLength={50}
        required
      />
    </div>
  );
}
