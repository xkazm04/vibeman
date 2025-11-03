/**
 * Component Descriptors
 * JSON-based descriptions for Ideas UI components
 */

import { ComponentDescriptor } from './types';

/**
 * Common animation configurations
 */
const commonAnimations = {
  badgeEntry: {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    transition: { duration: 0.5, delay: 0.2 },
  },
  listItemFade: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    whileHover: { x: 2 },
  },
};

/**
 * Sticky note card descriptor
 */
export const stickyNoteDescriptor: ComponentDescriptor = {
  type: 'card',
  variant: 'stickyNote',
  className: 'p-4 hover:scale-105',

  layout: {
    topRight: {
      type: 'badge',
      badges: [{ type: 'category', style: 'minimal' }],
      className: 'text-2xl',
      animation: commonAnimations.badgeEntry,
    },

    header: {
      type: 'date',
      value: 'created_at',
      className: 'text-sm text-gray-500 font-mono',
    },

    content: {
      type: 'text',
      value: 'title',
      className: 'text-base font-semibold text-white pr-8 leading-snug line-clamp-3 group-hover:text-blue-300 transition-colors',
    },

    center: {
      type: 'badges',
      badges: [
        { type: 'effort', style: 'default' },
        { type: 'impact', style: 'default' },
      ],
      className: 'mb-2',
    },

    footer: {
      type: 'custom',
      value: 'footerContent',
    },
  },

  decorations: {
    cornerFold: true,
    hoverGradient: true,
  },

  interactive: {
    onClick: true,
    onHover: true,
  },
};

/**
 * Buffer list item descriptor
 */
export const bufferItemDescriptor: ComponentDescriptor = {
  type: 'list-item',
  className: 'flex items-center gap-2 px-2 py-1.5 rounded-md border',

  layout: {
    content: {
      type: 'container',
      className: 'flex items-center gap-2 w-full',
      children: [
        {
          type: 'badges',
          badges: [
            { type: 'category', style: 'minimal' },
            { type: 'impact', style: 'minimal' },
            { type: 'effort', style: 'minimal' },
          ],
          className: 'flex items-center gap-1 flex-shrink-0',
        },
        {
          type: 'text',
          value: 'title',
          className: 'flex-1 min-w-0 text-xs text-gray-200 truncate font-medium',
        },
      ],
    },
  },

  animation: commonAnimations.listItemFade,

  interactive: {
    onClick: true,
    onHover: true,
    contextMenu: true,
  },
};

/**
 * Helper to get descriptor for a component type
 */
export function getDescriptor(type: 'stickyNote' | 'bufferItem'): ComponentDescriptor {
  switch (type) {
    case 'stickyNote':
      return stickyNoteDescriptor;
    case 'bufferItem':
      return bufferItemDescriptor;
    default:
      return stickyNoteDescriptor;
  }
}

/**
 * Helper to customize a descriptor
 */
export function customizeDescriptor(
  base: ComponentDescriptor,
  overrides: Partial<ComponentDescriptor>
): ComponentDescriptor {
  return {
    ...base,
    ...overrides,
    layout: {
      ...base.layout,
      ...overrides.layout,
    },
    decorations: {
      ...base.decorations,
      ...overrides.decorations,
    },
    interactive: {
      ...base.interactive,
      ...overrides.interactive,
    },
  };
}
