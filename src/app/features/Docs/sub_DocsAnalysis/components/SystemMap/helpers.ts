/**
 * Helper functions for SystemMap
 */

import { Code } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';
import { ModuleLayer, SystemModule, LAYER_CONFIG, LayerConfig } from './types';

/**
 * Get Lucide icon component by name
 */
export function getLucideIcon(iconName: string | null | undefined): React.ElementType {
  if (!iconName) return Code;

  // Convert icon name to PascalCase for Lucide icons
  const pascalCase = iconName
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[pascalCase];
  return IconComponent || Code;
}

/**
 * Convert context groups to system modules
 */
export function contextGroupsToModules(
  groups: ContextGroup[],
  relationships: ContextGroupRelationship[]
): SystemModule[] {
  // Build a map of connections from relationships
  const connectionMap = new Map<string, string[]>();

  relationships.forEach(rel => {
    // Add bidirectional connections
    if (!connectionMap.has(rel.sourceGroupId)) {
      connectionMap.set(rel.sourceGroupId, []);
    }
    if (!connectionMap.has(rel.targetGroupId)) {
      connectionMap.set(rel.targetGroupId, []);
    }
    connectionMap.get(rel.sourceGroupId)!.push(rel.targetGroupId);
    connectionMap.get(rel.targetGroupId)!.push(rel.sourceGroupId);
  });

  return groups.map(group => {
    // Determine the layer type, default to 'client' if not set
    const layer: ModuleLayer = group.type || 'client';

    return {
      id: group.id,
      name: group.name,
      description: `Context group: ${group.name}`,
      layer,
      icon: group.icon || 'code',
      color: group.color,
      connections: connectionMap.get(group.id) || [],
    };
  });
}

/**
 * Group modules by layer
 */
export function groupModulesByLayer(modules: SystemModule[]) {
  const groups: Record<ModuleLayer, SystemModule[]> = {
    pages: [],
    client: [],
    server: [],
    external: [],
  };

  modules.forEach(m => {
    if (groups[m.layer]) {
      groups[m.layer].push(m);
    }
  });

  return groups;
}

/**
 * Calculate x positions for modules in a row - centered and spreading outward
 */
export function calculateRowPositions(
  modules: SystemModule[],
  layerConfig: LayerConfig
): (SystemModule & { calculatedPosition: { x: number; y: number } })[] {
  const count = modules.length;
  if (count === 0) return [];

  const centerX = 55; // Center point (offset slightly for labels)

  if (count === 1) {
    // Single node centered
    return [
      {
        ...modules[0],
        calculatedPosition: { x: centerX, y: layerConfig.rowY },
      },
    ];
  }

  // Calculate spacing - more nodes = tighter spacing
  const maxSpread = 60; // Maximum spread from center to edge
  const nodeSpacing = Math.min(18, maxSpread / (count - 1)); // Max 18% between nodes
  const totalWidth = nodeSpacing * (count - 1);
  const startX = centerX - totalWidth / 2;

  return modules.map((module, index) => ({
    ...module,
    calculatedPosition: {
      x: startX + nodeSpacing * index,
      y: layerConfig.rowY,
    },
  }));
}

/**
 * Calculate all positioned modules for the system map
 */
export function calculateAllPositions(systemModules: SystemModule[]) {
  const groupsByLayer = groupModulesByLayer(systemModules);
  const positioned: { module: SystemModule; position: { x: number; y: number } }[] = [];

  (Object.keys(LAYER_CONFIG) as ModuleLayer[]).forEach(layer => {
    const layerModules = groupsByLayer[layer];
    const withPositions = calculateRowPositions(layerModules, LAYER_CONFIG[layer]);
    withPositions.forEach(m => {
      positioned.push({ module: m, position: m.calculatedPosition });
    });
  });

  return { modulesByLayer: groupsByLayer, positionedModules: positioned };
}
