'use client';
import React, { useEffect, useRef } from 'react';
import { useCLISessionStore } from '@/components/cli/store/cliSessionStore';
import { useManualSessionStore } from '@/app/features/TaskRunner/store/manualSessionStore';
import TaskRunnerFullView from '@/app/features/TaskRunner/TaskRunnerFullView';
import TaskRunnerNerdView from '@/app/features/TaskRunner/TaskRunnerNerdView';

const TaskRunnerLayout = () => {
  // Recover persisted manual sessions once per mount, regardless of which
  // view is active — so first-load directly into nerd mode still hydrates.
  const recoverSessions = useManualSessionStore((s) => s.recoverSessions);
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (!recoveredRef.current) {
      recoveredRef.current = true;
      recoverSessions().catch(console.error);
    }
  }, [recoverSessions]);

  const nerdMode = useCLISessionStore((s) => s.nerdMode);

  return nerdMode ? <TaskRunnerNerdView /> : <TaskRunnerFullView />;
};

export default React.memo(TaskRunnerLayout);
