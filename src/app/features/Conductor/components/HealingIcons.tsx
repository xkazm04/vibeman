/**
 * HealingIcons — Empathetic 32x32 SVG icons for self-healing error types.
 *
 * Design language:
 *   - Soft rounded shapes instead of sharp/angular forms
 *   - Warm fills at low opacity for a comforting backdrop
 *   - Healing motifs: small sparkles, plus signs, bandages
 *   - Friendly, non-threatening symbols that reassure rather than alarm
 *   - Per-type color via currentColor from parent className
 *
 * Each icon uses a 32x32 viewBox for finer detail at small display sizes.
 */

interface IconProps {
  className?: string;
}

/**
 * Prompt Ambiguity — amber
 * Soft thought bubble with gentle diverging paths and a warm "?" center.
 * Communicates: "We received mixed signals — let's clarify."
 */
export function PromptAmbiguityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Warm backdrop circle */}
      <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.08" />
      {/* Thought bubble body */}
      <rect x="6" y="6" width="20" height="16" rx="6" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.2" />
      {/* Bubble tail dots */}
      <circle cx="10" cy="25" r="1.8" fill="currentColor" opacity="0.2" />
      <circle cx="7" cy="28" r="1.2" fill="currentColor" opacity="0.15" />
      {/* Friendly question mark */}
      <path d="M13.5 11a2.5 2.5 0 0 1 4.3 1.7c0 1.2-1.2 1.6-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <circle cx="15.8" cy="18" r="0.9" fill="currentColor" opacity="0.6" />
      {/* Gentle diverging paths from bubble — showing multiple interpretations */}
      <path d="M26 10l3-2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <path d="M26 14l3 0" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />
      <path d="M26 18l3 2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
      {/* Sparkle — healing hint */}
      <g opacity="0.35" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
        <line x1="28" y1="6" x2="28" y2="8.5" />
        <line x1="26.8" y1="7.2" x2="29.2" y2="7.2" />
      </g>
    </svg>
  );
}

/**
 * Missing Context — orange
 * Open file folder with a gentle gap and a sparkle suggesting it can be filled.
 * Communicates: "We're missing a piece — help us find it."
 */
export function MissingContextIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Warm backdrop */}
      <rect x="3" y="3" width="26" height="26" rx="8" fill="currentColor" opacity="0.06" />
      {/* Folder body */}
      <path d="M4 10h24a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10z" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Folder tab */}
      <path d="M2 10V7a2 2 0 0 1 2-2h8l2 3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.7" />
      {/* Content lines — present data */}
      <line x1="7" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="7" y1="19" x2="14" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
      {/* Missing content — gentle dashed line */}
      <line x1="7" y1="23" x2="20" y2="23" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2.5 2" opacity="0.2" />
      {/* Sparkle at the gap — "can be filled" */}
      <g opacity="0.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
        <line x1="24" y1="18" x2="24" y2="21" />
        <line x1="22.5" y1="19.5" x2="25.5" y2="19.5" />
      </g>
    </svg>
  );
}

/**
 * Rate Limit — yellow
 * Friendly speedometer with a gentle "pause" indicator.
 * Communicates: "We're going a bit fast — taking a breather."
 */
export function RateLimitIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Warm backdrop */}
      <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.06" />
      {/* Gauge circle */}
      <circle cx="16" cy="17" r="11" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.2" />
      {/* Gauge arc scale marks */}
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.25">
        <line x1="8" y1="23" x2="9.5" y2="21.5" />
        <line x1="6.5" y1="17" x2="8.5" y2="17" />
        <line x1="8" y1="11" x2="9.5" y2="12.5" />
        <line x1="16" y1="7.5" x2="16" y2="9.5" />
      </g>
      {/* "Too fast" zone — warm highlight */}
      <path d="M22.5 10a11 11 0 0 1 2.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      {/* Needle — pointing at comfortable zone, not pegged */}
      <line x1="16" y1="17" x2="21" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
      <circle cx="16" cy="17" r="2" fill="currentColor" opacity="0.3" />
      {/* Gentle pause symbol */}
      <rect x="23" y="22" width="2" height="5" rx="0.8" fill="currentColor" opacity="0.3" />
      <rect x="26.5" y="22" width="2" height="5" rx="0.8" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/**
 * Tool Failure — red (warm coral)
 * Wrench with a small bandage — "broken but being mended."
 * Communicates: "A tool stumbled — we're patching it up."
 */
