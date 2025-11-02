/**
 * Badge Store
 *
 * Manages earned badges during Blueprint onboarding.
 * Persists to localStorage for continuity across sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Badge, AVAILABLE_BADGES } from '@/types/badges';

interface BadgeStore {
  earnedBadges: Badge[];

  // Actions
  awardBadge: (badgeId: string) => void;
  hasBadge: (badgeId: string) => boolean;
  resetBadges: () => void;
  getBadgesByCategory: (category: Badge['category']) => Badge[];
  getProgress: () => { earned: number; total: number; percentage: number };
}

export const useBadgeStore = create<BadgeStore>()(
  persist(
    (set, get) => ({
      earnedBadges: [],

      awardBadge: (badgeId: string) => {
        const badge = AVAILABLE_BADGES[badgeId];
        if (!badge) {
          console.warn(`Badge with id "${badgeId}" not found`);
          return;
        }

        // Check if badge already earned
        if (get().hasBadge(badgeId)) {
          return;
        }

        set((state) => ({
          earnedBadges: [
            ...state.earnedBadges,
            {
              ...badge,
              earnedAt: new Date().toISOString(),
            },
          ],
        }));
      },

      hasBadge: (badgeId: string) => {
        return get().earnedBadges.some((b) => b.id === badgeId);
      },

      resetBadges: () => {
        set({ earnedBadges: [] });
      },

      getBadgesByCategory: (category: Badge['category']) => {
        return get().earnedBadges.filter((b) => b.category === category);
      },

      getProgress: () => {
        const earned = get().earnedBadges.length;
        const total = Object.keys(AVAILABLE_BADGES).length;
        return {
          earned,
          total,
          percentage: total > 0 ? Math.round((earned / total) * 100) : 0,
        };
      },
    }),
    {
      name: 'badge-storage',
    }
  )
);
