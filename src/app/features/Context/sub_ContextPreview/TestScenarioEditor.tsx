'use client';

import React from 'react';
import { Camera } from 'lucide-react';

interface TestScenarioEditorProps {
  value: string;
  onChange: (value: string) => void;
  groupColor: string;
}

export default function TestScenarioEditor({
  value,
  onChange,
  groupColor,
}: TestScenarioEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4" style={{ color: groupColor }} />
        <label className="block text-sm font-medium text-gray-400 font-mono">
          Test Scenario (Steps to reach screenshot)
        </label>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the testing steps to capture the screenshot...&#10;Example:&#10;1. Navigate to /dashboard&#10;2. Click on 'Settings' button&#10;3. Open 'Profile' tab&#10;4. Take screenshot"
        rows={6}
        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600/50 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none font-mono"
      />
      <p className="text-xs text-gray-500 font-mono">
        These steps will be used by the testing engine (Playwright/BrowserStack) to navigate and capture screenshots
      </p>
    </div>
  );
}
