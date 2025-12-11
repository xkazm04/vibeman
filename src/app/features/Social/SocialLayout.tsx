'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import SocialTabs, { type SocialTab } from './components/SocialTabs';
import ProjectServersGrid from './sub_ProjectServers/ProjectServersGrid';
import IncomingTopBar from './components/IncomingTopBar';
import SimplifiedRawFeedbackList from './components/SimplifiedRawFeedbackList';
import CompactProcessedList from './components/CompactProcessedList';
import AITypographyButton from './components/AITypographyButton';
import OutcomingPlaceholder from './components/OutcomingPlaceholder';
import TicketCreationModal from './components/TicketCreationModal';
import ReplyModal from './components/ReplyModal';
import JiraTicketModal from './components/JiraTicketModal';
import ClaudeRequirementModal from './components/ClaudeRequirementModal';
import {
  mockRawFeedback,
  mockEvaluatedFeedback,
  mockSuggestedReplies,
} from './lib/mockData';
import type {
  RawFeedback,
  EvaluatedFeedback,
  ProcessingStats,
  FeedbackChannel,
} from './lib/types';

export default function SocialLayout() {
  // Tab state
  const [activeTab, setActiveTab] = useState<SocialTab>('incoming');

  // Channel filter state
  const [activeChannel, setActiveChannel] = useState<FeedbackChannel>('all');

  // Raw feedback state - items waiting for AI processing
  const [rawFeedback, setRawFeedback] = useState<RawFeedback[]>(mockRawFeedback);

  // Evaluated feedback state - items processed by AI
  const [evaluatedFeedback, setEvaluatedFeedback] = useState<EvaluatedFeedback[]>(
    mockEvaluatedFeedback
  );

  // Modal states
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [jiraModalOpen, setJiraModalOpen] = useState(false);
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [selectedFeedbackForView, setSelectedFeedbackForView] = useState<EvaluatedFeedback | null>(null);

  // Channel counts
  const channelCounts = useMemo<Record<FeedbackChannel, number>>(() => ({
    all: rawFeedback.length,
    facebook: rawFeedback.filter((fb) => fb.channel === 'facebook').length,
    twitter: rawFeedback.filter((fb) => fb.channel === 'twitter').length,
    email: rawFeedback.filter((fb) => fb.channel === 'email').length,
  }), [rawFeedback]);

  // Filtered raw feedback by channel
  const filteredRawFeedback = useMemo(() => {
    if (activeChannel === 'all') return rawFeedback;
    return rawFeedback.filter((fb) => fb.channel === activeChannel);
  }, [rawFeedback, activeChannel]);

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
  const handleAIProcess = useCallback(async (
    rawItems: RawFeedback[],
    setEvaluated: React.Dispatch<React.SetStateAction<EvaluatedFeedback[]>>,
    setRaw: React.Dispatch<React.SetStateAction<RawFeedback[]>>
  ) => {
    if (rawItems.length === 0) return;

    // Simulate AI processing with delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Transform raw feedback to evaluated feedback
    const newEvaluated: EvaluatedFeedback[] = rawItems.map((raw, index) => {
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
    setEvaluated((prev) => [...newEvaluated, ...prev]);
    setRaw([]);
  }, []);

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

  // View ticket handler
  const handleViewTicket = useCallback((feedback: EvaluatedFeedback) => {
    setSelectedFeedbackForView(feedback);
    setJiraModalOpen(true);
  }, []);

  // View requirement handler
  const handleViewRequirement = useCallback((feedback: EvaluatedFeedback) => {
    setSelectedFeedbackForView(feedback);
    setRequirementModalOpen(true);
  }, []);

  // Confirm ticket creation
  const handleConfirmTicket = useCallback(() => {
    if (!selectedFeedbackId) return;

    setEvaluatedFeedback((prev) =>
      prev.map((fb) => {
        if (fb.originalFeedbackId === selectedFeedbackId) {
          const ticketKey = `VIB-${Math.floor(Math.random() * 900) + 100}`;
          return {
            ...fb,
            ticket: {
              id: `ticket-${Date.now()}`,
              key: ticketKey,
              title: fb.summary,
              description: fb.content,
              status: 'created' as const,
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
                id: `reply-${Date.now()}`,
                content: replyContent,
                status: 'sent' as const,
                sentAt: new Date(),
                platform: fb.channel,
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
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Social Hub</h1>
              <p className="text-sm text-gray-400">
                Process feedback with AI, create tickets, and manage responses
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <SocialTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </motion.div>

        {/* Content based on active tab */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === 'projects' && (
            <section className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/40 backdrop-blur-sm">
              <ProjectServersGrid />
            </section>
          )}

          {activeTab === 'incoming' && (
            <div className="space-y-6">
              {/* Top Bar with Stats and Filters */}
              <IncomingTopBar
                activeChannel={activeChannel}
                onChannelChange={setActiveChannel}
                channelCounts={channelCounts}
                stats={stats}
                pendingCount={rawFeedback.length}
              />

              {/* Main Content - Three Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                {/* Left Panel - Raw Feedback */}
                <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/40 backdrop-blur-sm min-h-[600px] flex flex-col">
                  <SimplifiedRawFeedbackList
                    feedback={filteredRawFeedback}
                    isProcessing={false}
                  />
                </div>

                {/* Center - AI Processing Button (positioned at top) */}
                <div className="flex flex-col items-center pt-6">
                  <AITypographyButton
                    rawFeedback={rawFeedback}
                    onProcess={handleAIProcess}
                    setEvaluatedFeedback={setEvaluatedFeedback}
                    setRawFeedback={setRawFeedback}
                  />
                </div>

                {/* Right Panel - Compact Processed List */}
                <div className="p-6 rounded-xl bg-gray-900/40 border border-gray-700/40 backdrop-blur-sm min-h-[600px] flex flex-col">
                  <CompactProcessedList
                    feedback={evaluatedFeedback}
                    onCreateTicket={handleCreateTicket}
                    onSendReply={handleSendReply}
                    onViewTicket={handleViewTicket}
                    onViewRequirement={handleViewRequirement}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'outcoming' && <OutcomingPlaceholder />}
        </motion.div>
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

      {/* Jira Ticket Modal */}
      <JiraTicketModal
        isOpen={jiraModalOpen}
        onClose={() => {
          setJiraModalOpen(false);
          setSelectedFeedbackForView(null);
        }}
        ticket={selectedFeedbackForView?.ticket || null}
      />

      {/* Claude Code Requirement Modal */}
      <ClaudeRequirementModal
        isOpen={requirementModalOpen}
        onClose={() => {
          setRequirementModalOpen(false);
          setSelectedFeedbackForView(null);
        }}
        feedback={selectedFeedbackForView}
      />
    </div>
  );
}
