'use client';

import { motion } from 'framer-motion';
import { ExternalLink, FolderTree, Target, Lightbulb, Play, FileCode, Scan } from 'lucide-react';
import { useUnifiedNavigation, type NavigableEntity } from '@/hooks/useUnifiedNavigation';

// Entity type icons
const ENTITY_ICONS: Record<NavigableEntity['type'], React.ElementType> = {
  context: FolderTree,
  goal: Target,
  idea: Lightbulb,
  task: Play,
  requirement: FileCode,
  scan: Scan,
};

// Entity type colors
const ENTITY_COLORS: Record<NavigableEntity['type'], string> = {
  context: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20',
  goal: 'text-purple-400 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20',
  idea: 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
  task: 'text-green-400 bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
  requirement: 'text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
  scan: 'text-pink-400 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20',
};

interface EntityLinkProps {
  entity: NavigableEntity;
  variant?: 'default' | 'chip' | 'inline' | 'card';
  showIcon?: boolean;
  showType?: boolean;
  className?: string;
}

/**
 * EntityLink component for cross-feature navigation
 *
 * Renders a clickable link to any navigable entity (context, goal, idea, task, etc.)
 * with consistent styling and workflow tracking.
 */
export default function EntityLink({
  entity,
  variant = 'default',
  showIcon = true,
  showType = false,
  className = '',
}: EntityLinkProps) {
  const { navigateToEntity } = useUnifiedNavigation();

  const Icon = ENTITY_ICONS[entity.type];
  const colorClasses = ENTITY_COLORS[entity.type];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToEntity(entity);
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1 text-inherit hover:underline underline-offset-2 ${className}`}
        data-testid={`entity-link-${entity.type}-${entity.id}`}
      >
        {showIcon && <Icon className="w-3 h-3 inline" />}
        <span>{entity.name}</span>
        <ExternalLink className="w-2.5 h-2.5 opacity-50" />
      </button>
    );
  }

  if (variant === 'chip') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border transition-colors ${colorClasses} ${className}`}
        data-testid={`entity-link-${entity.type}-${entity.id}`}
      >
        {showIcon && <Icon className="w-3 h-3" />}
        <span className="truncate max-w-[120px]">{entity.name}</span>
      </motion.button>
    );
  }

  if (variant === 'card') {
    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleClick}
        className={`w-full flex items-center gap-3 p-3 text-left rounded-lg border transition-colors ${colorClasses} ${className}`}
        data-testid={`entity-link-${entity.type}-${entity.id}`}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{entity.name}</div>
          {showType && (
            <div className="text-xs opacity-70 capitalize">{entity.type}</div>
          )}
        </div>
        <ExternalLink className="w-4 h-4 opacity-50" />
      </motion.button>
    );
  }

  // Default variant
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${colorClasses} ${className}`}
      data-testid={`entity-link-${entity.type}-${entity.id}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span className="truncate max-w-[150px]">{entity.name}</span>
      {showType && (
        <span className="text-[10px] opacity-60 capitalize">({entity.type})</span>
      )}
    </motion.button>
  );
}

// Helper to create entity links for common types
export function ContextLink({ id, name, projectId, ...props }: { id: string; name: string; projectId?: string } & Omit<EntityLinkProps, 'entity'>) {
  return <EntityLink entity={{ type: 'context', id, name, projectId }} {...props} />;
}

export function GoalLink({ id, name, projectId, ...props }: { id: string; name: string; projectId?: string } & Omit<EntityLinkProps, 'entity'>) {
  return <EntityLink entity={{ type: 'goal', id, name, projectId }} {...props} />;
}

export function IdeaLink({ id, name, projectId, ...props }: { id: string; name: string; projectId?: string } & Omit<EntityLinkProps, 'entity'>) {
  return <EntityLink entity={{ type: 'idea', id, name, projectId }} {...props} />;
}

export function TaskLink({ id, name, projectId, ...props }: { id: string; name: string; projectId?: string } & Omit<EntityLinkProps, 'entity'>) {
  return <EntityLink entity={{ type: 'task', id, name, projectId }} {...props} />;
}

export function RequirementLink({ id, name, projectId, ...props }: { id: string; name: string; projectId?: string } & Omit<EntityLinkProps, 'entity'>) {
  return <EntityLink entity={{ type: 'requirement', id, name, projectId }} {...props} />;
}

// Entity list component for showing multiple related entities
interface EntityListProps {
  entities: NavigableEntity[];
  title?: string;
  variant?: EntityLinkProps['variant'];
  maxVisible?: number;
  className?: string;
}

export function EntityList({
  entities,
  title,
  variant = 'chip',
  maxVisible = 5,
  className = '',
}: EntityListProps) {
  const visibleEntities = entities.slice(0, maxVisible);
  const remainingCount = entities.length - maxVisible;

  if (entities.length === 0) return null;

  return (
    <div className={className}>
      {title && (
        <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
          {title}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {visibleEntities.map((entity) => (
          <EntityLink key={`${entity.type}-${entity.id}`} entity={entity} variant={variant} />
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500 bg-gray-800/50 rounded-full">
            +{remainingCount} more
          </span>
        )}
      </div>
    </div>
  );
}
