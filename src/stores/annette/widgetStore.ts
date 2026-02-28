/**
 * Annette Widget Store
 * Manages the TopBar widget open/close state and unread count.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface WidgetState {
  isWidgetOpen: boolean;
  unreadCount: number;
}

interface WidgetActions {
  toggleWidget: () => void;
  closeWidget: () => void;
  markAllRead: () => void;
  incrementUnread: () => void;
  reset: () => void;
}

type WidgetStore = WidgetState & WidgetActions;

const initialState: WidgetState = {
  isWidgetOpen: false,
  unreadCount: 0,
};

export const useWidgetStore = create<WidgetStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      toggleWidget: () => {
        const { isWidgetOpen } = get();
        set({ isWidgetOpen: !isWidgetOpen, unreadCount: isWidgetOpen ? get().unreadCount : 0 });
      },
      closeWidget: () => set({ isWidgetOpen: false }),
      markAllRead: () => set({ unreadCount: 0 }),
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

      reset: () => set(initialState),
    }),
    { name: 'annette-widget-store' }
  )
);
