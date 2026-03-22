/**
 * HealingIcons — Branded 16x16 SVG icons for self-healing error types.
 *
 * Unified visual language:
 *   - Semi-transparent geometric substrate (background frame)
 *   - Bold error-specific symbol at center
 *   - Circuit-trace accents with dot terminals at edges
 *
 * Follows the same circuit-neural motif established by StageIcons.tsx
 * but scaled to 16x16 for inline error-type display.
 */

interface IconProps {
  className?: string;
}

/**
 * Prompt Ambiguity — amber
 * Single signal hub diverging into three uncertain paths.
 * Communicates: the AI received an unclear or multi-interpretation prompt.
 */
export function PromptAmbiguityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" opacity="0.12" />
      {/* Origin hub */}
      <circle cx="4" cy="8" r="1.3" fill="currentColor" stroke="none" opacity="0.55" />
      {/* Three diverging paths */}
      <path d="M5.3 8H7" />
      <path d="M7 8l4-3.5" />
      <path d="M7 8h4.5" />
      <path d="M7 8l4 3.5" />
      {/* Endpoint terminals */}
      <circle cx="11" cy="4.5" r="0.6" fill="currentColor" stroke="none" opacity="0.45" />
      <circle cx="11.5" cy="8" r="0.6" fill="currentColor" stroke="none" opacity="0.45" />
      <circle cx="11" cy="11.5" r="0.6" fill="currentColor" stroke="none" opacity="0.45" />
      {/* Circuit traces */}
      <path d="M0.5 4h1" strokeWidth="0.8" opacity="0.35" />
      <circle cx="0.5" cy="4" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M15 12.5h-1" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15" cy="12.5" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/**
 * Missing Context — orange
 * Document frame with data rows and a void gap marked by dashed absence.
 * Communicates: required context or data was not provided to the AI.
 */
export function MissingContextIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="1" width="10" height="14" rx="1.5" opacity="0.12" />
      {/* Data rows */}
      <path d="M5.5 4h5" opacity="0.5" />
      <path d="M5.5 6.5h3" opacity="0.5" />
      {/* Void gap — dashed missing section */}
      <path d="M5.5 9h5" strokeDasharray="1.5 1" opacity="0.25" />
      {/* Absence X marker */}
      <path d="M9.5 10.5l2 2" strokeWidth="1.4" />
      <path d="M11.5 10.5l-2 2" strokeWidth="1.4" />
      {/* Circuit traces */}
      <path d="M0.5 5h2" strokeWidth="0.8" opacity="0.35" />
      <circle cx="0.5" cy="5" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M14 11h1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15.5" cy="11" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/**
 * Rate Limit — yellow
 * Gauge arc with needle pegged past the redline mark.
 * Communicates: API calls exceeded allowed frequency.
 */
export function RateLimitIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8" cy="9" r="6" opacity="0.12" />
      {/* Gauge arc */}
      <path d="M3.5 12.5a6 6 0 0 1 9 0" fill="none" opacity="0.3" />
      <path d="M3 11.5A5.5 5.5 0 0 1 13 11.5" />
      {/* Redline tick */}
      <path d="M12 5.5l1-1" strokeWidth="1.5" opacity="0.5" />
      {/* Needle pegged past max */}
      <path d="M8 9l3.5-3.5" strokeWidth="1.5" />
      <circle cx="8" cy="9" r="1" fill="currentColor" stroke="none" opacity="0.55" />
      {/* Circuit traces */}
      <path d="M0.5 7h1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="0.5" cy="7" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M15.5 13h-1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15.5" cy="13" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/**
 * Tool Failure — red
 * Wrench silhouette fractured by a lightning crack.
 * Communicates: an external tool or integration broke during execution.
 */
export function ToolFailureIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Wrench silhouette */}
      <path d="M10 2L6 6l1.5 1.5-5 5 1 1 5-5L10 10l4-4" opacity="0.25" />
      <path d="M12 6l2-2" />
      <circle cx="13.2" cy="3.2" r="1" fill="currentColor" stroke="none" opacity="0.35" />
      {/* Lightning crack through center */}
      <path d="M9 4l-1 2.5h2L8.5 10" strokeWidth="1.4" />
      <circle cx="8.5" cy="10" r="0.5" fill="currentColor" stroke="none" opacity="0.5" />
      {/* Circuit traces */}
      <path d="M1 3h1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="1" cy="3" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M15 13h-1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15" cy="13" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/**
 * Timeout — purple
 * Hourglass frame with sand depleted and overflow indicator.
 * Communicates: the operation ran out of allocated time.
 */
