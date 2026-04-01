/**
 * Shared date formatting utilities
 *
 * All date formatting should go through these functions to avoid
 * duplicate implementations scattered across components.
 */

type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

// ── Relative time ────────────────────────────────────────────────────────────

/**
 * Format a date as relative time (e.g., "just now", "5m ago", "2h ago", "3d ago")
 * Falls back to a short date format for dates older than a week.
 */
export function formatRelativeTime(date: DateInput): string {
  try {
    const dateObj = toDate(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return typeof date === 'string' ? date : 'unknown';
  }
}

/**
 * Format a Date as verbose relative time (e.g., "3 minutes ago", "1 hour ago")
 */
export function formatDistanceToNow(date: Date): string {
  try {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'unknown';
  }
}

// ── Absolute date formats ────────────────────────────────────────────────────

/**
 * Short date: "Jan 5, 2026"
 */
export function formatDate(input: DateInput): string {
  try {
    return toDate(input).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return typeof input === 'string' ? input : 'unknown';
  }
}

/**
 * Compact date (no year): "Jan 5"
 */
export function formatDateShort(input: DateInput): string {
  try {
    return toDate(input).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return typeof input === 'string' ? input : 'unknown';
  }
}

/**
 * Date + time: "Jan 5, 2026, 02:30 PM"
 */
export function formatDateTime(input: DateInput): string {
  try {
    return toDate(input).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return typeof input === 'string' ? input : 'unknown';
  }
}

/**
 * Compact date + time (no year): "Jan 5, 02:30 PM"
 */
export function formatDateTimeShort(input: DateInput): string {
  try {
    return toDate(input).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return typeof input === 'string' ? input : 'unknown';
  }
}

/**
 * ISO date only: "2026-01-05" (for input fields & APIs)
 */
export function formatDateISO(input: DateInput): string {
  try {
    return toDate(input).toISOString().split('T')[0];
  } catch {
    return typeof input === 'string' ? input : '';
  }
}

/**
 * Zero-padded month-day: "01-05"
 */
export function formatDateCompact(input: DateInput): string {
  try {
    const d = toDate(input);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return typeof input === 'string' ? input : 'unknown';
  }
}

/**
 * Relative date with Today/Yesterday labels and time, falling back to short relative.
 * "Today 14:30", "Yesterday 09:15", "5d ago", locale date for older
 */
export function formatDateWithDayLabel(input: DateInput | null): string {
  if (!input) return '—';
  try {
    const date = toDate(input);
    const now = Date.now();
    const diffDays = Math.floor((now - date.getTime()) / 86400000);
    if (diffDays === 0) return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return typeof input === 'string' ? input : 'unknown';
  }
}

/**
 * Fuzzy relative: "Today", "Yesterday", "3 days ago", "2 weeks ago", then short date
 */
export function formatDateFuzzy(input: DateInput): string {
  try {
    const date = toDate(input);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return typeof input === 'string' ? input : 'unknown';
  }
}
