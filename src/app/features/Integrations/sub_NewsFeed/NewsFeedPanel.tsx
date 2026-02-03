/**
 * News Feed Panel
 *
 * UI for triggering news feed discovery via Claude Code CLI.
 * Fetches prompt from res API and creates a task for CLI execution.
 */

'use client';

import { useState, useCallback } from 'react';
import { Newspaper, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import UnifiedButton from '@/components/ui/buttons/UnifiedButton';
import { toast } from '@/stores/toastStore';
import { useCLISessionStore, type CLISessionId } from '@/components/cli/store';
import {
  createNewsFeedTask,
  PERIOD_OPTIONS,
  type PeriodOption,
} from '@/lib/newsFeed/createNewsFeedTask';

type DiscoveryStatus = 'idle' | 'loading' | 'success' | 'error';

export function NewsFeedPanel() {
  const [period, setPeriod] = useState<PeriodOption>('last 24 hours');
  const [status, setStatus] = useState<DiscoveryStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  // CLI Session store actions
  const addTasksToSession = useCLISessionStore((state) => state.addTasksToSession);
  const sessions = useCLISessionStore((state) => state.sessions);

  // Find first available session (not running)
  const getAvailableSessionId = useCallback((): CLISessionId | null => {
    const sessionIds: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];
    for (const id of sessionIds) {
      const session = sessions[id];
      if (!session.isRunning && session.queue.length === 0) {
        return id;
      }
    }
    // Fall back to first session
    return 'cliSession1';
  }, [sessions]);

  const handleDiscover = useCallback(async () => {
    setStatus('loading');
    setLastError(null);

    try {
      // Create task with prompt from res API
      const task = await createNewsFeedTask({ period });

      // Find available session and add task
      const sessionId = getAvailableSessionId();
      if (sessionId) {
        addTasksToSession(sessionId, [task]);
        setStatus('success');
        toast.success(
          'Task Created',
          `News feed discovery task added to CLI Session. Go to Task Runner to execute.`
        );
      } else {
        throw new Error('No available CLI sessions');
      }
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLastError(message);
      toast.error('Failed to create task', message);
    }
  }, [period, addTasksToSession, getAvailableSessionId]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-cyan-400" />
          News Feed Discovery
        </h2>
        <p className="text-sm text-gray-400">
          Discover newsworthy topics from 10 major news sources using Claude Code.
        </p>
      </div>

      {/* Main Card */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Configure Discovery</CardTitle>
          <CardDescription>
            Select a time period to search for recent news across all sources.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Time Period</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    period === option.value
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-white/10 hover:bg-gray-700/50 hover:text-gray-300'
                  }`}
                >
                  <Clock className="w-4 h-4 inline-block mr-2" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sources Info */}
          <div className="p-4 bg-gray-800/30 rounded-lg border border-white/5">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Sources to Search</h4>
            <div className="flex flex-wrap gap-2">
              {['Twitter', 'BBC', 'Reuters', 'TechCrunch', 'Bloomberg', 'NYT', 'Guardian', 'AP News', 'Al Jazeera', 'Reddit'].map((source) => (
                <span
                  key={source}
                  className="px-2 py-1 text-xs bg-gray-700/50 text-gray-400 rounded-md"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>

          {/* Status Message */}
          {status === 'success' && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">
                Task created successfully! Go to Task Runner to execute.
              </span>
            </div>
          )}

          {status === 'error' && lastError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{lastError}</span>
            </div>
          )}

          {/* Action Button */}
          <UnifiedButton
            onClick={handleDiscover}
            disabled={status === 'loading'}
            colorScheme="cyan"
            variant="gradient"
            size="lg"
            className="w-full"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Task...
              </>
            ) : (
              <>
                <Newspaper className="w-4 h-4" />
                Discover Topics ({period})
              </>
            )}
          </UnifiedButton>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card variant="glass">
        <CardContent className="py-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">How it works</h4>
          <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
            <li>Select a time period for news discovery</li>
            <li>Click &quot;Discover Topics&quot; to create a CLI task</li>
            <li>Go to Task Runner and execute the task in a CLI session</li>
            <li>Claude Code will search all 10 sources and save topics to res</li>
            <li>View discovered topics in res&apos;s Initiate page</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
