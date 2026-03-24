/**
 * Custom domain SVG icons for the Knowledge Base.
 * Geometric, thin-stroke (1.5px), grid-aligned — technical blueprint aesthetic.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

const defaults: SVGProps<SVGSVGElement> = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** UI — wireframe layout grid with header, sidebar, and content panels */
export function IconUI({ className, ...props }: IconProps) {
  return (
    <svg {...defaults} className={className} {...props}>
      {/* Outer frame */}
      <rect x="3" y="3" width="18" height="18" rx="2" />
      {/* Top bar */}
      <line x1="3" y1="7" x2="21" y2="7" />
      {/* Sidebar divider */}
      <line x1="9" y1="7" x2="9" y2="21" />
      {/* Content panel divider */}
      <line x1="9" y1="14" x2="21" y2="14" />
      {/* Header dots (window controls) */}
      <circle cx="5.5" cy="5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** API — interlocking data packets with directional arrows */
export function IconAPI({ className, ...props }: IconProps) {
  return (
    <svg {...defaults} className={className} {...props}>
      {/* Left packet */}
      <rect x="2" y="6" width="8" height="5" rx="1" />
      {/* Right packet */}
      <rect x="14" y="13" width="8" height="5" rx="1" />
      {/* Arrow right: left packet → right packet */}
      <path d="M10 8.5h6" />
      <polyline points="14 6.5 16 8.5 14 10.5" />
      {/* Arrow left: right packet → left packet */}
      <path d="M14 15.5H8" />
      <polyline points="10 13.5 8 15.5 10 17.5" />
      {/* Data lines in left packet */}
      <line x1="4" y1="8" x2="8" y2="8" strokeWidth="1" opacity="0.5" />
      <line x1="4" y1="9.5" x2="7" y2="9.5" strokeWidth="1" opacity="0.5" />
      {/* Data lines in right packet */}
      <line x1="16" y1="15" x2="20" y2="15" strokeWidth="1" opacity="0.5" />
      <line x1="16" y1="16.5" x2="19" y2="16.5" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** Database — stacked cylindrical registers with binary dots */
export function IconDatabase({ className, ...props }: IconProps) {
  return (
    <svg {...defaults} className={className} {...props}>
      {/* Top ellipse */}
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      {/* Cylinder body */}
      <path d="M5 5.5v13c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-13" />
      {/* Middle ring */}
      <path d="M5 12c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5" />
      {/* Binary dots — top register */}
      <circle cx="9" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8.5" r="0.6" fill="currentColor" stroke="none" opacity="0.35" />
      <circle cx="15" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
      {/* Binary dots — bottom register */}
      <circle cx="9" cy="16" r="0.6" fill="currentColor" stroke="none" opacity="0.35" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="0.6" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/** Testing — flask with checkmark circuitry */
export function IconTesting({ className, ...props }: IconProps) {
  return (
    <svg {...defaults} className={className} {...props}>
      {/* Flask neck */}
      <line x1="9" y1="2" x2="9" y2="8" />
      <line x1="15" y1="2" x2="15" y2="8" />
      {/* Flask top rim */}
      <line x1="7" y1="2" x2="11" y2="2" />
      <line x1="13" y1="2" x2="17" y2="2" />
      {/* Flask body — tapered from neck to wide base */}
      <path d="M9 8l-4.5 9a2 2 0 002 3h11a2 2 0 002-3L15 8" />
      {/* Liquid level */}
      <path d="M6.5 14.5h11" strokeWidth="1" opacity="0.3" />
      {/* Checkmark inside flask */}
      <polyline points="9 16 11 18 15 13" strokeWidth="1.8" />
      {/* Circuit dots on flask body */}
      <circle cx="7.5" cy="16.5" r="0.5" fill="currentColor" stroke="none" opacity="0.4" />
      <circle cx="16.5" cy="16.5" r="0.5" fill="currentColor" stroke="none" opacity="0.4" />
    </svg>
  );
}

/** Performance — gauge with digital segmented display arc */
export function IconPerformance({ className, ...props }: IconProps) {
  return (
    <svg {...defaults} className={className} {...props}>
      {/* Gauge arc (270 degrees, opening at bottom) */}
      <path d="M4.93 17.07A9 9 0 0112 3a9 9 0 017.07 14.07" />
      {/* Base line */}
      <line x1="4" y1="18" x2="20" y2="18" />
      {/* Needle pointing to high performance (roughly 2 o'clock) */}
      <line x1="12" y1="12" x2="16.5" y2="6.5" strokeWidth="2" />
      {/* Center pivot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      {/* Digital segment ticks on arc */}
      <line x1="6.5" y1="6.5" x2="7.2" y2="7.2" strokeWidth="1" opacity="0.4" />
      <line x1="4.5" y1="11" x2="5.5" y2="11" strokeWidth="1" opacity="0.4" />
      <line x1="12" y1="3.5" x2="12" y2="4.5" strokeWidth="1" opacity="0.4" />
      <line x1="17.5" y1="6.5" x2="16.8" y2="7.2" strokeWidth="1" opacity="0.4" />
      <line x1="19.5" y1="11" x2="18.5" y2="11" strokeWidth="1" opacity="0.4" />
      {/* Segment blocks */}
      <rect x="5" y="20" width="3" height="1.5" rx="0.3" fill="currentColor" stroke="none" opacity="0.25" />
      <rect x="10.5" y="20" width="3" height="1.5" rx="0.3" fill="currentColor" stroke="none" opacity="0.25" />
      <rect x="16" y="20" width="3" height="1.5" rx="0.3" fill="currentColor" stroke="none" opacity="0.25" />
    </svg>
  );
}

/** Security — shield with lock-grid pattern */
export function IconSecurity({ className, ...props }: IconProps) {
  return (
    <svg {...defaults} className={className} {...props}>
      {/* Shield outline */}
      <path d="M12 2l8 4v5c0 5.25-3.5 9.5-8 11-4.5-1.5-8-5.75-8-11V6l8-4z" />
      {/* Lock body */}
      <rect x="9.5" y="11" width="5" height="4" rx="0.8" />
      {/* Lock shackle */}
      <path d="M10.5 11V9a1.5 1.5 0 013 0v2" />
      {/* Keyhole */}
      <circle cx="12" cy="13" r="0.7" fill="currentColor" stroke="none" />
      <line x1="12" y1="13.5" x2="12" y2="14.2" strokeWidth="1" />
      {/* Grid pattern on shield */}
      <line x1="8" y1="7" x2="16" y2="7" strokeWidth="0.6" opacity="0.2" />
      <line x1="7" y1="9.5" x2="17" y2="9.5" strokeWidth="0.6" opacity="0.2" />
      <line x1="12" y1="4" x2="12" y2="7" strokeWidth="0.6" opacity="0.2" />
      <line x1="9" y1="4.5" x2="9" y2="9.5" strokeWidth="0.6" opacity="0.15" />
      <line x1="15" y1="4.5" x2="15" y2="9.5" strokeWidth="0.6" opacity="0.15" />
    </svg>
  );
}

/** Architecture — nested architectural brackets */
export function IconArchitecture({ className, ...props }: IconProps) {
  return (
    <svg {...defaults} className={className} {...props}>
      {/* Outer brackets */}
      <path d="M4 4h3v4H4" />
      <path d="M20 4h-3v4h3" />
      <path d="M4 20h3v-4H4" />
      <path d="M20 20h-3v-4h3" />
      {/* Inner frame */}
      <rect x="8" y="8" width="8" height="8" rx="1" />
      {/* Core element */}
      <rect x="10.5" y="10.5" width="3" height="3" rx="0.5" />
      {/* Connection lines from core to brackets */}
      <line x1="7" y1="6" x2="10" y2="9" strokeWidth="1" opacity="0.35" />
      <line x1="17" y1="6" x2="14" y2="9" strokeWidth="1" opacity="0.35" />
      <line x1="7" y1="18" x2="10" y2="15" strokeWidth="1" opacity="0.35" />
      <line x1="17" y1="18" x2="14" y2="15" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

/** State Management — connected node graph */
export function IconStateManagement({ className, ...props }: IconProps) {
  return (
    <svg {...defaults} className={className} {...props}>
      {/* Central node (store) */}
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      {/* Top node */}
      <circle cx="12" cy="3.5" r="2" />
      {/* Bottom-left node */}
      <circle cx="5" cy="18" r="2" />
      {/* Bottom-right node */}
      <circle cx="19" cy="18" r="2" />
      {/* Connections: center to each node */}
      <line x1="12" y1="9" x2="12" y2="5.5" />
      <line x1="9.5" y1="13.8" x2="6.5" y2="16.5" />
      <line x1="14.5" y1="13.8" x2="17.5" y2="16.5" />
      {/* Directional dots on connections */}
      <circle cx="12" cy="7" r="0.5" fill="currentColor" stroke="none" opacity="0.5" />
      <circle cx="7.8" cy="15.3" r="0.5" fill="currentColor" stroke="none" opacity="0.5" />
      <circle cx="16.2" cy="15.3" r="0.5" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
  );
}