export function ToolFailureIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Warm backdrop */}
      <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.06" />
      {/* Wrench body */}
      <path
        d="M21 5a5 5 0 0 0-4.5 7l-8 8a2.5 2.5 0 1 0 3.5 3.5l8-8A5 5 0 0 0 21 5z"
        fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
      {/* Wrench head notch */}
      <path d="M22 6l-2 2 1 1 2-2" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" opacity="0.4" />
      {/* Handle grip dot */}
      <circle cx="10" cy="22" r="1.2" fill="currentColor" opacity="0.3" />
      {/* Bandage across the wrench — "being healed" */}
      <rect x="13" y="11" width="7" height="3" rx="1" transform="rotate(-45, 16.5, 12.5)" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="0.8" />
      {/* Bandage cross marks */}
      <g stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" opacity="0.2" transform="rotate(-45, 16.5, 12.5)">
        <line x1="15.5" y1="11.5" x2="15.5" y2="13.5" />
        <line x1="17.5" y1="11.5" x2="17.5" y2="13.5" />
      </g>
      {/* Healing sparkle */}
      <g opacity="0.4" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
        <line x1="25" y1="14" x2="25" y2="17" />
        <line x1="23.5" y1="15.5" x2="26.5" y2="15.5" />
      </g>
    </svg>
  );
}

/**
 * Timeout — purple
 * Soft hourglass with gentle sand flow and a winding-down feeling.
 * Communicates: "We ran out of time — adjusting the pace."
 */
export function TimeoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Warm backdrop */}
      <rect x="4" y="2" width="24" height="28" rx="8" fill="currentColor" opacity="0.06" />
      {/* Hourglass frame — top bar */}
      <line x1="8" y1="4" x2="24" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      {/* Upper chamber */}
      <path d="M9 4l7 10 7-10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" opacity="0.5" fill="currentColor" fillOpacity="0.04" />
      {/* Neck — gentle pinch */}
      <circle cx="16" cy="15" r="1" fill="currentColor" opacity="0.3" />
      {/* Lower chamber — sand collected */}
      <path d="M9 26l7-10 7 10z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Sand level in lower chamber */}
      <path d="M11 24l5-5 5 5z" fill="currentColor" opacity="0.15" />
      {/* Hourglass frame — bottom bar */}
      <line x1="8" y1="26" x2="24" y2="26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      {/* Gentle spiral above — "time passing softly" */}
      <path d="M25 8a2 2 0 1 1 0 3" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.25" />
      {/* Sparkle — healing */}
      <g opacity="0.35" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
        <line x1="27" y1="18" x2="27" y2="20.5" />
        <line x1="25.8" y1="19.2" x2="28.2" y2="19.2" />
      </g>
    </svg>
  );
}

/**
 * Permission Error — red (warm)
 * Soft rounded shield with a friendly keyhole.
 * Communicates: "Access is gated — requesting the right key."
 */
export function PermissionErrorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Shield shape — soft and rounded */}
      <path
        d="M16 2L4 8v8c0 8 5.5 13 12 16 6.5-3 12-8 12-16V8z"
        fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
      {/* Inner shield ring */}
      <path
        d="M16 5L7 9.5v6c0 6 4.2 10 9 12.5 4.8-2.5 9-6.5 9-12.5v-6z"
        fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.15"
      />
      {/* Lock body — rounded and friendly */}
      <rect x="12" y="14.5" width="8" height="6.5" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
      {/* Lock shackle — soft arch */}
      <path d="M13.5 14.5V12a2.5 2.5 0 0 1 5 0v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      {/* Keyhole */}
      <circle cx="16" cy="17.5" r="1" fill="currentColor" opacity="0.4" />
      <line x1="16" y1="18.5" x2="16" y2="19.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {/* Sparkle — "we'll find the key" */}
      <g opacity="0.35" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
        <line x1="24" y1="5" x2="24" y2="7.5" />
        <line x1="22.8" y1="6.2" x2="25.2" y2="6.2" />
      </g>
    </svg>
  );
}

/**
 * Dependency Missing — amber
 * Two puzzle pieces with a gentle gap — "almost connected."
 * Communicates: "A piece is missing — we're looking for it."
 */
