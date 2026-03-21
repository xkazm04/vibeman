/**
 * Branded SVG empty state illustrations for Conductor panels.
 * Uses brand palette: cyan-400, purple-500, #0f0f23 background.
 */

/** Dormant conductor baton for no-project state */
export function NoProjectIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={className}>
      {/* Background glow */}
      <ellipse cx="60" cy="70" rx="40" ry="6" fill="#22d3ee" opacity="0.05" />
      {/* Conductor baton */}
      <line x1="40" y1="55" x2="80" y2="20" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="80" cy="20" r="3" fill="#0f0f23" stroke="#22d3ee" strokeWidth="1.5" opacity="0.5" />
      {/* Dormant circuit traces */}
      <path d="M30 60 Q40 50 50 55" stroke="#a855f7" strokeWidth="0.75" opacity="0.2" strokeLinecap="round" />
      <path d="M70 25 Q85 30 90 40" stroke="#22d3ee" strokeWidth="0.75" opacity="0.2" strokeLinecap="round" />
      {/* Nodes (inactive) */}
      <circle cx="30" cy="60" r="2" fill="#374151" />
      <circle cx="50" cy="55" r="2" fill="#374151" />
      <circle cx="90" cy="40" r="2" fill="#374151" />
      {/* Stars/sparkles (dim) */}
      <circle cx="65" cy="15" r="0.8" fill="#a855f7" opacity="0.3" />
      <circle cx="45" cy="30" r="0.6" fill="#22d3ee" opacity="0.3" />
    </svg>
  );
}

/** Quiet neural pathways for empty process log */
export function EmptyLogIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={className}>
      {/* Neural pathway grid */}
      <path d="M20 40h20M50 40h20M80 40h20" stroke="#374151" strokeWidth="1" opacity="0.4" />
      <path d="M30 25v30" stroke="#374151" strokeWidth="0.5" opacity="0.2" />
      <path d="M60 20v40" stroke="#374151" strokeWidth="0.5" opacity="0.2" />
      <path d="M90 25v30" stroke="#374151" strokeWidth="0.5" opacity="0.2" />
      {/* Junction nodes */}
      <circle cx="30" cy="40" r="3" fill="#0f0f23" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />
      <circle cx="60" cy="40" r="4" fill="#0f0f23" stroke="#a855f7" strokeWidth="1" opacity="0.3" />
      <circle cx="90" cy="40" r="3" fill="#0f0f23" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />
      {/* Dim pulse indicator */}
      <circle cx="60" cy="40" r="2" fill="#a855f7" opacity="0.15" />
      {/* Terminal cursor blink */}
      <rect x="55" y="58" width="10" height="2" rx="1" fill="#6b7280" opacity="0.2" />
    </svg>
  );
}

/** Calm shield for no errors in healing panel */
export function NoErrorsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={className}>
      {/* Shield shape */}
      <path
        d="M60 12 L85 25 L85 48 Q85 65 60 72 Q35 65 35 48 L35 25 Z"
        fill="#0f0f23"
        stroke="#a855f7"
        strokeWidth="1"
        opacity="0.3"
      />
      {/* Inner shield glow */}
      <path
        d="M60 20 L78 30 L78 46 Q78 58 60 64 Q42 58 42 46 L42 30 Z"
        fill="#a855f7"
        opacity="0.04"
      />
      {/* Checkmark */}
      <path d="M50 42 L57 49 L72 34" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      {/* Circuit traces around shield */}
      <path d="M25 35h6" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
      <path d="M89 35h6" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
      <circle cx="25" cy="35" r="1.5" fill="#374151" opacity="0.3" />
      <circle cx="95" cy="35" r="1.5" fill="#374151" opacity="0.3" />
    </svg>
  );
}

/** Launchpad for no active pipelines in RunSidebar */
export function LaunchpadIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className}>
      {/* Launch platform */}
      <rect x="25" y="55" width="30" height="4" rx="2" fill="#374151" opacity="0.3" />
      {/* Rocket body */}
      <path
        d="M40 20 L47 40 L45 48 L35 48 L33 40 Z"
        fill="#0f0f23"
        stroke="#22d3ee"
        strokeWidth="1"
        opacity="0.4"
      />
      {/* Rocket window */}
      <circle cx="40" cy="32" r="3" fill="#0f0f23" stroke="#a855f7" strokeWidth="0.8" opacity="0.3" />
      {/* Exhaust traces */}
      <path d="M37 48v5" stroke="#374151" strokeWidth="1" opacity="0.2" />
      <path d="M40 48v7" stroke="#374151" strokeWidth="1" opacity="0.25" />
      <path d="M43 48v5" stroke="#374151" strokeWidth="1" opacity="0.2" />
      {/* Stars */}
      <circle cx="20" cy="25" r="0.8" fill="#22d3ee" opacity="0.2" />
      <circle cx="62" cy="18" r="0.6" fill="#a855f7" opacity="0.2" />
      <circle cx="55" cy="30" r="0.5" fill="#22d3ee" opacity="0.15" />
    </svg>
  );
}
