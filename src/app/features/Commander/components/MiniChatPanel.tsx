/**
 * Mini Chat Panel
 * Compact scrollable message list for the TopBar dropdown widget
 */

'use client';

import { useChatStore } from '@/stores/annette/chatStore';
import { useEditingStore } from '@/stores/annette/editingStore';
import MessageList from './MessageList';

export default function MiniChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const branches = useEditingStore((s) => s.branches);
  const isLoading = useChatStore((s) => s.isLoading);

  const displayMessages = messages.slice(-20);

  return (
    <MessageList
      messages={displayMessages}
      isLoading={isLoading}
      mode="compact"
      showBranches={true}
      branches={branches}
    />
  );
}
