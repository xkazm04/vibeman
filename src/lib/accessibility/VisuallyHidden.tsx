'use client';

import React from 'react';

export interface VisuallyHiddenProps {
  children: React.ReactNode;
  /** When true, content becomes visible (useful for focus states) */
  focusable?: boolean;
  /** HTML element to render */
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Visually hides content while keeping it accessible to screen readers.
 * Uses the standard sr-only technique.
 *
 * @example
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Close menu</VisuallyHidden>
 * </button>
 *
 * @example
 * // Focusable skip link
 * <VisuallyHidden focusable as="a" href="#main">
 *   Skip to main content
 * </VisuallyHidden>
 */
export function VisuallyHidden({
  children,
  focusable = false,
  as: Component = 'span',
}: VisuallyHiddenProps) {
  const ElementType = Component as React.ElementType;

  if (focusable) {
    return (
      <ElementType className="sr-only focus:not-sr-only focus:absolute focus:z-50">
        {children}
      </ElementType>
    );
  }

  return (
    <ElementType className="sr-only">
      {children}
    </ElementType>
  );
}

/**
 * Higher-order component to add visually hidden label to icon-only buttons
 */
export function withAccessibleLabel<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  label: string
) {
  return function AccessibleComponent(props: P) {
    return (
      <>
        <WrappedComponent {...props} />
        <VisuallyHidden>{label}</VisuallyHidden>
      </>
    );
  };
}

export default VisuallyHidden;
