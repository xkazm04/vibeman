'use client';

import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';

interface ScrollShadowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  children: React.ReactNode;
  /** Fade zone size in pixels (default: 8) */
  fadeSize?: number;
  /** Show inset box-shadow when scrolled from top (default: true) */
  insetShadow?: boolean;
  /** Axis: 'y' (default) or 'x' */
  axis?: 'y' | 'x';
}

/**
 * Wraps scrollable content with dynamic gradient-mask shadows that appear
 * only when more content exists beyond the visible edges.
 */
const ScrollShadow = forwardRef<HTMLDivElement, ScrollShadowProps>(function ScrollShadow(
  { children, className = '', fadeSize = 8, insetShadow = true, axis = 'y', ...rest },
  forwardedRef,
) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = (forwardedRef as React.RefObject<HTMLDivElement>) ?? internalRef;

  const [scrolledStart, setScrolledStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const measure = useCallback(() => {
    const el = typeof ref === 'object' && ref?.current ? ref.current : null;
    if (!el) return;
    if (axis === 'y') {
      setScrolledStart(el.scrollTop > 0);
      setCanScrollEnd(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    } else {
      setScrolledStart(el.scrollLeft > 0);
      setCanScrollEnd(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }
  }, [ref, axis]);

  useEffect(() => {
    measure();
  }, [measure, children]);

  // Re-measure on resize
  useEffect(() => {
    const el = typeof ref === 'object' && ref?.current ? ref.current : null;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, measure]);

  const direction = axis === 'y' ? 'to bottom' : 'to right';
  const startFade = scrolledStart ? 'transparent' : 'black';
  const endFade = canScrollEnd ? 'transparent' : 'black';
  const gradient = `linear-gradient(${direction}, ${startFade}, black ${fadeSize}px, black calc(100% - ${fadeSize}px), ${endFade})`;

  const shadowClass =
    insetShadow && scrolledStart
      ? axis === 'y'
        ? 'shadow-[inset_0_8px_6px_-6px_rgba(0,0,0,0.3)]'
        : 'shadow-[inset_8px_0_6px_-6px_rgba(0,0,0,0.3)]'
      : '';

  return (
    <div
      {...rest}
      ref={ref}
      onScroll={measure}
      className={`${className} transition-shadow duration-200 ${shadowClass}`}
      style={{
        maskImage: gradient,
        WebkitMaskImage: gradient,
      }}
    >
      {children}
    </div>
  );
});

export default ScrollShadow;
