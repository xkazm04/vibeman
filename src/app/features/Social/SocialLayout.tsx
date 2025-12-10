'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Sparkles } from 'lucide-react';
import ProjectServersGrid from './components/ProjectServersGrid';
import RawFeedbackList from './components/RawFeedbackList';
import EvaluatedFeedbackList from './components/EvaluatedFeedbackList';
import AIProcessingButton from './components/AIProcessingButton';
import TicketCreationModal from './components/TicketCreationModal';
import ReplyModal from './components/ReplyModal';
import ProcessingStatsComponent from './components/ProcessingStats';
import {
  mockRawFeedback,
  mockEvaluatedFeedback,
  mockSuggestedReplies,
  mockTicketTemplates,
} from './lib/mockData';
import type {
  RawFeedback,
  EvaluatedFeedback,
  ProcessingStats,
  FeedbackChannel,
} from './lib/types';

export default function SocialLayout() {
  // Raw feedback state - items waiting for AI processing
  const [rawFeedback, setRawFeedback] = useState<RawFeedback[]>(mockRawFeedback);

  // Evaluated feedback state - items processed by AI
  const [evaluatedFeedback, setEvaluatedFeedback] = useState<EvaluatedFeedback[]>(
    mockEvaluatedFeedback
  );

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);

  // Stats
  const stats: ProcessingStats = useMemo(() => {
    const bugs = evaluatedFeedback.filter((fb) => fb.category === 'bug').length;
    const proposals = evaluatedFeedback.filter((fb) => fb.category === 'proposal').length;
    const feedback = evaluatedFeedback.filter((fb) => fb.category === 'feedback').length;
    const ticketsCreated = evaluatedFeedback.filter((fb) => fb.ticket).length;
    const ticketsResolved = evaluatedFeedback.filter(
      (fb) => fb.ticket?.status === 'resolved'
    ).length;
    const repliesSent = evaluatedFeedback.filter(
      (fb) => fb.reply?.status === 'sent'
    ).length;
    const repliesPending = evaluatedFeedback.filter(
      (fb) => fb.reply?.status === 'pending'
    ).length;

    return {
      totalProcessed: evaluatedFeedback.length,
      bugs,
      proposals,
      feedback,
      ticketsCreated,
      ticketsResolved,
      repliesSent,
      repliesPending,
    };
  }, [evaluatedFeedback]);

  // AI Processing handler
  const handleAIProcess = useCallback(async () => {
    if (rawFeedback.length === 0) return;

    setIsProcessing(true);

    // Simulate AI processing with delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Transform raw feedback to evaluated feedback
    const newEvaluated: EvaluatedFeedback[] = rawFeedback.map((raw, index) => {
      // Determine category based on content keywords (mock logic)
      let category: 'bug' | 'proposal' | 'feedback' = 'feedback';
      const content = raw.content.toLowerCase();

      if (
        content.includes('bug') ||
        content.includes('error') ||
        content.includes('crash') ||
        content.includes('broken') ||
        content.includes('fix')
      ) {
        category = 'bug';
      } else if (
        content.includes('feature') ||
        content.includes('add') ||
        content.includes('would be nice') ||
        content.includes('suggest') ||
        content.includes('idea')
      ) {
        category = 'proposal';
      }

      // Determine priority based on content
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (content.includes('urgent') || content.includes('critical') || content.includes('crash')) {
        priority = 'critical';
      } else if (content.includes('important') || content.includes('security')) {
        priority = 'high';
      } else if (content.includes('minor') || content.includes('small')) {
        priority = 'low';
      }

      // Generate summary
      const summary =
        raw.content.length > 60 ? raw.content.substring(0, 60) + '...' : raw.content;

      // Generate suggested action
      const actions: Record<typeof category, string> = {
        bug: 'Create a bug ticket and assign to development team for investigation.',
        proposal: 'Review proposal and add to product backlog for consideration.',
        feedback: 'Send acknowledgment reply and document for product insights.',
      };

      return {
        id: `eval-${Date.now()}-${index}`,
        originalFeedbackId: raw.id,
        channel: raw.channel,
        author: raw.author,
        authorHandle: raw.authorHandle,
        authorAvatar: raw.authorAvatar,
        content: raw.content,
        timestamp: raw.timestamp,
        url: raw.url,
        category,
        summary,
        priority,
        suggestedAction: actions[category],
        evaluatedAt: new Date(),
      };
    });

    // Move items from raw to evaluated
    setEvaluatedFeedback((prev) => [...newEvaluated, ...prev]);
    setRawFeedback([]);
    setIsProcessing(false);
  }, [rawFeedback]);

  // Create ticket handler
  const handleCreateTicket = useCallback((feedbackId: string) => {
    setSelectedFeedbackId(feedbackId);
    setTicketModalOpen(true);
  }, []);

  // Send reply handler
  const handleSendReply = useCallback((feedbackId: string) => {
    setSelectedFeedbackId(feedbackId);
    setReplyModalOpen(true);
  }, []);

  // Confirm ticket creation
  const handleConfirmTicket = useCallback(() => {
    if (!selectedFeedbackId) return;

    setEvaluatedFeedback((prev) =>
      prev.map((fb) => {
        if (fb.originalFeedbackId === selectedFeedbackId) {
          return {
            ...fb,
            ticket: {
              key: `VIB-${Math.floor(Math.random() * 900) + 100}`,
              title: fb.summary,
              status: 'open',
              priority: fb.priority,
              createdAt: new Date(),
            },
          };
        }
        return fb;
      })
    );

    setSelectedFeedbackId(null);
  }, [selectedFeedbackId]);

  // Confirm reply
  const handleConfirmReply = useCallback(
    (replyContent: string) => {
      if (!selectedFeedbackId) return;

      setEvaluatedFeedback((prev) =>
        prev.map((fb) => {
          if (fb.originalFeedbackId === selectedFeedbackId) {
            return {
              ...fb,
              reply: {
                content: replyContent,
                status: 'sent',
                sentAt: new Date(),
              },
            };
          }
          return fb;
        })
      );

      setSelectedFeedbackId(null);
    },
    [selectedFeedbackId]
  );

  // Get selected feedback for modals
  const selectedFeedback = useMemo(() => {
    if (!selectedFeedbackId) return null;
    return evaluatedFeedback.find((fb) => fb.originalFeedbackId === selectedFeedbackId);
  }, [selectedFeedbackId, evaluatedFeedback]);

  // Ticket data for modal
  const ticketData = useMemo(() => {
    if (!selectedFeedback) return null;
    return {
      title: selectedFeedback.summary,
      description: `Original feedback from ${selectedFeedback.author} via ${selectedFeedback.channel}:\n\n${selectedFeedback.content}\n\nSuggested Action: ${selectedFeedback.suggestedAction}`,
      priority: selectedFeedback.priority,
    };
  }, [selectedFeedback]);

  // Reply data for modal
  const replyData = useMemo(() => {
    if (!selectedFeedback) return null;

    // Get suggested reply from mock data or generate one
    const suggested =
      mockSuggestedReplies[selectedFeedback.originalFeedbackId] ||
      `Thank you for your ${selectedFeedback.category === 'bug' ? 'report' : 'feedback'}, ${selectedFeedback.author}! We appreciate you taking the time to reach out. Our team is reviewing this and will follow up soon.`;

    return {
      originalMessage: selectedFeedback.content,
      author: selectedFeedback.author,
      channel: selectedFeedback.channel,
      suggestedReply: suggested,
    };
  }, [selectedFeedback]);

  return (
    <div className="min-h-screen pt-20 pb-8 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Social Hub</h1>
            <p className="text-sm text-gray-400">
              Process feedback with AI, create tickets, and manage responses
            </p>
          </div>
        </motion.div>

        {/* Project Servers Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/40 backdrop-blur-sm"
        >
          <ProjectServersGrid />
        </motion.section>

        {/* Main Content - Three Column Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start"
        >
          {/* Left Panel - Raw Feedback */}
          <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/40 backdrop-blur-sm min-h-[600px] flex flex-col">
            <RawFeedbackList feedback={rawFeedback} isProcessing={isProcessing} />
          </div>

          {/* Center - AI Processing Button */}
          <div className="flex flex-col items-center justify-center py-8 lg:py-0 lg:self-center">
            <AIProcessingButton
              isProcessing={isProcessing}
              pendingCount={rawFeedback.length}
              onProcess={handleAIProcess}
              disabled={rawFeedback.length === 0}
            />

            {/* Processing hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-center"
            >
              <p className="text-xs text-gray-500 max-w-[120px]">
                {rawFeedback.length > 0
                  ? 'Process feedback with AI'
                  : 'No items to process'}
              </p>
            </motion.div>
          </div>

          {/* Right Panel - Evaluated Feedback + Stats */}
          <div className="space-y-4">
            {/* Stats Summary */}
            <ProcessingStatsComponent stats={stats} />

            {/* Evaluated Feedback List */}
            <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/40 backdrop-blur-sm min-h-[450px] flex flex-col">
              <EvaluatedFeedbackList
                feedback={evaluatedFeedback}
                onCreateTicket={handleCreateTicket}
                onSendReply={handleSendReply}
              />
            </div>
          </div>
        </motion.div>

        {/* Processing indicator overlay */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-purple-500/20 border border-purple-500/30 backdrop-blur-xl">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="text-sm font-medium text-purple-300">
                AI is analyzing {rawFeedback.length} feedback items...
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Ticket Creation Modal */}
      <TicketCreationModal
        isOpen={ticketModalOpen}
        onClose={() => {
          setTicketModalOpen(false);
          setSelectedFeedbackId(null);
        }}
        ticketData={ticketData}
        onConfirm={handleConfirmTicket}
      />

      {/* Reply Modal */}
      <ReplyModal
        isOpen={replyModalOpen}
        onClose={() => {
          setReplyModalOpen(false);
          setSelectedFeedbackId(null);
        }}
        replyData={replyData}
        onConfirm={handleConfirmReply}
      />
    </div>
  );
}