export function DependencyMissingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Warm backdrop */}
      <rect x="2" y="4" width="28" height="24" rx="8" fill="currentColor" opacity="0.06" />
      {/* Left puzzle piece — present, solid */}
      <path
        d="M4 9h7v3a2 2 0 1 0 0 4v3H4z"
        fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
      {/* Content lines on left piece */}
      <line x1="6" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <line x1="6" y1="14.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />
      {/* Right puzzle piece — missing, dashed outline */}
      <path
        d="M18 9h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7v-3a2 2 0 1 1 0-4z"
        fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2" strokeLinejoin="round" opacity="0.3"
      />
      {/* Gentle connecting arrow — "seeking" */}
      <path d="M14 16h2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
      <path d="M15.5 14.5l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      {/* Sparkle on the gap */}
      <g opacity="0.4" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
        <line x1="22" y1="6" x2="22" y2="8.5" />
        <line x1="20.8" y1="7.2" x2="23.2" y2="7.2" />
      </g>
      {/* Soft dots showing connection potential */}
      <circle cx="16" cy="22" r="0.8" fill="currentColor" opacity="0.2" />
      <circle cx="18.5" cy="23" r="0.6" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

/**
 * Invalid Output — pink
 * Document with wavy corrupted lines being smoothed by a gentle hand.
 * Communicates: "The output got tangled — we're straightening it out."
 */
export function InvalidOutputIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Warm backdrop */}
      <rect x="3" y="2" width="26" height="28" rx="7" fill="currentColor" opacity="0.06" />
      {/* Document */}
      <rect x="6" y="4" width="20" height="24" rx="3" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.2" />
      {/* Clean lines at top — "good output" */}
      <line x1="10" y1="9" x2="22" y2="9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.4" />
      <line x1="10" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
      {/* Corrupted/wavy lines — "tangled output" */}
      <path d="M10 17c1-1.5 2.5 1.5 4 0s2.5 1.5 4 0 2.5 1.5 4 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <path d="M10 21c1.5-1 2 1 3.5 0s2 1 3.5 0 2 1 3 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {/* Smoothing wand/sparkle — "being fixed" */}
      <line x1="24" y1="22" x2="28" y2="18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      {/* Sparkles at correction point */}
      <g opacity="0.45" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
        <line x1="26" y1="15" x2="26" y2="17.5" />
        <line x1="24.8" y1="16.2" x2="27.2" y2="16.2" />
      </g>
      <circle cx="28.5" cy="17" r="0.7" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/**
 * Unknown Error — gray
 * Soft cloud shape with "?" — mysterious but non-threatening.
 * Communicates: "Something unexpected happened — we're investigating."
 */
export function UnknownErrorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Soft cloud backdrop */}
      <path
        d="M8 24h16a6 6 0 0 0 0-12 8 8 0 0 0-15.5-1A5 5 0 0 0 8 24z"
        fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
      {/* Inner cloud highlight */}
      <path
        d="M10 22h12a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-1A3.5 3.5 0 0 0 10 22z"
        fill="currentColor" opacity="0.06"
      />
      {/* Friendly question mark */}
      <path d="M13.5 13a3 3 0 0 1 5.2 2c0 1.3-1.5 1.8-2.2 2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <circle cx="16.5" cy="20" r="0.9" fill="currentColor" opacity="0.45" />
      {/* Magnifying glass hint — "investigating" */}
      <circle cx="25" cy="25" r="2.5" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
      <line x1="27" y1="27" x2="29" y2="29" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />
      {/* Sparkle */}
      <g opacity="0.3" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round">
        <line x1="5" y1="10" x2="5" y2="12" />
        <line x1="4" y1="11" x2="6" y2="11" />
      </g>
    </svg>
  );
}

/**
 * Soft error indicator for ProcessLog failed events.
 * Gentle circle with a soft inner mark — warm alternative to XCircle.
 */
export function SoftErrorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.4" />
      {/* Soft inner exclamation — not a harsh X */}
      <line x1="16" y1="10" x2="16" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <circle cx="16" cy="22" r="1.2" fill="currentColor" opacity="0.5" />
      {/* Healing sparkle */}
      <g opacity="0.3" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round">
        <line x1="24" y1="7" x2="24" y2="9.5" />
        <line x1="22.8" y1="8.2" x2="25.2" y2="8.2" />
      </g>
    </svg>
  );
}

/**
 * Soft detail expand icon for ProcessLog error details.
 * Gentle circle with a "..." — warm alternative to AlertCircle.
 */
export function SoftDetailExpandIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.2" />
      {/* Ellipsis dots — "see more" */}
      <circle cx="10" cy="16" r="1.3" fill="currentColor" opacity="0.45" />
      <circle cx="16" cy="16" r="1.3" fill="currentColor" opacity="0.45" />
      <circle cx="22" cy="16" r="1.3" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export type ErrorIconComponent = ({ className }: { className?: string }) => React.JSX.Element;
