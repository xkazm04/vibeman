import type { RawFeedback, EvaluatedFeedback, ProcessingStats } from './types';

// Raw unprocessed feedback from social sources
export const mockRawFeedback: RawFeedback[] = [
  // Facebook feedback
  {
    id: 'fb-1',
    channel: 'facebook',
    author: 'John Smith',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    content: 'The app keeps crashing whenever I try to open the settings menu. Started happening after the latest update.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: 'fb-2',
    channel: 'facebook',
    author: 'Sarah Johnson',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    content: 'Would be amazing if you could add keyboard shortcuts for the most common actions. Would speed up my workflow significantly!',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: 'fb-3',
    channel: 'facebook',
    author: 'Mike Chen',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
    content: 'Just discovered this tool and I am blown away. The AI suggestions are incredibly helpful. Great job team!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    originalPost: {
      author: 'Vibeman Official',
      content: 'Introducing our new AI-powered code suggestions feature! Try it out and let us know what you think.',
    },
  },

  // Twitter feedback
  {
    id: 'tw-1',
    channel: 'twitter',
    author: 'DevTech Review',
    authorHandle: '@devtechreview',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devtech',
    content: 'The export to PDF feature is broken. Getting a blank page every time I try. Anyone else having this issue?',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    url: 'https://twitter.com/devtechreview/status/123',
  },
  {
    id: 'tw-2',
    channel: 'twitter',
    author: 'Code Ninja',
    authorHandle: '@codeninja_dev',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ninja',
    content: 'Would love to see VS Code integration. Any plans for that? This would be a game changer for my team.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    url: 'https://twitter.com/codeninja_dev/status/124',
  },
  {
    id: 'tw-3',
    channel: 'twitter',
    author: 'Startup Weekly',
    authorHandle: '@startupweekly',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=startup',
    content: 'We featured @vibeman in our latest roundup. The tool is genuinely impressive and our readers loved it.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    url: 'https://twitter.com/startupweekly/status/125',
    originalPost: {
      author: 'Startup Weekly',
      content: 'Top 10 Developer Tools of 2024 - Our annual roundup is here! Which ones are you using?',
    },
  },
  {
    id: 'tw-4',
    channel: 'twitter',
    author: 'React Developer',
    authorHandle: '@react_dev_jane',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
    content: 'Memory leak detected when running the analyzer on large projects. CPU usage spikes to 100% and stays there.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    url: 'https://twitter.com/react_dev_jane/status/126',
  },

  // Email feedback
  {
    id: 'em-1',
    channel: 'email',
    author: 'Enterprise Solutions Inc.',
    content: 'We are interested in enterprise licensing for our 500+ developer team. Please share pricing details and any volume discounts available.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: 'em-2',
    channel: 'email',
    author: 'Tech University',
    content: 'Our computer science department would like to integrate Vibeman into our curriculum. Do you offer educational partnerships or licenses?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
  },
  {
    id: 'em-3',
    channel: 'email',
    author: 'David Thompson',
    content: 'The auto-save feature corrupted my project file. Lost 2 hours of work. This is unacceptable for a paid product.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    id: 'em-4',
    channel: 'email',
    author: 'Freelance Developer',
    content: 'Can you add support for Python virtual environment detection? Currently I have to configure each project manually which is tedious.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: 'em-5',
    channel: 'email',
    author: 'Happy Customer',
    content: 'Just wanted to say thank you for such an amazing tool. The onboarding was smooth and I was productive within minutes. Keep up the great work!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
];

