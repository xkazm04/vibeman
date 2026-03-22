/**
 * Branded SVG empty-state illustrations for Conductor panels.
 *
 * Brand palette: cyan-400 (#22d3ee), purple-500 (#a855f7),
 * pink-400 (#f472b6), dark bg (#0f0f23).
 * Style: flat geometric with circuit-trace motifs and subtle gradients.
 */

/* ------------------------------------------------------------------ */
/*  1. Dormant Conductor Baton — ConductorView no-project empty state */
/* ------------------------------------------------------------------ */
export function NoProjectIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="np-glow" x1="80" y1="90" x2="80" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="np-baton" x1="50" y1="70" x2="110" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
      </defs>

      {/* Floor glow */}
      <ellipse cx="80" cy="88" rx="55" ry="8" fill="url(#np-glow)" />

      {/* Podium */}
      <rect x="60" y="78" width="40" height="6" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.6" />
      <rect x="66" y="82" width="28" height="4" rx="2" fill="#111827" stroke="#374151" strokeWidth="0.4" />

      {/* Dormant circuit traces fanning from podium */}
      <path d="M48 80 Q38 70 25 68" stroke="#a855f7" strokeWidth="0.5" opacity="0.15" strokeLinecap="round" />
      <path d="M112 80 Q122 70 135 68" stroke="#22d3ee" strokeWidth="0.5" opacity="0.15" strokeLinecap="round" />
      <path d="M55 78 Q42 60 30 55" stroke="#a855f7" strokeWidth="0.4" opacity="0.12" strokeLinecap="round" />
      <path d="M105 78 Q118 60 130 55" stroke="#22d3ee" strokeWidth="0.4" opacity="0.12" strokeLinecap="round" />

      {/* Trace-end nodes */}
      <circle cx="25" cy="68" r="2" fill="#1f2937" stroke="#a855f7" strokeWidth="0.6" opacity="0.25" />
      <circle cx="135" cy="68" r="2" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.6" opacity="0.25" />
      <circle cx="30" cy="55" r="1.5" fill="#1f2937" stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />
      <circle cx="130" cy="55" r="1.5" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.2" />

      {/* Conductor baton — resting diagonally */}
      <line x1="55" y1="72" x2="108" y2="22" stroke="url(#np-baton)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Baton tip bulb */}
      <circle cx="108" cy="22" r="4" fill="#0f0f23" stroke="#22d3ee" strokeWidth="1.2" opacity="0.45" />
      <circle cx="108" cy="22" r="1.8" fill="#22d3ee" opacity="0.12" />
      {/* Baton grip rings */}
      <line x1="62" y1="66" x2="64" y2="64" stroke="#9ca3af" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
      <line x1="66" y1="62" x2="68" y2="60" stroke="#9ca3af" strokeWidth="1" opacity="0.25" strokeLinecap="round" />

      {/* Dormant music-score staff lines */}
      <g opacity="0.08" stroke="#a855f7" strokeWidth="0.5">
        <line x1="15" y1="30" x2="65" y2="30" />
        <line x1="15" y1="34" x2="65" y2="34" />
        <line x1="15" y1="38" x2="65" y2="38" />
        <line x1="15" y1="42" x2="65" y2="42" />
        <line x1="15" y1="46" x2="65" y2="46" />
      </g>

      {/* Geometric note shapes on staff — dormant */}
      <rect x="28" y="32" width="4" height="3" rx="1" fill="#a855f7" opacity="0.1" />
      <rect x="42" y="36" width="4" height="3" rx="1" fill="#a855f7" opacity="0.08" />
      <rect x="54" y="40" width="4" height="3" rx="1" fill="#a855f7" opacity="0.06" />

      {/* Scattered dim stars */}
      <circle cx="18" cy="18" r="1" fill="#22d3ee" opacity="0.2" />
      <circle cx="140" cy="15" r="0.8" fill="#a855f7" opacity="0.25" />
      <circle cx="120" cy="40" r="0.6" fill="#22d3ee" opacity="0.15" />
      <circle cx="38" cy="14" r="0.5" fill="#a855f7" opacity="0.18" />
      <circle cx="95" cy="12" r="0.7" fill="#22d3ee" opacity="0.12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Quiet Neural Pathways — ProcessLog empty state                 */
