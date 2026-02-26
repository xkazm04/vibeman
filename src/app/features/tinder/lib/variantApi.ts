import type { IdeaVariant } from '@/app/api/ideas/variants/route';

export type { IdeaVariant };

/**
 * Generate scope variants (MVP / Standard / Ambitious) for an idea
 */
export async function generateVariants(ideaId: string): Promise<{
  variants: IdeaVariant[];
  error?: string;
}> {
  try {
    const response = await fetch('/api/ideas/variants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { variants: [], error: data.error || 'Failed to generate variants' };
    }

    const data = await response.json();
    return { variants: data.variants || [] };
  } catch {
    return { variants: [], error: 'Network error generating variants' };
  }
}

/** Scope preference key for localStorage */
const SCOPE_PREF_KEY = 'vibeman:scope-preferences';

interface ScopePreferences {
  [category: string]: {
    mvp: number;
    standard: number;
    ambitious: number;
  };
}

/**
 * Record a user's scope choice for preference learning
 */
export function recordScopeChoice(category: string, scope: IdeaVariant['scope']): void {
  try {
    const raw = localStorage.getItem(SCOPE_PREF_KEY);
    const prefs: ScopePreferences = raw ? JSON.parse(raw) : {};

    if (!prefs[category]) {
      prefs[category] = { mvp: 0, standard: 0, ambitious: 0 };
    }
    prefs[category][scope]++;

    localStorage.setItem(SCOPE_PREF_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Get the preferred scope for a category (the most frequently chosen)
 * Returns null if no preferences recorded yet
 */
export function getPreferredScope(category: string): IdeaVariant['scope'] | null {
  try {
    const raw = localStorage.getItem(SCOPE_PREF_KEY);
    if (!raw) return null;

    const prefs: ScopePreferences = JSON.parse(raw);
    const catPrefs = prefs[category];
    if (!catPrefs) return null;

    const total = catPrefs.mvp + catPrefs.standard + catPrefs.ambitious;
    if (total < 3) return null; // Need at least 3 decisions to suggest

    const entries: [IdeaVariant['scope'], number][] = [
      ['mvp', catPrefs.mvp],
      ['standard', catPrefs.standard],
      ['ambitious', catPrefs.ambitious],
    ];
    entries.sort((a, b) => b[1] - a[1]);

    // Only suggest if the top choice is at least 50% of all decisions
    if (entries[0][1] / total >= 0.5) {
      return entries[0][0];
    }
    return null;
  } catch {
    return null;
  }
}