// Simulated AI evaluation results
export const mockEvaluationResults: Record<string, Omit<EvaluatedFeedback, keyof RawFeedback | 'originalFeedbackId'>> = {
  'fb-1': {
    category: 'bug',
    summary: 'Settings menu crash after update',
    priority: 'high',
    suggestedAction: 'Investigate settings menu initialization after v2.3 update. Check for null pointer exceptions.',
    evaluatedAt: new Date(),
  },
  'fb-2': {
    category: 'proposal',
    summary: 'Keyboard shortcuts feature request',
    priority: 'medium',
    suggestedAction: 'Add to feature backlog. Consider implementing Cmd/Ctrl shortcuts for: save, undo, redo, search.',
    evaluatedAt: new Date(),
  },
  'fb-3': {
    category: 'feedback',
    summary: 'Positive feedback on AI suggestions',
    priority: 'low',
    suggestedAction: 'Thank the user and encourage them to share their experience. Consider for testimonial.',
    evaluatedAt: new Date(),
  },
  'tw-1': {
    category: 'bug',
    summary: 'PDF export produces blank pages',
    priority: 'critical',
    suggestedAction: 'Critical bug affecting export functionality. Check PDF renderer and page content injection.',
    evaluatedAt: new Date(),
  },
  'tw-2': {
    category: 'proposal',
    summary: 'VS Code extension integration',
    priority: 'high',
    suggestedAction: 'Popular request. Evaluate VS Code Extension API. Consider as Q2 roadmap item.',
    evaluatedAt: new Date(),
  },
  'tw-3': {
    category: 'feedback',
    summary: 'Positive press coverage',
    priority: 'low',
    suggestedAction: 'Thank the publication and share on our social channels. Great for marketing.',
    evaluatedAt: new Date(),
  },
  'tw-4': {
    category: 'bug',
    summary: 'Memory leak in analyzer for large projects',
    priority: 'high',
    suggestedAction: 'Performance issue. Profile memory usage with large codebases. Check for unclosed streams.',
    evaluatedAt: new Date(),
  },
  'em-1': {
    category: 'proposal',
    summary: 'Enterprise licensing inquiry',
    priority: 'high',
    suggestedAction: 'High-value lead. Forward to sales team. Prepare enterprise pricing deck.',
    evaluatedAt: new Date(),
  },
  'em-2': {
    category: 'proposal',
    summary: 'Educational partnership request',
    priority: 'medium',
    suggestedAction: 'Consider educational discount program. Good for brand awareness and future customers.',
    evaluatedAt: new Date(),
  },
  'em-3': {
    category: 'bug',
    summary: 'Auto-save corrupting project files',
    priority: 'critical',
    suggestedAction: 'Critical data loss bug. Immediate investigation required. Check file write permissions and locks.',
    evaluatedAt: new Date(),
  },
  'em-4': {
    category: 'proposal',
    summary: 'Python virtual environment auto-detection',
    priority: 'medium',
    suggestedAction: 'Add to Python tooling improvements. Check for venv, conda, pyenv markers.',
    evaluatedAt: new Date(),
  },
  'em-5': {
    category: 'feedback',
    summary: 'Positive onboarding experience',
    priority: 'low',
    suggestedAction: 'Thank the user. Request permission for testimonial use.',
    evaluatedAt: new Date(),
  },
};

// Suggested replies for feedback items
export const mockSuggestedReplies: Record<string, string> = {
  'fb-1': "Hi John, thank you for reporting this issue. We've identified the cause and a fix will be included in our next update (v2.3.1) coming this week. We apologize for the inconvenience!",
  'fb-2': "Great suggestion Sarah! We're actively working on keyboard shortcuts and they'll be part of our upcoming release. Stay tuned!",
  'fb-3': "Thank you so much Mike! We're thrilled you're enjoying the AI suggestions. Feel free to reach out if you have any feedback or ideas!",
  'tw-1': "@devtechreview Thanks for reporting! We've pushed a hotfix. Please try updating to the latest version and let us know if the issue persists.",
  'tw-2': "@codeninja_dev Great idea! VS Code integration is on our roadmap. We'll share updates soon. Thanks for the feedback!",
  'tw-3': "@startupweekly Thank you for the feature! We're honored to be included in your roundup. Excited to keep building great tools for developers!",
  'tw-4': "@react_dev_jane Thanks for the detailed report. We've identified the memory leak and a fix is in testing. Update coming soon!",
  'em-1': "Thank you for your interest in Vibeman Enterprise! I'd be happy to schedule a call to discuss pricing and your team's specific needs. Would next Tuesday work for you?",
  'em-2': "We'd love to support your computer science program! We offer a 75% educational discount for universities. Let me connect you with our education team.",
  'em-3': "David, I'm deeply sorry for this experience. This is not acceptable and we take data loss very seriously. We've identified the issue and deployed a fix. Can we offer you 3 months free as compensation?",
  'em-4': "Thank you for the suggestion! Python virtual environment detection is now on our development roadmap. We'll notify you when it's available.",
  'em-5': "Thank you for the kind words! It means a lot to our team. Would you be open to us featuring your quote on our website?",
};