/* ------------------------------------------------------------------ */
export function EmptyLogIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="el-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Central glow */}
      <circle cx="80" cy="48" r="35" fill="url(#el-core)" />

      {/* Horizontal pathway spine */}
      <line x1="10" y1="48" x2="150" y2="48" stroke="#374151" strokeWidth="0.6" opacity="0.3" />

      {/* Branching pathways — top */}
      <path d="M40 48 Q40 30 55 22" stroke="#374151" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />
      <path d="M80 48 Q80 25 95 18" stroke="#374151" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />
      <path d="M80 48 Q80 28 65 20" stroke="#374151" strokeWidth="0.5" opacity="0.18" strokeLinecap="round" />
      <path d="M120 48 Q120 32 108 24" stroke="#374151" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />

      {/* Branching pathways — bottom */}
      <path d="M40 48 Q40 66 55 74" stroke="#374151" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />
      <path d="M80 48 Q80 68 95 76" stroke="#374151" strokeWidth="0.5" opacity="0.18" strokeLinecap="round" />
      <path d="M80 48 Q80 70 65 78" stroke="#374151" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />
      <path d="M120 48 Q120 64 108 72" stroke="#374151" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />

      {/* Spine junction nodes */}
      <circle cx="20" cy="48" r="3" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.8" opacity="0.25" />
      <circle cx="40" cy="48" r="3.5" fill="#0f0f23" stroke="#a855f7" strokeWidth="0.8" opacity="0.3" />
      <circle cx="60" cy="48" r="3" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.8" opacity="0.25" />
      <circle cx="80" cy="48" r="5" fill="#0f0f23" stroke="#a855f7" strokeWidth="1" opacity="0.35" />
      <circle cx="100" cy="48" r="3" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.8" opacity="0.25" />
      <circle cx="120" cy="48" r="3.5" fill="#0f0f23" stroke="#a855f7" strokeWidth="0.8" opacity="0.3" />
      <circle cx="140" cy="48" r="3" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.8" opacity="0.25" />

      {/* Branch-end nodes */}
      <circle cx="55" cy="22" r="2" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.2" />
      <circle cx="95" cy="18" r="2" fill="#1f2937" stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />
      <circle cx="65" cy="20" r="1.5" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.15" />
      <circle cx="108" cy="24" r="2" fill="#1f2937" stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />
      <circle cx="55" cy="74" r="2" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.2" />
      <circle cx="95" cy="76" r="2" fill="#1f2937" stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />
      <circle cx="65" cy="78" r="1.5" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.15" />
      <circle cx="108" cy="72" r="2" fill="#1f2937" stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />

      {/* Dormant core pulse */}
      <circle cx="80" cy="48" r="2.5" fill="#a855f7" opacity="0.1" />

      {/* Terminal cursor blinking — idle indicator */}
      <g opacity="0.18">
        <rect x="72" y="84" width="16" height="2.5" rx="1" fill="#374151" />
        <rect x="74" y="85" width="3" height="1" rx="0.5" fill="#22d3ee" opacity="0.5" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Calm Shield — HealingPanel no-errors empty state               */
