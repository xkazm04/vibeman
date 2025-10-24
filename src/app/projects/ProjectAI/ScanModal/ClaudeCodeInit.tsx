import React from 'react';
import { motion } from 'framer-motion';
import { FolderCog, CheckCircle2, AlertTriangle, Loader2, FolderPlus } from 'lucide-react';
import { checkClaudeCodeStatus, initializeClaudeCode } from './lib/api';

interface ClaudeCodeInitProps {
  projectPath: string;
  projectName: string;
  projectId?: string;
  projectType?: 'nextjs' | 'fastapi' | 'other';
}

export default function ClaudeCodeInit({ projectPath, projectName, projectId, projectType }: ClaudeCodeInitProps) {
  const [status, setStatus] = React.useState<{
    loading: boolean;
    exists: boolean;
    initialized: boolean;
    missing: string[];
    error?: string;
  }>({
    loading: true,
    exists: false,
    initialized: false,
    missing: [],
  });

  const [initializing, setInitializing] = React.useState(false);

  // Check Claude Code status on mount
  React.useEffect(() => {
    const checkStatus = async () => {
      setStatus(prev => ({ ...prev, loading: true }));
      const result = await checkClaudeCodeStatus(projectPath);
      setStatus({
        loading: false,
        exists: result.exists,
        initialized: result.initialized,
        missing: result.missing,
        error: result.error,
      });
    };

    checkStatus();
  }, [projectPath]);

  const handleInitialize = async () => {
    setInitializing(true);
    const result = await initializeClaudeCode(projectPath, projectName, projectId, projectType);

    if (result.success) {
      // Log context scan requirement creation status
      if (result.contextScanRequirement?.created) {
        console.log('Context scan requirement created at:', result.contextScanRequirement.filePath);
      } else if (result.contextScanRequirement?.error) {
        console.warn('Failed to create context scan requirement:', result.contextScanRequirement.error);
      }

      // Refresh status
      const newStatus = await checkClaudeCodeStatus(projectPath);
      setStatus({
        loading: false,
        exists: newStatus.exists,
        initialized: newStatus.initialized,
        missing: newStatus.missing,
        error: newStatus.error,
      });
    } else {
      setStatus(prev => ({ ...prev, error: result.error }));
    }

    setInitializing(false);
  };

  const renderStatusIcon = () => {
    if (status.loading) {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-4 h-4 text-blue-400" />
        </motion.div>
      );
    }

    if (status.initialized) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, type: "spring" }}
        >
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        </motion.div>
      );
    }

    return (
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <AlertTriangle className="w-4 h-4 text-amber-400" />
      </motion.div>
    );
  };

  const renderStatusText = () => {
    if (status.loading) {
      return 'Checking Claude Code setup...';
    }

    if (status.error) {
      return `Error: ${status.error}`;
    }

    if (status.initialized) {
      return 'Claude Code is fully configured';
    }

    if (status.exists && status.missing.length > 0) {
      return `Missing: ${status.missing.join(', ')}`;
    }

    if (!status.exists) {
      return 'Claude Code not initialized';
    }

    return 'Status unknown';
  };

  return (
    <motion.div
      className="p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">Claude Code Setup</span>
        {renderStatusIcon()}
      </div>

      <p className="text-xs text-gray-400 leading-relaxed mb-3">
        {renderStatusText()}
      </p>

      {/* Show missing items if partially initialized */}
      {status.exists && !status.initialized && status.missing.length > 0 && (
        <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400 font-semibold mb-1">Missing Components:</p>
          <ul className="text-xs text-amber-300/80 space-y-0.5">
            {status.missing.map((item, idx) => (
              <li key={idx} className="flex items-center">
                <span className="w-1 h-1 bg-amber-400 rounded-full mr-2" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Initialize button */}
      {!status.loading && !status.initialized && (
        <motion.button
          onClick={handleInitialize}
          disabled={initializing}
          className={`w-full py-2 px-3 rounded-lg flex items-center justify-center space-x-2 text-xs font-semibold transition-all duration-300 ${
            initializing
              ? 'bg-blue-500/20 text-blue-300 cursor-not-allowed'
              : 'bg-blue-500/30 hover:bg-blue-500/40 text-blue-200 hover:text-white border border-blue-500/40 hover:border-blue-500/60'
          }`}
          whileHover={initializing ? {} : { scale: 1.02 }}
          whileTap={initializing ? {} : { scale: 0.98 }}
        >
          {initializing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-3.5 h-3.5" />
              </motion.div>
              <span>Initializing...</span>
            </>
          ) : (
            <>
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{status.exists ? 'Complete Setup' : 'Initialize Claude Code'}</span>
            </>
          )}
        </motion.button>
      )}

      {/* Success state */}
      {status.initialized && (
        <div className="flex items-center space-x-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <FolderCog className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-300">Ready for automation</span>
        </div>
      )}
    </motion.div>
  );
}
