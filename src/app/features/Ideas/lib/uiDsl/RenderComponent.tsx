/**
 * RenderComponent Engine
 * Interprets component descriptors and generates React components with Tailwind classes
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ComponentDescriptor,
  RenderContext,
  ContentDescriptor,
  BadgeDescriptor,
} from './types';
import { buildVariantClasses, getBadgeConfig, getVariant } from './theme';
import { getCategoryConfig, EffortIcon, ImpactIcon } from '../ideaConfig';

/**
 * Main render engine
 */
export function RenderComponent({
  descriptor,
  context,
  index = 0,
}: {
  descriptor: ComponentDescriptor;
  context: RenderContext;
  index?: number;
}) {
  const { data, theme, handlers, processingState } = context;

  // Determine variant based on processing state and data status
  let variantName = descriptor.variant || 'pending';
  if (processingState?.isProcessing && processingState?.processingId === data.id) {
    variantName = 'processing';
  } else if (data.status) {
    variantName = data.status;
  }

  const variant = getVariant(theme, variantName);
  const variantClasses = buildVariantClasses(variant);

  // Build base classes
  const baseClasses = [
    'relative group cursor-pointer',
    variantClasses,
    'border rounded-xl backdrop-blur-sm transition-all duration-300',
    descriptor.className,
  ]
    .filter(Boolean)
    .join(' ');

  // Merge animations
  const animation = {
    ...theme.animations.cardEntrance,
    ...descriptor.animation,
  };

  // Add delay based on index for staggered entrance
  if (animation.transition) {
    animation.transition = {
      ...animation.transition,
      delay: index * 0.05,
    };
  }

  // Build hover animation
  const hoverAnimation = descriptor.animation?.whileHover || theme.animations.cardHover.whileHover;

  return (
    <motion.div
      className={baseClasses}
      initial={animation.initial}
      animate={animation.animate}
      transition={animation.transition}
      whileHover={hoverAnimation}
      onClick={handlers?.onClick}
    >
      {/* Decorations */}
      {descriptor.decorations?.cornerFold && (
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-gray-800/40 to-transparent transform translate-x-4 -translate-y-4 rotate-45" />
      )}

      {/* Render layout regions */}
      {Object.entries(descriptor.layout).map(([region, content]) =>
        content ? (
          <div key={region} className={getRegionClassName(region as any)}>
            {renderContent(content, data, theme, index)}
          </div>
        ) : null
      )}

      {/* Hover gradient overlay */}
      {descriptor.decorations?.hoverGradient && (
        <motion.div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-300 pointer-events-none rounded-xl" />
      )}

      {/* Processing animation overlay */}
      {processingState?.isProcessing && processingState?.processingId === data.id && (
        <motion.div
          className="absolute inset-0 border-2 border-yellow-500/50 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 10px rgba(234, 179, 8, 0.3)',
              '0 0 20px rgba(234, 179, 8, 0.6)',
              '0 0 10px rgba(234, 179, 8, 0.3)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
}

/**
 * Get CSS classes for a layout region
 */
function getRegionClassName(region: string): string {
  const regionClasses: Record<string, string> = {
    topLeft: 'absolute top-2 left-2',
    topRight: 'absolute top-2 right-2',
    bottomLeft: 'absolute bottom-2 left-2',
    bottomRight: 'absolute bottom-2 right-2',
    header: 'mb-3',
    content: 'mb-3',
    footer: 'mt-auto',
    center: '',
  };

  return regionClasses[region] || '';
}

/**
 * Render content based on content descriptor
 */
function renderContent(
  content: ContentDescriptor,
  data: any,
  theme: any,
  index: number
): React.ReactNode {
  const className = content.className || '';

  switch (content.type) {
    case 'text': {
      const value = content.value || data[content.value as string] || '';
      const formatted = typeof content.format === 'function' ? content.format(value) : value;

      if (content.animation) {
        return (
          <motion.div
            className={className}
            initial={content.animation.initial}
            animate={content.animation.animate}
            transition={{
              ...content.animation.transition,
              delay: (content.animation.transition?.delay || 0) + index * 0.05,
            }}
          >
            {formatted}
          </motion.div>
        );
      }

      return <div className={className}>{formatted}</div>;
    }

    case 'emoji': {
      const emoji = content.value || data[content.value as string] || '';

      if (content.animation) {
        return (
          <motion.div
            className={className}
            initial={content.animation.initial}
            animate={content.animation.animate}
            transition={{
              ...content.animation.transition,
              delay: (content.animation.transition?.delay || 0) + index * 0.05,
            }}
          >
            {emoji}
          </motion.div>
        );
      }

      return <div className={className}>{emoji}</div>;
    }

    case 'date': {
      const dateValue = content.value
        ? data[content.value as string]
        : data.created_at || data.date;
      const formatted = formatDate(dateValue);
      return <div className={className}>{formatted}</div>;
    }

    case 'badge': {
      const badge = content.badges?.[0];
      if (!badge) return null;
      return <Badge badge={badge} data={data} theme={theme} className={className} />;
    }

    case 'badges': {
      if (!content.badges || content.badges.length === 0) return null;
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          {content.badges.map((badge, idx) => (
            <Badge key={idx} badge={badge} data={data} theme={theme} />
          ))}
        </div>
      );
    }

    case 'icon': {
      const IconComponent = content.value as React.ComponentType<any>;
      if (!IconComponent) return null;
      return <IconComponent className={className} />;
    }

    case 'container': {
      return (
        <div className={className}>
          {content.children?.map((child, idx) => (
            <React.Fragment key={idx}>
              {renderContent(child, data, theme, index)}
            </React.Fragment>
          ))}
        </div>
      );
    }

    case 'custom': {
      // Handle special custom content types
      if (content.value === 'footerContent') {
        return (
          <div className="flex items-center justify-between mt-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
              {data.scan_type?.replace('_', ' ')}
            </span>
            {data.user_pattern === 1 && (
              <div className="ml-2 px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded text-sm text-blue-300 font-semibold">
                ⭐
              </div>
            )}
          </div>
        );
      }

      return typeof content.value === 'function' ? content.value(data) : content.value;
    }

    default:
      return null;
  }
}

/**
 * Render a badge component
 */
function Badge({
  badge,
  data,
  theme,
  className = '',
}: {
  badge: BadgeDescriptor;
  data: any;
  theme: any;
  className?: string;
}) {
  let label = badge.label || '';
  let colorClass = '';
  let iconComponent = badge.icon;

  // Get configuration based on badge type
  if (badge.type === 'effort' && data.effort) {
    const config = getBadgeConfig(theme, 'effort', data.effort);
    if (config && 'label' in config) {
      label = config.label;
      colorClass = config.color;
      iconComponent = EffortIcon;
    }
  } else if (badge.type === 'impact' && data.impact) {
    const config = getBadgeConfig(theme, 'impact', data.impact);
    if (config && 'label' in config) {
      label = config.label;
      colorClass = config.color;
      iconComponent = ImpactIcon;
    }
  } else if (badge.type === 'category' && data.category) {
    const config = getCategoryConfig(data.category);
    return <span className={`text-2xl ${className}`}>{config.emoji}</span>;
  } else if (badge.type === 'status' && data.status) {
    const config = getBadgeConfig(theme, 'status', data.status);
    if (config && 'label' in config) {
      label = config.label;
      colorClass = config.color;
    }
  }

  // Build badge style classes
  const badgeClasses = [
    'flex items-center gap-1',
    badge.style === 'minimal'
      ? ''
      : 'px-2 py-0.5 bg-gray-800/40 rounded-md border border-gray-700/40',
    badge.className,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const IconComp = iconComponent as React.ComponentType<any>;

  return (
    <div className={badgeClasses} title={badge.label}>
      {IconComp && <IconComp className={`w-3 h-3 ${colorClass}`} />}
      {badge.emoji && <span>{badge.emoji}</span>}
      {label && <span className={`text-[10px] font-semibold ${colorClass}`}>{label}</span>}
    </div>
  );
}

/**
 * Format date helper
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