/* ------------------------------------------------------------------ */
export function NoErrorsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ne-shield" x1="80" y1="8" x2="80" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="ne-check" x1="65" y1="52" x2="100" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* Outer shield */}
      <path
        d="M80 8 L115 24 L115 55 Q115 78 80 90 Q45 78 45 55 L45 24 Z"
        fill="url(#ne-shield)"
        stroke="#a855f7"
        strokeWidth="1"
        opacity="0.35"
      />

      {/* Inner shield layer */}
      <path
        d="M80 18 L106 30 L106 52 Q106 70 80 80 Q54 70 54 52 L54 30 Z"
        fill="#0f0f23"
        stroke="#a855f7"
        strokeWidth="0.6"
        opacity="0.2"
      />

      {/* Geometric facet lines inside shield */}
      <line x1="80" y1="18" x2="80" y2="80" stroke="#a855f7" strokeWidth="0.3" opacity="0.08" />
      <line x1="54" y1="40" x2="106" y2="40" stroke="#a855f7" strokeWidth="0.3" opacity="0.06" />
      <line x1="58" y1="55" x2="102" y2="55" stroke="#a855f7" strokeWidth="0.3" opacity="0.05" />

      {/* Checkmark — gradient stroke */}
      <path
        d="M67 48 L76 57 L96 37"
        stroke="url(#ne-check)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />

      {/* Circuit traces radiating from shield */}
      <path d="M45 35 H30 Q25 35 22 32" stroke="#374151" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />
      <path d="M115 35 H130 Q135 35 138 32" stroke="#374151" strokeWidth="0.5" opacity="0.2" strokeLinecap="round" />
      <path d="M50 65 Q38 72 28 72" stroke="#374151" strokeWidth="0.4" opacity="0.15" strokeLinecap="round" />
      <path d="M110 65 Q122 72 132 72" stroke="#374151" strokeWidth="0.4" opacity="0.15" strokeLinecap="round" />

      {/* Trace-end nodes */}
      <circle cx="22" cy="32" r="2" fill="#1f2937" stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />
      <circle cx="138" cy="32" r="2" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.2" />
      <circle cx="28" cy="72" r="1.5" fill="#1f2937" stroke="#a855f7" strokeWidth="0.5" opacity="0.15" />
      <circle cx="132" cy="72" r="1.5" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.15" />

      {/* Tiny hexagonal accents near shield edges */}
      <polygon points="38,22 41,20 44,22 44,26 41,28 38,26" fill="none" stroke="#a855f7" strokeWidth="0.4" opacity="0.12" />
      <polygon points="116,22 119,20 122,22 122,26 119,28 116,26" fill="none" stroke="#22d3ee" strokeWidth="0.4" opacity="0.12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  4. Healing In Progress — active repair state                      */
/* ------------------------------------------------------------------ */
export function HealingInProgressIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="healShimmer" x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0" />
          <stop offset="40%" stopColor="#f472b6" stopOpacity="0.15" />
          <stop offset="60%" stopColor="#f472b6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-120 0"
            to="120 0"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </linearGradient>
        <radialGradient id="healSparkle" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Shimmer overlay */}
      <rect x="0" y="0" width="120" height="80" fill="url(#healShimmer)" rx="4" />

      {/* Circuit board base */}
      <rect x="30" y="30" width="60" height="35" rx="3" fill="#0f0f23" stroke="#374151" strokeWidth="0.8" opacity="0.5" />
      {/* Board traces */}
      <path d="M35 42h15M55 42h10M70 42h15" stroke="#374151" strokeWidth="0.6" opacity="0.4" />
      <path d="M40 35v25" stroke="#374151" strokeWidth="0.4" opacity="0.3" />
      <path d="M60 33v30" stroke="#374151" strokeWidth="0.4" opacity="0.3" />
      <path d="M80 35v25" stroke="#374151" strokeWidth="0.4" opacity="0.3" />
      {/* Trace nodes */}
      <circle cx="40" cy="42" r="1.5" fill="#0f0f23" stroke="#a855f7" strokeWidth="0.6" opacity="0.4" />
      <circle cx="60" cy="42" r="2" fill="#0f0f23" stroke="#a855f7" strokeWidth="0.6" opacity="0.4" />
      <circle cx="80" cy="42" r="1.5" fill="#0f0f23" stroke="#a855f7" strokeWidth="0.6" opacity="0.4" />

      {/* Crack lines */}
      <path d="M52 36l3 5-2 4 4 3-1 6" stroke="#f472b6" strokeWidth="0.7" strokeLinecap="round" opacity="0.35" />
      <path d="M67 34l-2 6 3 3-1 5" stroke="#f472b6" strokeWidth="0.5" strokeLinecap="round" opacity="0.25" />

      {/* Wrench — tending the board */}
      <g opacity="0.7">
        <path d="M22 18l18 16" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M40 34l3-2 2 3-1 3-4 1z" fill="#0f0f23" stroke="#f472b6" strokeWidth="1" strokeLinejoin="round" />
        <line x1="25" y1="20" x2="27" y2="22" stroke="#f472b6" strokeWidth="0.8" opacity="0.4" />
        <line x1="28" y1="23" x2="30" y2="25" stroke="#f472b6" strokeWidth="0.8" opacity="0.4" />
      </g>

      {/* Sparkles at repair points */}
      <circle cx="44" cy="36" r="2" fill="url(#healSparkle)">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="r" values="1.5;2.5;1.5" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="55" cy="40" r="1.5" fill="url(#healSparkle)">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="r" values="1;2;1" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="65" cy="37" r="1.8" fill="url(#healSparkle)">
        <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="r" values="1.2;2.2;1.2" dur="1.5s" repeatCount="indefinite" />
      </circle>

      {/* Plus signs — mending */}
      <g stroke="#f472b6" strokeWidth="0.6" opacity="0.4" strokeLinecap="round">
        <line x1="47" y1="32" x2="47" y2="35" />
        <line x1="45.5" y1="33.5" x2="48.5" y2="33.5" />
        <line x1="71" y1="39" x2="71" y2="42" />
        <line x1="69.5" y1="40.5" x2="72.5" y2="40.5" />
      </g>

      {/* Ambient traces beyond board */}
      <path d="M15 50h10" stroke="#374151" strokeWidth="0.5" opacity="0.2" />
      <path d="M95 45h10" stroke="#374151" strokeWidth="0.5" opacity="0.2" />
      <circle cx="15" cy="50" r="1" fill="#374151" opacity="0.2" />
      <circle cx="105" cy="45" r="1" fill="#374151" opacity="0.2" />

      {/* Bottom glow */}
      <ellipse cx="60" cy="70" rx="35" ry="5" fill="#f472b6" opacity="0.04" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Launchpad — RunSidebar no-pipelines empty state                */
