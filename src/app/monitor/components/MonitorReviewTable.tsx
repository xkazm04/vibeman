'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getRoleColor, truncateText } from '../lib';
import { Trash2, Zap, Loader, CheckCircle, XCircle } from 'lucide-react';

interface CallMessage {
  callId: string;
  messages: Array<{
    messageId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    evalOk: boolean;
    reviewOk: boolean;
    evalClass?: string;
  }>;
}

export default function MonitorReviewTable() {
  const [callsData, setCallsData] = useState<CallMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingCallId, setDeletingCallId] = useState<string | null>(null);
  const [evaluatingCallId, setEvaluatingCallId] = useState<string | null>(null);

  useEffect(() => {
    loadCallsForReview();
  }, []);

  const loadCallsForReview = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/monitor/calls');
      const data = await response.json();

      if (data.success && data.calls) {
        // Limit to 10 most recent calls
        const recentCalls = data.calls.slice(0, 10);

        // Load messages for each call
        const callsWithMessages = await Promise.all(
          recentCalls.map(async (call: { callId: string }) => {
            const msgResponse = await fetch(`/api/monitor/messages?callId=${call.callId}`);
            const msgData = await msgResponse.json();

            return {
              callId: call.callId,
              messages: msgData.success ? msgData.messages : []
            };
          })
        );

        setCallsData(callsWithMessages);
      }
    } catch (error) {
      console.error('Failed to load calls for review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCall = async (callId: string) => {
    if (!confirm('Delete this call and all related data? This cannot be undone.')) {
      return;
    }

    try {
      setDeletingCallId(callId);
      const response = await fetch(`/api/monitor/calls?callId=${callId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setCallsData(prev => prev.filter(c => c.callId !== callId));
      } else {
        alert('Failed to delete call: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting call:', error);
      alert('Failed to delete call');
    } finally {
      setDeletingCallId(null);
    }
  };

  const handleEvaluateCall = async (callId: string) => {
    try {
      setEvaluatingCallId(callId);
      const response = await fetch('/api/monitor/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Evaluation complete!\n\nEvaluated: ${data.evaluatedCount}\nSkipped: ${data.skippedCount}\nErrors: ${data.errorCount}\nNew classes: ${data.newClassesCreated.join(', ') || 'None'}`);
        // Reload data to show updated evaluation
        await loadCallsForReview();
      } else {
        alert('Evaluation failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error evaluating call:', error);
      alert('Failed to evaluate call');
    } finally {
      setEvaluatingCallId(null);
    }
  };

  // Find max message count for row generation
  const maxMessages = Math.max(...callsData.map(c => c.messages.length), 0);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 p-12 text-center">
        <Loader className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
        <div className="text-gray-400 font-mono">Loading review data...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 overflow-hidden shadow-2xl shadow-slate-500/10">
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-r from-slate-600/20 via-blue-600/10 to-cyan-600/20">
        <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent font-mono uppercase tracking-wider">
          Message Review Table
        </h2>
        <p className="text-sm text-gray-400 mt-1 font-mono">
          Showing last {callsData.length} calls • Click icons to evaluate or delete
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 font-medium text-sm uppercase tracking-wider w-32">
                  Message #
                </th>
                {callsData.map((call) => (
                  <th key={call.callId} className="px-2 py-3 text-center border-l border-gray-800/50">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-cyan-400 font-mono text-sm truncate max-w-[120px]">
                        {call.callId.substring(0, 12)}...
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEvaluateCall(call.callId)}
                          disabled={evaluatingCallId === call.callId}
                          className="p-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 rounded text-blue-300 disabled:opacity-50 transition-all"
                          aria-label="Evaluate with LLM"
                        >
                          {evaluatingCallId === call.callId ? (
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteCall(call.callId)}
                          disabled={deletingCallId === call.callId}
                          className="p-1.5 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 rounded text-red-300 disabled:opacity-50 transition-all"
                          aria-label="Delete call"
                        >
                          {deletingCallId === call.callId ? (
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {callsData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <div className="text-sm font-mono">No calls to review</div>
                  </td>
                </tr>
              ) : (
                Array.from({ length: maxMessages }).map((_, rowIdx) => (
                  <motion.tr
                    key={rowIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: rowIdx * 0.02 }}
                    className="border-b border-gray-800/30 hover:bg-gray-800/20"
                  >
                    <td className="px-4 py-2 font-mono text-sm text-gray-400 font-semibold">
                      #{rowIdx + 1}
                    </td>
                    {callsData.map((call) => {
                      const message = call.messages[rowIdx];
                      
                      if (!message) {
                        return (
                          <td key={call.callId} className="px-2 py-2 border-l border-gray-800/30">
                            <div className="h-16"></div>
                          </td>
                        );
                      }

                      const roleColors = getRoleColor(message.role);

                      return (
                        <td key={call.callId} className="px-2 py-2 border-l border-gray-800/30">
                          <div className={`${roleColors.bg} ${roleColors.border} border rounded p-2 text-sm relative`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`${roleColors.text} font-semibold uppercase text-[10px]`}>
                                {message.role}
                              </span>
                              <div className="flex gap-1">
                                {message.evalOk && (
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                )}
                                {!message.evalOk && message.evalClass && (
                                  <XCircle className="w-3 h-3 text-red-400" />
                                )}
                              </div>
                            </div>
                            <div className="text-gray-300 leading-tight">
                              {truncateText(message.content, 80)}
                            </div>
                            {message.evalClass && (
                              <div className="mt-1 text-[10px] text-cyan-400 font-mono">
                                {message.evalClass}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
