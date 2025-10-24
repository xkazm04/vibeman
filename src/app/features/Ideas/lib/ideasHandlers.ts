/**
 * Handler functions for ideas page operations
 */

import { DbIdea } from '@/app/db';

/**
 * Fetch all ideas from the API
 */
export async function fetchIdeas(): Promise<DbIdea[]> {
  try {
    const response = await fetch('/api/ideas');
    if (response.ok) {
      const data = await response.json();
      return data.ideas || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching ideas:', error);
    return [];
  }
}

/**
 * Update an idea's properties
 */
export async function updateIdea(ideaId: string, updates: Partial<DbIdea>): Promise<DbIdea | null> {
  try {
    const response = await fetch('/api/ideas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ideaId,
        ...updates
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.idea;
    }
    return null;
  } catch (error) {
    console.error('Error updating idea:', error);
    return null;
  }
}

/**
 * Delete a specific idea
 */
export async function deleteIdea(ideaId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/ideas?id=${encodeURIComponent(ideaId)}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting idea:', error);
    return false;
  }
}

/**
 * Delete all ideas
 */
export async function deleteAllIdeas(): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const response = await fetch('/api/ideas?all=true', {
      method: 'DELETE',
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, deletedCount: data.deletedCount };
    }
    return { success: false, deletedCount: 0 };
  } catch (error) {
    console.error('Error deleting all ideas:', error);
    return { success: false, deletedCount: 0 };
  }
}