/* ------------------------------------------------------------------ */
export function LaunchpadIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lp-rocket" x1="40" y1="16" x2="40" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="lp-glow" x1="40" y1="70" x2="40" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ground glow */}
      <ellipse cx="40" cy="68" rx="28" ry="6" fill="url(#lp-glow)" />

      {/* Launch tower scaffolding */}
      <g stroke="#374151" strokeWidth="0.6" opacity="0.25">
        <line x1="26" y1="30" x2="26" y2="64" />
        <line x1="22" y1="64" x2="30" y2="64" />
        <line x1="26" y1="38" x2="33" y2="38" />
        <line x1="26" y1="48" x2="33" y2="48" />
        <line x1="26" y1="56" x2="33" y2="50" />
      </g>

      {/* Launch platform */}
      <rect x="28" y="60" width="24" height="3" rx="1.5" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="32" y="62" width="16" height="3" rx="1.5" fill="#111827" stroke="#374151" strokeWidth="0.4" />

      {/* Rocket body */}
      <path
        d="M40 16 L48 38 L46 50 L34 50 L32 38 Z"
        fill="#0f0f23"
        stroke="url(#lp-rocket)"
        strokeWidth="1.2"
      />
      {/* Rocket nose highlight */}
      <path d="M40 16 L42 24 L40 26 L38 24 Z" fill="#22d3ee" opacity="0.08" />

      {/* Rocket window */}
      <circle cx="40" cy="32" r="3.5" fill="#0f0f23" stroke="#a855f7" strokeWidth="0.8" opacity="0.35" />
      <circle cx="40" cy="32" r="1.5" fill="#a855f7" opacity="0.08" />

      {/* Fins */}
      <path d="M34 50 L30 56 L34 54 Z" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.3" />
      <path d="M46 50 L50 56 L46 54 Z" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.5" opacity="0.3" />

      {/* Dormant exhaust traces */}
      <g stroke="#374151" strokeWidth="0.8" opacity="0.15" strokeLinecap="round">
        <line x1="37" y1="52" x2="37" y2="57" />
        <line x1="40" y1="52" x2="40" y2="59" />
        <line x1="43" y1="52" x2="43" y2="57" />
      </g>

      {/* Star constellation */}
      <circle cx="14" cy="14" r="1" fill="#22d3ee" opacity="0.25" />
      <circle cx="66" cy="10" r="0.8" fill="#a855f7" opacity="0.3" />
      <circle cx="58" cy="22" r="0.5" fill="#22d3ee" opacity="0.15" />
      <circle cx="20" cy="24" r="0.6" fill="#a855f7" opacity="0.2" />
      <circle cx="70" cy="36" r="0.5" fill="#22d3ee" opacity="0.12" />
      <circle cx="12" cy="40" r="0.7" fill="#a855f7" opacity="0.15" />
      {/* Constellation lines */}
      <line x1="14" y1="14" x2="20" y2="24" stroke="#a855f7" strokeWidth="0.3" opacity="0.08" />
      <line x1="66" y1="10" x2="58" y2="22" stroke="#22d3ee" strokeWidth="0.3" opacity="0.08" />
    </svg>
  );
}