// Mock ticket templates
export const mockTicketTemplates: Record<string, { title: string; description: string }> = {
  'fb-1': {
    title: '[BUG] Settings menu crash after v2.3 update',
    description: 'Users report app crash when opening settings menu.\n\n**Steps to reproduce:**\n1. Update to latest version\n2. Open app\n3. Click on settings\n\n**Expected:** Settings menu opens\n**Actual:** App crashes\n\n**Source:** Facebook feedback from John Smith',
  },
  'tw-1': {
    title: '[BUG] PDF export produces blank pages',
    description: 'PDF export functionality broken - producing blank pages.\n\n**Steps to reproduce:**\n1. Create or open a project\n2. Click Export > PDF\n3. Check generated file\n\n**Expected:** PDF with content\n**Actual:** Blank PDF\n\n**Source:** Twitter report from @devtechreview',
  },
  'tw-4': {
    title: '[BUG] Memory leak when analyzing large projects',
    description: 'Memory leak causing 100% CPU usage on large codebases.\n\n**Environment:** Large projects (1000+ files)\n**Symptoms:** CPU spikes to 100% and stays elevated\n\n**Source:** Twitter report from @react_dev_jane',
  },
  'em-3': {
    title: '[CRITICAL] Auto-save corrupting project files',
    description: 'Auto-save feature causing project file corruption and data loss.\n\n**Impact:** Users losing work\n**Priority:** P0 - Critical\n\n**Investigation:**\n- Check file write operations\n- Verify file locks\n- Review auto-save timing\n\n**Source:** Email from David Thompson',
  },
};

// Helper functions
export function getRawFeedbackByChannel(channel: 'all' | 'facebook' | 'twitter' | 'email'): RawFeedback[] {
  if (channel === 'all') {
    return mockRawFeedback;
  }
  return mockRawFeedback.filter(fb => fb.channel === channel);
}

// Alias for backwards compatibility with legacy FeedbackList component
export const getFeedbackByChannel = getRawFeedbackByChannel;

export function getChannelCounts(): Record<string, number> {
  return {
    all: mockRawFeedback.length,
    facebook: mockRawFeedback.filter(fb => fb.channel === 'facebook').length,
    twitter: mockRawFeedback.filter(fb => fb.channel === 'twitter').length,
    email: mockRawFeedback.filter(fb => fb.channel === 'email').length,
  };
}

export function evaluateFeedback(raw: RawFeedback): EvaluatedFeedback {
  const evaluation = mockEvaluationResults[raw.id];
  return {
    ...raw,
    id: `eval-${raw.id}`,
    originalFeedbackId: raw.id,
    ...evaluation,
  };
}

export function getSuggestedReply(feedbackId: string): string {
  return mockSuggestedReplies[feedbackId] || 'Thank you for your feedback! We appreciate you taking the time to share your thoughts.';
}

export function getTicketTemplate(feedbackId: string): { title: string; description: string } | null {
  return mockTicketTemplates[feedbackId] || null;
}

export function getInitialStats(): ProcessingStats {
  return {
    totalProcessed: 0,
    bugs: 0,
    proposals: 0,
    feedback: 0,
    ticketsCreated: 0,
    ticketsResolved: 0,
    repliesSent: 0,
    repliesPending: 0,
  };
}

// Pre-evaluated feedback for initial demo state (shows some items already processed)
export const mockEvaluatedFeedback: EvaluatedFeedback[] = [
  {
    id: 'eval-demo-1',
    originalFeedbackId: 'demo-1',
    channel: 'twitter',
    author: 'Alex Developer',
    authorHandle: '@alexdev',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    content: 'Found a bug where the dark mode toggle resets to light mode after closing the app. Reproducible every time.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    url: 'https://twitter.com/alexdev/status/789',
    category: 'bug',
    summary: 'Dark mode toggle resets on app restart',
    priority: 'medium',
    suggestedAction: 'Investigate user preferences persistence. Check localStorage/session handling.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
    ticket: {
      id: 'ticket-demo-1',
      key: 'VIB-142',
      title: 'Dark mode toggle resets on app restart',
      description: 'Found a bug where the dark mode toggle resets to light mode after closing the app. Reproducible every time.',
      status: 'created',
      priority: 'medium',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
    },
  },
  {
    id: 'eval-demo-2',
    originalFeedbackId: 'demo-2',
    channel: 'facebook',
    author: 'Maria Santos',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
    content: 'It would be really helpful if there was a way to export my projects to GitHub directly from the app!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
    category: 'proposal',
    summary: 'GitHub export integration request',
    priority: 'high',
    suggestedAction: 'Add to Q1 roadmap. Research GitHub API integration. Popular feature request.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 60 * 30),
  },
  {
    id: 'eval-demo-3',
    originalFeedbackId: 'demo-3',
    channel: 'email',
    author: 'Happy Enterprise User',
    content: 'Our team has been using Vibeman for 3 months now and productivity has increased by 40%. Amazing tool!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    category: 'feedback',
    summary: 'Positive enterprise user testimonial',
    priority: 'low',
    suggestedAction: 'Thank user and request permission for case study/testimonial.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 60 * 44),
    reply: {
      id: 'reply-demo-3',
      content: "Thank you so much for sharing this! We're thrilled to hear about your team's productivity gains. Would you be open to a brief case study?",
      status: 'sent',
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 40),
      platform: 'email',
    },
  },
];
