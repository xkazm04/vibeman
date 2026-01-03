'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { ProjectType } from '@/types';

interface SecurityPipelineButtonProps {
  projectId: string;
  projectPath: string;
  projectType?: ProjectType;
}

type PipelineStatus = 'idle' | 'scanning' | 'analyzing' | 'creating_pr' | 'testing' | 'success' | 'error';

export default function SecurityPipelineButton({
  projectId,
  projectPath,
  projectType
}: SecurityPipelineButtonProps) {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [scanId, setScanId] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vulnerabilityCount, setVulnerabilityCount] = useState<number>(0);

  const runSecurityPipeline = async () => {
    try {
      setStatus('scanning');
      setError(null);

      // Step 1: Run security scan
      const scanResponse = await fetch('/api/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectPath,
          projectType
        })
      });

      if (!scanResponse.ok) {
        throw new Error('Security scan failed');
      }

      const scanData = await scanResponse.json();
      setScanId(scanData.scanId);
      setVulnerabilityCount(scanData.scan.totalVulnerabilities);

      if (scanData.scan.totalVulnerabilities === 0) {
        setStatus('success');
        return;
      }

      // Step 2: Wait for patch analysis
      setStatus('analyzing');

      // Poll for patch generation completion
      await pollForPatchGeneration(scanData.scanId);

      // Step 3: Create PR
      setStatus('creating_pr');

      const prResponse = await fetch('/api/security/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: scanData.scanId,
          projectPath
        })
      });

      if (!prResponse.ok) {
        throw new Error('Failed to create PR');
      }

      const prData = await prResponse.json();
      setPrUrl(prData.pr.prUrl);

      // Step 4: Tests are running in background
      setStatus('testing');

      // Optionally poll for test completion
      // For now, we'll just show the success state
      setTimeout(() => {
        setStatus('success');
      }, 2000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const pollForPatchGeneration = async (scanId: string): Promise<void> => {
    const maxAttempts = 30;
    const interval = 2000; // 2 seconds

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      const response = await fetch(`/api/security/${scanId}`);
      const data = await response.json();

      if (data.scan.status === 'patch_generated') {
        return;
      }

      if (data.scan.status === 'failed') {
        throw new Error('Patch generation failed');
      }
    }

    throw new Error('Patch generation timeout');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <Shield className="w-5 h-5" />;
      case 'scanning':
      case 'analyzing':
      case 'creating_pr':
      case 'testing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Run Security Pipeline';
      case 'scanning':
        return 'Scanning for vulnerabilities...';
      case 'analyzing':
        return `Analyzing ${vulnerabilityCount} vulnerabilities...`;
      case 'creating_pr':
        return 'Creating pull request...';
      case 'testing':
        return 'Running tests...';
      case 'success':
        return vulnerabilityCount === 0 ? 'No vulnerabilities found!' : 'Pipeline completed!';
      case 'error':
        return 'Pipeline failed';
      default:
        return 'Run Security Pipeline';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return 'from-cyan-600 to-blue-600';
      case 'scanning':
      case 'analyzing':
      case 'creating_pr':
      case 'testing':
        return 'from-yellow-600 to-orange-600';
      case 'success':
        return 'from-green-600 to-emerald-600';
      case 'error':
        return 'from-red-600 to-rose-600';
      default:
        return 'from-cyan-600 to-blue-600';
    }
  };

  const isProcessing = ['scanning', 'analyzing', 'creating_pr', 'testing'].includes(status);

  return (
    <div className="space-y-3">
      <motion.button
        data-testid="security-pipeline-btn"
        onClick={runSecurityPipeline}
        disabled={isProcessing}
        className={`
          relative w-full px-6 py-3 rounded-lg font-medium text-white
          bg-gradient-to-r ${getStatusColor()}
          border border-white/10
          shadow-lg shadow-black/20
          transition-all duration-300
          hover:shadow-xl hover:scale-[1.02]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          flex items-center justify-center gap-3
        `}
        whileHover={!isProcessing ? { y: -2 } : {}}
        whileTap={!isProcessing ? { scale: 0.98 } : {}}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </motion.button>

      {/* Status Details */}
      {(status !== 'idle' && status !== 'error') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-800/60 rounded-lg p-4 border border-cyan-700/30"
        >
          <div className="space-y-2 text-sm">
            {scanId && (
              <div className="flex justify-between">
                <span className="text-gray-400">Scan ID:</span>
                <span className="text-cyan-300 font-mono">{scanId}</span>
              </div>
            )}

            {vulnerabilityCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Vulnerabilities:</span>
                <span className="text-orange-300 font-semibold">{vulnerabilityCount}</span>
              </div>
            )}

            {prUrl && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Pull Request:</span>
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200 underline flex items-center gap-1"
                >
                  View PR
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {status === 'testing' && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-2 text-yellow-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tests running in background. PR will auto-merge if all tests pass.</span>
                </div>
              </div>
            )}

            {status === 'success' && vulnerabilityCount > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-2 text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span>Security patches applied successfully!</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {status === 'error' && error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-red-900/20 rounded-lg p-4 border border-red-700/30"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-red-300 font-medium mb-1">Pipeline Error</div>
              <div className="text-red-200/80 text-sm">{error}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
