'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain } from 'lucide-react';
import VibemanPowerButton from './VibemanPowerButton';
import VibemanStatus, { VibemanStatusType } from './VibemanStatus';
import { runAutomationCycle, AutomationStatus } from './lib/automationCycle';
import AdaptiveLearningDashboard from './components/AdaptiveLearningDashboard';

interface VibemanAutomationProps {
  projectId: string;
  projectPath: string;
  onIdeaImplemented?: () => void;
}

export default function VibemanAutomation({
  projectId,
  projectPath,
  onIdeaImplemented,
}: VibemanAutomationProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<VibemanStatusType>('pending');
  const [message, setMessage] = useState<string>('');
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLearning, setShowLearning] = useState(false);

  const isRunningRef = useRef(isRunning);
  const currentTaskIdRef = useRef<string | null>(null);
  const currentIdeaIdRef = useRef<string | null>(null);
  const executionStartTimeRef = useRef<number | null>(null);

  // Update ref when isRunning changes
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  /**
   * Start the automation cycle
   */
  const startAutomationCycle = useCallback(async () => {
    if (!isRunningRef.current) {
      return;
    }

    setIsProcessing(true);

    try {
      await runAutomationCycle(
        {
          projectId,
          projectPath,
          isRunningRef,
          currentTaskIdRef,
          currentIdeaIdRef,
          executionStartTimeRef,
        },
        {
          onStatusChange: (newStatus: AutomationStatus, newMessage: string) => {
            setStatus(newStatus);
            setMessage(newMessage);
          },
          onSuccess: () => {
            setSuccessCount(prev => prev + 1);
          },
          onFailure: () => {
            setFailureCount(prev => prev + 1);
          },
          onIdeaImplemented,
        }
      );

      setIsProcessing(false);
    } catch (error) {
      setFailureCount(prev => prev + 1);
      setStatus('pending');
      setMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsProcessing(false);
      setIsRunning(false);
    }
  }, [projectId, projectPath, onIdeaImplemented]);

  /**
   * Toggle automation on/off
   */
  const handleToggle = () => {
    if (isRunning) {
      // Stop automation
      setIsRunning(false);
      setStatus('pending');
      setMessage('Stopped');
      currentTaskIdRef.current = null;
    } else {
      // Start automation
      setIsRunning(true);
      setStatus('pending');
      setMessage('Starting...');

      // Call startAutomationCycle asynchronously
      setTimeout(() => {
        startAutomationCycle();
      }, 100);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2">
        {/* Power Button */}
        <VibemanPowerButton
          isRunning={isRunning}
          isProcessing={isProcessing}
          onClick={handleToggle}
        />

        {/* Status Component */}
        <VibemanStatus
          status={status}
          message={message}
          successCount={successCount}
          failureCount={failureCount}
        />

        {/* Learning Dashboard Toggle */}
        <button
          onClick={() => setShowLearning(!showLearning)}
          className={`p-1.5 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 ${
            showLearning
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 hover:bg-purple-500/30 focus-visible:ring-purple-400/70'
              : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 border border-transparent hover:border-gray-600/40 focus-visible:ring-blue-400/70'
          }`}
          title="Adaptive Learning Dashboard"
          aria-label={showLearning ? 'Hide Adaptive Learning Dashboard' : 'Show Adaptive Learning Dashboard'}
          aria-expanded={showLearning}
          data-testid="learning-dashboard-toggle-btn"
        >
          <Brain className="w-4 h-4" />
        </button>
      </div>

      {/* Adaptive Learning Dashboard */}
      {showLearning && (
        <AdaptiveLearningDashboard projectId={projectId} />
      )}
    </div>
  );
}
