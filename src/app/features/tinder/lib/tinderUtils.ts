/**
 * Tinder feature utilities and constants
 */

export const TINDER_CONSTANTS = {
  BATCH_SIZE: 20,
  PREVIEW_CARDS: 3,
  LOAD_MORE_THRESHOLD: 5,
} as const;

export const TINDER_ANIMATIONS = {
  HEART_ROTATION: {
    rotate: [0, 5, -5, 0] as number[],
    transition: { duration: 4, repeat: Infinity }
  },
  CARD_STACK_TRANSFORM: (index: number) => ({
    scale: 1 - index * 0.05,
    transform: `translateY(${index * 10}px)`,
    filter: index > 0 ? 'brightness(0.7)' : 'brightness(1)',
  }),
  BUTTON_HOVER: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 }
  }
};

/**
 * Format remaining count for display
 */
export function formatRemainingCount(remaining: number): string {
  if (remaining === 0) return '0';
  if (remaining < 1000) return remaining.toString();
  if (remaining < 10000) return `${Math.floor(remaining / 100) / 10}k`;
  return `${Math.floor(remaining / 1000)}k+`;
}

/**
 * Get progress percentage
 */
export function getProgress(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * Format stats for display
 */
export function formatStats(stats: { accepted: number; rejected: number; deleted: number }) {
  return {
    accepted: formatCount(stats.accepted),
    rejected: formatCount(stats.rejected),
    deleted: formatCount(stats.deleted),
    total: formatCount(stats.accepted + stats.rejected + stats.deleted)
  };
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  return `${Math.floor(count / 100) / 10}k`;
}