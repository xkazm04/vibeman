import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ConversationBranch } from './types';
import { useChatStore } from './chatStore';

interface EditingState {
  editingMessageId: string | null;
  branches: ConversationBranch[];
  previewBranchId: string | null;
}

interface EditingActions {
  setEditingMessage: (id: string | null) => void;
  editMessageAndResend: (messageId: string, newText: string) => Promise<void>;
  previewBranch: (branchId: string | null) => void;
  restoreBranch: (branchId: string) => void;
  deleteBranch: (branchId: string) => void;
  reset: () => void;
}

type EditingStore = EditingState & EditingActions;

const initialState: EditingState = {
  editingMessageId: null,
  branches: [],
  previewBranchId: null,
};

export const useEditingStore = create<EditingStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setEditingMessage: (id) => set({ editingMessageId: id }),

      editMessageAndResend: async (messageId, newText) => {
        const chatStore = useChatStore.getState();
        const { messages } = chatStore;
        
        const idx = messages.findIndex(m => m.id === messageId);
        if (idx === -1) return;

        const discarded = messages.slice(idx);
        const branch: ConversationBranch = {
          id: `branch-${Date.now()}`,
          editedAtIndex: idx,
          originalText: messages[idx].content,
          messages: discarded,
          timestamp: new Date().toISOString(),
        };

        const kept = messages.slice(0, idx);
        
        // Update both stores
        chatStore.setMessages(kept);
        set((state) => ({
          editingMessageId: null,
          branches: [branch, ...state.branches].slice(0, 10),
        }));

        try {
          await chatStore.sendMessage(newText);
        } catch {
          // Error already set in chat store by sendMessage
        }
      },

      previewBranch: (branchId) => set({ previewBranchId: branchId }),

      restoreBranch: (branchId) => {
        const { branches } = get();
        const chatStore = useChatStore.getState();
        const { messages } = chatStore;

        const branch = branches.find(b => b.id === branchId);
        if (!branch) return;

        const safeIndex = Math.min(branch.editedAtIndex, messages.length);

        if (messages.length > safeIndex) {
          const currentBranch: ConversationBranch = {
            id: `branch-${Date.now()}`,
            editedAtIndex: safeIndex,
            originalText: messages[safeIndex]?.content || '',
            messages: messages.slice(safeIndex),
            timestamp: new Date().toISOString(),
          };

          chatStore.setMessages([...messages.slice(0, safeIndex), ...branch.messages]);
          set((state) => ({
            branches: [currentBranch, ...state.branches.filter(b => b.id !== branchId)].slice(0, 10),
            previewBranchId: null,
          }));
        } else {
          chatStore.setMessages([...messages.slice(0, safeIndex), ...branch.messages]);
          set((state) => ({
            branches: state.branches.filter(b => b.id !== branchId),
            previewBranchId: null,
          }));
        }
      },

      deleteBranch: (branchId) => {
        set((state) => ({
          branches: state.branches.filter(b => b.id !== branchId),
          previewBranchId: state.previewBranchId === branchId ? null : state.previewBranchId,
        }));
      },

      reset: () => set(initialState),
    }),
    { name: 'annette-editing-store' }
  )
);
