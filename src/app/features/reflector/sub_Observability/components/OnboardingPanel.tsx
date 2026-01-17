'use client';

import React, { useState } from 'react';
import { Rocket, CheckCircle, AlertCircle, FileCode, FolderOpen } from 'lucide-react';
import { generateOnboardingRequirement } from '../lib/observabilityApi';

interface OnboardingPanelProps {
  projectId: string;
  projectPath: string;
  projectName: string;
  isRegistered: boolean;
  isEnabled: boolean;
  onOnboardingComplete?: () => void;
}

export default function OnboardingPanel({
  projectId,
  projectPath,
  projectName,
  isRegistered,
  isEnabled,
  onOnboardingComplete
}: OnboardingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    requirementPath?: string;
    framework?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const handleGenerateOnboarding = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await generateOnboardingRequirement(projectId, projectPath, projectName);
      setResult({
        success: true,
        requirementPath: response.requirementPath,
        framework: response.framework,
        message: response.message
      });
      onOnboardingComplete?.();
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate onboarding'
      });
    } finally {
      setLoading(false);
    }
  };

  if (isRegistered && isEnabled) {
    return (
      <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-green-300">Observability Enabled</h3>
            <p className="text-sm text-gray-400">
              This project is configured for observability tracking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-cyan-500/20">
          <Rocket className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-200 mb-2">
            Set Up Observability
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Generate a Claude Code requirement to set up API observability for this project.
            This will create middleware that tracks endpoint usage, response times, and errors.
          </p>

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <FolderOpen className="w-4 h-4" />
              <span>Project: <span className="text-gray-200">{projectName}</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <FileCode className="w-4 h-4" />
              <span className="font-mono text-xs text-gray-500 truncate max-w-md" title={projectPath}>
                {projectPath}
              </span>
            </div>
          </div>

          {result && (
            <div className={`mb-4 p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Requirement Generated!</span>
                  </div>
                  <p className="text-sm text-gray-400">{result.message}</p>
                  <div className="text-xs text-gray-500 font-mono bg-gray-900/50 p-2 rounded">
                    Framework detected: {result.framework}
                    <br />
                    Path: {result.requirementPath}
                  </div>
                  <p className="text-sm text-cyan-400">
                    Execute this requirement with Claude Code to complete setup.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{result.error}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleGenerateOnboarding}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Generate Onboarding Requirement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
