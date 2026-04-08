import { Code, Database, Layers, Grid, Activity, Cpu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Returns an appropriate icon for a group based on its name.
 */
export function getGroupIcon(groupName: string): LucideIcon {
  const name = groupName.toLowerCase();
  if (name.includes('api') || name.includes('backend')) return Database;
  if (name.includes('ui') || name.includes('component')) return Layers;
  if (name.includes('util') || name.includes('helper')) return Grid;
  if (name.includes('test') || name.includes('spec')) return Activity;
  if (name.includes('config') || name.includes('setting')) return Cpu;
  return Code;
}
