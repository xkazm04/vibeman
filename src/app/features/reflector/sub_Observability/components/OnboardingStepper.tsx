'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  FileCode,
  Play,
  CheckCircle,
  Circle,
  ChevronRight,
  Rocket,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import {
  generateOnboardingRequirement,
  checkOnboardingStatus,
  type OnboardingStatus
} from '../lib/observabilityApi';

interface OnboardingStepperProps {
  projectId: string;
  projectPath: string;
  projectName: string;
  onComplete?: () => void;
}

type StepStatus = 'pending' | 'current' | 'completed' | 'error';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
}

export default function OnboardingStepper({
  projectId,
  projectPath,
  projectName,
  onComplete
}: OnboardingStepperProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [generatedPath, setGeneratedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine current step based on onboarding status
  const getCurrentStep = (): number => {
    if (!onboardingStatus) return 1;
    if (onboardingStatus.hasData) return 4; // Complete
    if (onboardingStatus.requirementGenerated) return 3; // Execute
    if (onboardingStatus.frameworkDetected) return 2; // Generate
    return 1; // Detect
  };

  const currentStep = getCurrentStep();

  const steps: Step[] = [
    {
      id: 1,
      title: 'Detect Framework',
      description: 'Analyzing project structure',
      icon: <Search className="w-5 h-5" />,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'current' : 'pending'
    },
    {
      id: 2,
      title: 'Generate Requirement',
      description: 'Create Claude Code requirement file',
      icon: <FileCode className="w-5 h-5" />,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'current' : 'pending'
    },
    {
      id: 3,
      title: 'Execute Setup',
      description: 'Run with Claude Code',
      icon: <Play className="w-5 h-5" />,
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'current' : 'pending'
    },
    {
      id: 4,
      title: 'Verify Data',
      description: 'Confirm data is flowing',
      icon: <CheckCircle className="w-5 h-5" />,
      status: currentStep >= 4 ? 'completed' : 'pending'
    }
  ];

  // Check onboarding status on mount
  useEffect(() => {
    checkStatus();
  }, [projectId]);

  const checkStatus = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const status = await checkOnboardingStatus(projectId, projectPath);
      setOnboardingStatus(status);

      if (status.requirementPath) {
        setGeneratedPath(status.requirementPath);
      }

      // If complete, notify parent
      if (status.hasData) {
        onComplete?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const result = await generateOnboardingRequirement(projectId, projectPath, projectName);
      setGeneratedPath(result.requirementPath);

      // Re-check status
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate requirement');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-8">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Checking onboarding status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-cyan-500/20">
            <Rocket className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-100 mb-2">
              Set Up API Observability
            </h2>
            <p className="text-gray-400">
              Track endpoint usage, response times, and error rates for <span className="text-gray-200 font-medium">{projectName}</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <FolderOpen className="w-4 h-4" />
              <span className="font-mono truncate max-w-lg" title={projectPath}>{projectPath}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${step.status === 'completed'
                      ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                      : step.status === 'current'
                        ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/50 animate-pulse'
                        : step.status === 'error'
                          ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                          : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
                    }
                  `}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : step.status === 'error' ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'current' ? 'text-cyan-400' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 h-0.5 mt-[-2rem]">
                  <div className={`h-full rounded transition-all ${
                    step.status === 'completed' ? 'bg-green-500/50' : 'bg-gray-700'
                  }`} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="border-t border-gray-700 pt-6">
          {currentStep === 1 && (
            <StepContent
              title="Framework Detection"
              description="We'll analyze your project to detect the framework and generate appropriate observability code."
            >
              <div className="space-y-4">
                {onboardingStatus?.framework && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Detected framework: <span className="font-medium">{onboardingStatus.framework}</span></span>
                  </div>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Detecting & Generating...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Detect Framework & Generate
                    </>
                  )}
                </button>
              </div>
            </StepContent>
          )}

          {currentStep === 2 && (
            <StepContent
              title="Generate Requirement File"
              description={`Framework detected: ${onboardingStatus?.framework || 'Unknown'}. Generate a Claude Code requirement file to set up observability.`}
            >
              <div className="space-y-4">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileCode className="w-4 h-4" />
                      Generate Requirement File
                    </>
                  )}
                </button>
              </div>
            </StepContent>
          )}

          {currentStep === 3 && (
            <StepContent
              title="Execute with Claude Code"
              description="Run the generated requirement file with Claude Code to set up observability in your project."
            >
              <div className="space-y-4">
                {generatedPath && (
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">Requirement file generated:</div>
                    <code className="text-sm text-cyan-400 break-all">{generatedPath}</code>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <Play className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <div className="text-amber-300 font-medium mb-1">Next Step: Execute the Requirement</div>
                      <p className="text-sm text-gray-400 mb-3">
                        Open Claude Code and run the generated requirement file. This will:
                      </p>
                      <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                        <li>Create SQLite database for observability</li>
                        <li>Add middleware to wrap your API routes</li>
                        <li>Create a stats endpoint for viewing data</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={checkStatus}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Check Status
                  </button>
                  <span className="text-sm text-gray-500">
                    Click after running the requirement with Claude Code
                  </span>
                </div>
              </div>
            </StepContent>
          )}

          {currentStep >= 4 && (
            <StepContent
              title="Setup Complete!"
              description="Observability is now active and collecting data."
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Data is flowing!</span>
                </div>

                {onboardingStatus?.endpointCount && (
                  <div className="text-sm text-gray-400">
                    Tracking <span className="text-gray-200 font-medium">{onboardingStatus.endpointCount}</span> endpoints
                  </div>
                )}

                <button
                  onClick={onComplete}
                  className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30 transition-colors flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  View Dashboard
                </button>
              </div>
            </StepContent>
          )}
        </div>
      </div>

      {/* Info boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoBox
          title="Local Development"
          description="Data is stored in a local SQLite database. Perfect for development and testing."
          highlight="Free & Fast"
        />
        <InfoBox
          title="Production Ready"
          description="Switch to Sentry provider for production monitoring with minimal code changes."
          highlight="Sentry Support"
        />
        <InfoBox
          title="Brain Integration"
          description="Usage data feeds into the Brain system to inform smarter direction generation."
          highlight="AI-Powered"
        />
      </div>
    </div>
  );
}

function StepContent({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      {children}
    </div>
  );
}

function InfoBox({
  title,
  description,
  highlight
}: {
  title: string;
  description: string;
  highlight: string;
}) {
  return (
    <div className="rounded-xl bg-gray-800/30 border border-gray-700/50 p-4">
      <div className="text-xs font-medium text-cyan-400 mb-2">{highlight}</div>
      <h4 className="font-semibold text-gray-200 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
