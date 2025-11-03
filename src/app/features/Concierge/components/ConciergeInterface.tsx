'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { DbFeatureRequest } from '@/app/db';

interface ConciergeInterfaceProps {
  projectId: string;
  projectPath: string;
  projectType?: 'nextjs' | 'fastapi' | 'other';
  requesterName: string;
  requesterEmail?: string;
}

export default function ConciergeInterface({
  projectId,
  projectPath,
  projectType,
  requesterName,
  requesterEmail,
}: ConciergeInterfaceProps) {
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<DbFeatureRequest | null>(null);
  const [recentRequests, setRecentRequests] = useState<DbFeatureRequest[]>([]);

  useEffect(() => {
    loadRecentRequests();
  }, [projectId]);

  const loadRecentRequests = async () => {
    try {
      const response = await fetch(`/api/concierge/requests?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setRecentRequests(data.data.slice(0, 5));
      }
    } catch (error) {
      // Failed to load recent requests - silent failure
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) return;

    setIsSubmitting(true);

    try {
      // Create feature request
      const createResponse = await fetch('/api/concierge/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          requesterName,
          requesterEmail,
          source: 'ui',
          naturalLanguageDescription: description,
          priority,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create request');
      }

      const { data: request } = await createResponse.json();
      setCurrentRequest(request);

      // Generate code
      const generateResponse = await fetch('/api/concierge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          projectPath,
          projectType,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate code');
      }

      const { data: result } = await generateResponse.json();

      // Reload the request to get updated status
      const updatedResponse = await fetch(`/api/concierge/requests?requestId=${request.id}`);
      if (updatedResponse.ok) {
        const { data: updated } = await updatedResponse.json();
        setCurrentRequest(updated.request);
      }

      // Clear form
      setDescription('');
      loadRecentRequests();
    } catch (error) {
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const response = await fetch('/api/concierge/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          projectPath,
          autoCommit: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to commit code');
      }

      alert('Code committed successfully!');
      setCurrentRequest(null);
      loadRecentRequests();
    } catch (error) {
      alert('Failed to commit code. Please try again.');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await fetch('/api/concierge/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status: 'rejected',
        }),
      });

      setCurrentRequest(null);
      loadRecentRequests();
    } catch (error) {
      // Failed to reject request - silent failure
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900/60 backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-gray-700/40 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 px-6 py-4">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-6 h-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-bold text-white">AI Code Concierge</h2>
            <p className="text-sm text-gray-400">Describe your feature in plain English</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Request Form */}
        <motion.div
          className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/40 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Feature Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Add a dark mode toggle to the settings page with user preference persistence..."
                className="w-full h-32 bg-gray-900/60 border border-gray-700/40 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-gray-900/60 border border-gray-700/40 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  disabled={isSubmitting}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="mt-7 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Request</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Current Request Status */}
        <AnimatePresence>
          {currentRequest && (
            <motion.div
              className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/40 rounded-xl p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {currentRequest.status === 'code_generated' && (
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  )}
                  {currentRequest.status === 'analyzing' && (
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  )}
                  {currentRequest.status === 'failed' && (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {currentRequest.status === 'code_generated' && 'Code Generated!'}
                      {currentRequest.status === 'analyzing' && 'Analyzing Request...'}
                      {currentRequest.status === 'failed' && 'Generation Failed'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {new Date(currentRequest.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {currentRequest.status === 'code_generated' && (
                <div className="space-y-4">
                  <div className="bg-gray-900/60 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">AI Analysis</h4>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap">
                      {currentRequest.ai_analysis}
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <motion.button
                      onClick={() => handleApprove(currentRequest.id)}
                      className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/40 rounded-lg font-medium flex items-center justify-center space-x-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Commit</span>
                    </motion.button>

                    <motion.button
                      onClick={() => handleReject(currentRequest.id)}
                      className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg font-medium flex items-center justify-center space-x-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </motion.button>
                  </div>
                </div>
              )}

              {currentRequest.status === 'failed' && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-4">
                  <p className="text-sm text-red-300">{currentRequest.error_message}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Requests */}
        {recentRequests.length > 0 && (
          <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/40 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Requests</h3>
            <div className="space-y-2">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-900/40 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm text-white truncate">
                      {request.natural_language_description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    request.status === 'committed' ? 'bg-green-500/20 text-green-300' :
                    request.status === 'code_generated' ? 'bg-blue-500/20 text-blue-300' :
                    request.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {request.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