export function TimeoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="1.5" width="12" height="13" rx="2" opacity="0.12" />
      {/* Hourglass top bar */}
      <path d="M4.5 2.5h7" strokeWidth="1.3" />
      {/* Upper chamber */}
      <path d="M5 2.5l3 4 3-4" opacity="0.3" />
      {/* Neck */}
      <circle cx="8" cy="7.5" r="0.5" fill="currentColor" stroke="none" opacity="0.5" />
      {/* Lower chamber — filled */}
      <path d="M5 13l3-4 3 4z" fill="currentColor" stroke="none" opacity="0.18" />
      <path d="M5 13l3-4 3 4" />
      {/* Bottom bar */}
      <path d="M4.5 13h7" strokeWidth="1.3" />
      {/* Overflow alert spark */}
      <path d="M12.5 3l1-1.5" strokeWidth="1" opacity="0.5" />
      <path d="M13 4.5l1.5-0.5" strokeWidth="1" opacity="0.5" />
      {/* Circuit traces */}
      <path d="M0.5 5h1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="0.5" cy="5" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M15.5 11h-1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15.5" cy="11" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/**
 * Permission Error — red
 * Shield frame with a locked keyhole at center.
 * Communicates: access was denied due to insufficient permissions.
 */
export function PermissionErrorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Shield outline */}
      <path d="M8 1.5L2.5 4v4.5C2.5 12 8 14.5 8 14.5s5.5-2.5 5.5-6V4z" opacity="0.12" />
      <path d="M8 2L3 4.2v4.3C3 11.7 8 14 8 14s5-2.3 5-5.5V4.2z" />
      {/* Lock body */}
      <rect x="6" y="7.5" width="4" height="3.5" rx="0.8" fill="currentColor" stroke="none" opacity="0.25" />
      {/* Lock shackle */}
      <path d="M6.8 7.5V6a1.2 1.2 0 0 1 2.4 0v1.5" strokeWidth="1.3" />
      {/* Keyhole */}
      <circle cx="8" cy="9" r="0.6" fill="currentColor" stroke="none" opacity="0.6" />
      {/* Circuit traces */}
      <path d="M0.5 7h1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="0.5" cy="7" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M15.5 7h-1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15.5" cy="7" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/**
 * Dependency Missing — amber
 * Two nodes with a broken/dashed link between them.
 * Communicates: a required package, service, or module is absent.
 */
export function DependencyMissingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" opacity="0.12" />
      {/* Left node — present dependency */}
      <rect x="2.5" y="5.5" width="4" height="5" rx="1" />
      <path d="M3.5 7.5h2" opacity="0.5" />
      <path d="M3.5 9h1" opacity="0.5" />
      {/* Right node — missing dependency */}
      <rect x="9.5" y="5.5" width="4" height="5" rx="1" strokeDasharray="1.5 1" opacity="0.35" />
      {/* Broken link between nodes */}
      <path d="M6.5 8h1" />
      <path d="M8.5 8h1" />
      <circle cx="8" cy="8" r="0.4" fill="currentColor" stroke="none" opacity="0.5" />
      {/* Circuit traces */}
      <path d="M0.5 3h1" strokeWidth="0.8" opacity="0.35" />
      <circle cx="0.5" cy="3" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M15.5 13h-1" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15.5" cy="13" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/**
 * Invalid Output — pink
 * Clean signal waveform corrupted into glitch noise.
 * Communicates: the AI produced output that failed validation.
 */
export function InvalidOutputIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 8h14" opacity="0.08" />
      {/* Clean signal on left */}
      <path d="M1.5 8l1.5-2.5L4.5 11 6 8" opacity="0.5" />
      {/* Corruption boundary */}
      <path d="M6 8v-3M6 8v3" strokeWidth="0.6" strokeDasharray="0.8 0.8" opacity="0.3" />
      {/* Glitched signal on right */}
      <path d="M6 8l1-4 .5 3 1-5 .8 6 .7-4 1 5L12 5l1.5 3h1" strokeWidth="1.3" />
      {/* Error spark */}
      <path d="M10 3l.5-1" strokeWidth="1" opacity="0.5" />
      <circle cx="10.5" cy="2" r="0.4" fill="currentColor" stroke="none" opacity="0.5" />
      {/* Circuit traces */}
      <path d="M0.5 12h1" strokeWidth="0.8" opacity="0.35" />
      <circle cx="0.5" cy="12" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M15.5 4h-1" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15.5" cy="4" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/**
 * Unknown Error — gray
 * Hexagonal void with static noise pattern and "?" overlay.
 * Communicates: an unclassified or novel error type.
 */
export function UnknownErrorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Hexagonal frame — unfamiliar shape for unknown */}
      <path d="M8 1.5l5.5 3.2v6.6L8 14.5l-5.5-3.2V4.7z" opacity="0.12" />
      <path d="M8 2.5l4.5 2.6v5.3L8 13l-4.5-2.6V5.1z" />
      {/* Static/noise marks inside */}
      <path d="M6 5.5h.5M9 6h.5M7 10.5h.5M10 9.5h.5" strokeWidth="0.8" opacity="0.25" />
      {/* Question mark — unknown */}
      <path d="M6.5 6a1.5 1.5 0 0 1 2.7.8c0 .7-.7.9-1.2 1.2" strokeWidth="1.2" />
      <circle cx="8" cy="10" r="0.5" fill="currentColor" stroke="none" />
      {/* Circuit traces */}
      <path d="M0.5 6h1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="0.5" cy="6" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M15.5 10h-1.5" strokeWidth="0.8" opacity="0.35" />
      <circle cx="15.5" cy="10" r="0.4" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export type ErrorIconComponent = ({ className }: { className?: string }) => React.JSX.Element;
