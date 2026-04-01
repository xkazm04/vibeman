import { Context, ContextGroup } from '@/stores/contextStore';

/**
 * Shallow-compare two Context arrays by length, id, groupId, and updatedAt.
 * Returns true if arrays are equal (no re-render needed).
 */
export function areContextArraysEqual(prev: Context[], next: Context[]): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].id !== next[i].id || prev[i].groupId !== next[i].groupId || prev[i].updatedAt !== next[i].updatedAt) return false;
  }
  return true;
}

/**
 * Shallow-compare two ContextGroup arrays by length and id.
 * Returns true if arrays are equal (no re-render needed).
 */
export function areGroupArraysEqual(prev: ContextGroup[], next: ContextGroup[]): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].id !== next[i].id) return false;
  }
  return true;
}
