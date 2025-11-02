'use client';

import React, { useState } from 'react';
import { Camera, Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface TestScenarioEditorProps {
  value: string;
  onChange: (value: string) => void;
  groupColor: string;
  contextId: string;
}

export default function TestScenarioEditor({
  value,
  onChange,
  groupColor,
  contextId,
}: TestScenarioEditorProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    if (!value || value.trim() === '') {
      setTestResult({ success: false, message: 'Please write a test scenario first' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/tester/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId,
          scanOnly: false,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: `Screenshot saved! Path: ${result.screenshotPath}`,
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Screenshot failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" style={{ color: groupColor }} />
          <label className="block text-sm font-medium text-gray-400 font-mono">
            Test Scenario (Steps to reach screenshot)
          </label>
        </div>
        <motion.button
          onClick={handleTest}
          disabled={isTesting || !value}
          className="flex items-center gap-1 px-2 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-teal-500/30"
          whileHover={{ scale: !isTesting && value ? 1.05 : 1 }}
          whileTap={{ scale: !isTesting && value ? 0.95 : 1 }}
        >
          {isTesting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Testing...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>Test</span>
            </>
          )}
        </motion.button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the testing steps to capture the screenshot...&#10;Example:&#10;1. Navigate to /dashboard&#10;2. Click on 'Settings' button&#10;3. Open 'Profile' tab&#10;4. Take screenshot"
        rows={6}
        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600/50 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none font-mono"
      />

      {/* Test Result */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-2 p-2 rounded text-xs font-mono ${
            testResult.success
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1">{testResult.message}</span>
        </motion.div>
      )}

      <p className="text-xs text-gray-500 font-mono">
        These steps will be used by the testing engine (Playwright/BrowserStack) to navigate and capture screenshots
      </p>
    </div>
  );
}
