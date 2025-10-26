'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import VibemanPowerButton from './VibemanPowerButton';
import VibemanStatus, { VibemanStatusType } from './VibemanStatus';
import { runAutomationCycle, AutomationStatus } from './lib/automationCycle';

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
  const [status, setStatus] = useState<VibemanStatusType>('idle');
  const [message, setMessage] = useState<string>('');
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const isRunningRef = useRef(isRunning);
  const currentTaskIdRef = useRef<string | null>(null);

  // Update ref when isRunning changes
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  /**
   * Start the automation cycle
   */
  const startAutomationCycle = useCallback(async () => {
    if (!isRunningRef.current) {
      console.log('[Vibeman] Automation stopped by user');
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
      console.error('[Vibeman] Automation error:', error);
      setFailureCount(prev => prev + 1);
      setStatus('error');
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
      console.log('[Vibeman] Stopping automation...');
      setIsRunning(false);
      setStatus('idle');
      setMessage('Stopped');
      currentTaskIdRef.current = null;
    } else {
      // Start automation
      console.log('[Vibeman] Starting automation...');
      setIsRunning(true);
      setStatus('idle');
      setMessage('Starting...');

      // Call startAutomationCycle asynchronously
      setTimeout(() => {
        startAutomationCycle();
      }, 100);
    }
  };

  return (
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
    </div>
  );
}
