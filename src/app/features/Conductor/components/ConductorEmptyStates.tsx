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
/*  2. Idle Waveform Monitor — ProcessLog empty state                 */
/* ------------------------------------------------------------------ */
export function EmptyLogIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="el-screen" x1="80" y1="14" x2="80" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f0f23" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
        <linearGradient id="el-scanline" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.04" />
          <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="el-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Monitor outer frame */}
      <rect x="18" y="10" width="124" height="72" rx="5" fill="#1f2937" stroke="#374151" strokeWidth="0.8" />
      {/* Screen bezel */}
      <rect x="22" y="14" width="116" height="64" rx="3" fill="url(#el-screen)" stroke="#374151" strokeWidth="0.5" />
      {/* Scanline overlay */}
      <rect x="22" y="14" width="116" height="64" rx="3" fill="url(#el-scanline)" />
      {/* Inner screen glow */}
      <ellipse cx="80" cy="46" rx="40" ry="20" fill="url(#el-glow)" />

      {/* Grid lines — horizontal */}
      <g stroke="#374151" strokeWidth="0.3" opacity="0.2">
        <line x1="28" y1="26" x2="132" y2="26" />
        <line x1="28" y1="36" x2="132" y2="36" />
        <line x1="28" y1="46" x2="132" y2="46" />
        <line x1="28" y1="56" x2="132" y2="56" />
        <line x1="28" y1="66" x2="132" y2="66" />
      </g>
      {/* Grid lines — vertical */}
      <g stroke="#374151" strokeWidth="0.3" opacity="0.15">
        <line x1="46" y1="18" x2="46" y2="74" />
        <line x1="63" y1="18" x2="63" y2="74" />
        <line x1="80" y1="18" x2="80" y2="74" />
        <line x1="97" y1="18" x2="97" y2="74" />
        <line x1="114" y1="18" x2="114" y2="74" />
      </g>

      {/* Center axis highlight */}
      <line x1="28" y1="46" x2="132" y2="46" stroke="#22d3ee" strokeWidth="0.4" opacity="0.12" />

      {/* Flat waveform — idle signal */}
      <path
        d="M28 46 L52 46 L55 44 L58 48 L61 46 L132 46"
        stroke="#22d3ee"
        strokeWidth="1.2"
        opacity="0.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Faint ghost of previous activity — echo waveform */}
      <path
        d="M28 46 L40 46 L43 42 L46 50 L49 38 L52 54 L55 44 L58 48 L61 43 L64 49 L67 46 L132 46"
        stroke="#a855f7"
        strokeWidth="0.6"
        opacity="0.08"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Blip glow at the tiny signal bump */}
      <circle cx="58" cy="46" r="4" fill="#22d3ee" opacity="0.06" />

      {/* Monitor stand */}
      <rect x="70" y="82" width="20" height="3" rx="1" fill="#1f2937" stroke="#374151" strokeWidth="0.4" />
      <rect x="66" y="85" width="28" height="2.5" rx="1" fill="#111827" stroke="#374151" strokeWidth="0.3" />

      {/* Monitor indicator LED */}
      <circle cx="26" cy="18" r="1.2" fill="#22d3ee" opacity="0.2" />

      {/* Circuit traces from monitor edges */}
      <path d="M18 30 H10 Q7 30 6 27" stroke="#a855f7" strokeWidth="0.4" opacity="0.12" strokeLinecap="round" />
      <path d="M142 30 H148 Q151 30 152 27" stroke="#22d3ee" strokeWidth="0.4" opacity="0.12" strokeLinecap="round" />
      <circle cx="6" cy="27" r="1.5" fill="#1f2937" stroke="#a855f7" strokeWidth="0.4" opacity="0.15" />
      <circle cx="152" cy="27" r="1.5" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.4" opacity="0.15" />

      {/* Scale markings on left edge */}
      <g stroke="#374151" strokeWidth="0.4" opacity="0.2">
        <line x1="25" y1="26" x2="28" y2="26" />
        <line x1="25" y1="36" x2="28" y2="36" />
        <line x1="24" y1="46" x2="28" y2="46" />
        <line x1="25" y1="56" x2="28" y2="56" />
        <line x1="25" y1="66" x2="28" y2="66" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Heartbeat Flatline + Shield — HealingPanel no-errors state     */
/* ------------------------------------------------------------------ */
export function NoErrorsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ne-shield" x1="80" y1="10" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="ne-line" x1="10" y1="52" x2="150" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="15%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="85%" stopColor="#a855f7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ne-pulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Shield silhouette — subtle background */}
      <path
        d="M80 10 L112 24 L112 52 Q112 72 80 82 Q48 72 48 52 L48 24 Z"
        fill="url(#ne-shield)"
        stroke="#a855f7"
        strokeWidth="0.8"
        opacity="0.25"
      />
      {/* Shield inner facet */}
      <path
        d="M80 18 L104 28 L104 50 Q104 66 80 74 Q56 66 56 50 L56 28 Z"
        fill="none"
        stroke="#a855f7"
        strokeWidth="0.4"
        opacity="0.1"
      />

      {/* Heartbeat flatline — calm, steady */}
      <path
        d="M10 52 L58 52 L62 52 L65 44 L68 58 L71 40 L74 56 L77 52 L150 52"
        stroke="url(#ne-line)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Subtle pulse glow at heartbeat center */}
      <ellipse cx="70" cy="50" rx="14" ry="10" fill="url(#ne-pulse)" />

      {/* Grid marks along flatline */}
      <g stroke="#374151" strokeWidth="0.3" opacity="0.12">
        <line x1="30" y1="48" x2="30" y2="56" />
        <line x1="50" y1="48" x2="50" y2="56" />
        <line x1="90" y1="48" x2="90" y2="56" />
        <line x1="110" y1="48" x2="110" y2="56" />
        <line x1="130" y1="48" x2="130" y2="56" />
      </g>

      {/* Secondary flatline traces — faded echoes */}
      <line x1="20" y1="40" x2="140" y2="40" stroke="#374151" strokeWidth="0.3" opacity="0.06" />
      <line x1="20" y1="64" x2="140" y2="64" stroke="#374151" strokeWidth="0.3" opacity="0.06" />

      {/* Shield center icon — small cross/plus for healing */}
      <g opacity="0.2" stroke="#a855f7" strokeWidth="1" strokeLinecap="round">
        <line x1="80" y1="28" x2="80" y2="36" />
        <line x1="76" y1="32" x2="84" y2="32" />
      </g>

      {/* Circuit traces from shield edges */}
      <path d="M48 35 H35 Q30 35 27 32" stroke="#374151" strokeWidth="0.4" opacity="0.15" strokeLinecap="round" />
      <path d="M112 35 H125 Q130 35 133 32" stroke="#374151" strokeWidth="0.4" opacity="0.15" strokeLinecap="round" />
      <circle cx="27" cy="32" r="1.5" fill="#1f2937" stroke="#a855f7" strokeWidth="0.4" opacity="0.15" />
      <circle cx="133" cy="32" r="1.5" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.4" opacity="0.15" />

      {/* Corner accents */}
      <polygon points="18,18 21,16 24,18 24,22 21,24 18,22" fill="none" stroke="#a855f7" strokeWidth="0.4" opacity="0.1" />
      <polygon points="136,18 139,16 142,18 142,22 139,24 136,22" fill="none" stroke="#22d3ee" strokeWidth="0.4" opacity="0.1" />

      {/* Status dot — all clear */}
      <circle cx="142" cy="82" r="2" fill="#22d3ee" opacity="0.15" />
      <circle cx="142" cy="82" r="1" fill="#22d3ee" opacity="0.3" />
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
/*  4b. Repair Bot — empathetic error-section header illustration     */
/* ------------------------------------------------------------------ */
/**
 * Friendly repair-bot character in brand cyan/pink palette (~160x60).
 * Conveys that self-healing is actively working on the problem.
 * Used as header illustration in the error classification section.
 */
export function RepairBotIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 60" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="rb-body" x1="70" y1="12" x2="70" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id="rb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rb-shimmer" x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.06" />
          <stop offset="55%" stopColor="#f472b6" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-160 0"
            to="160 0"
            dur="3s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>

      {/* Background shimmer */}
      <rect x="0" y="0" width="160" height="60" fill="url(#rb-shimmer)" rx="6" />

      {/* ---- Robot body ---- */}
      {/* Head — rounded rectangle */}
      <rect x="58" y="8" width="24" height="18" rx="6" fill="url(#rb-body)" stroke="#22d3ee" strokeWidth="1" />
      {/* Antenna */}
      <line x1="70" y1="8" x2="70" y2="3" stroke="#22d3ee" strokeWidth="0.8" opacity="0.5" />
      <circle cx="70" cy="2" r="1.8" fill="#f472b6" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Eyes — friendly dots */}
      <circle cx="65" cy="16" r="2" fill="#22d3ee" opacity="0.6" />
      <circle cx="75" cy="16" r="2" fill="#22d3ee" opacity="0.6" />
      {/* Happy mouth — gentle smile arc */}
      <path d="M65 21a6 6 0 0 0 10 0" stroke="#22d3ee" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      {/* Cheek blush */}
      <circle cx="61" cy="20" r="1.5" fill="#f472b6" opacity="0.12" />
      <circle cx="79" cy="20" r="1.5" fill="#f472b6" opacity="0.12" />

      {/* Torso */}
      <rect x="61" y="27" width="18" height="14" rx="4" fill="url(#rb-body)" stroke="#22d3ee" strokeWidth="0.8" />
      {/* Heart/healing cross on chest */}
      <g stroke="#f472b6" strokeWidth="1" strokeLinecap="round" opacity="0.5">
        <line x1="70" y1="31" x2="70" y2="37" />
        <line x1="67" y1="34" x2="73" y2="34" />
      </g>
      {/* Belly panel line */}
      <line x1="64" y1="38" x2="76" y2="38" stroke="#22d3ee" strokeWidth="0.4" opacity="0.2" />

      {/* ---- Left arm — holding wrench ---- */}
      {/* Arm */}
      <path d="M61 30l-6 4-4 8" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      {/* Hand circle */}
      <circle cx="51" cy="42" r="2" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.8" opacity="0.5" />
      {/* Wrench tool */}
      <line x1="48" y1="39" x2="42" y2="33" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <circle cx="41" cy="32" r="2.5" fill="none" stroke="#f472b6" strokeWidth="1" opacity="0.4" />
      <path d="M39 30l-1-1" stroke="#f472b6" strokeWidth="1" strokeLinecap="round" opacity="0.3" />

      {/* ---- Right arm — reaching toward sparkles ---- */}
      <path d="M79 30l6 4 4 6" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <circle cx="89" cy="40" r="2" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.8" opacity="0.5" />

      {/* ---- Legs — small rounded stubs ---- */}
      <rect x="63" y="41" width="5" height="6" rx="2" fill="#22d3ee" opacity="0.12" stroke="#22d3ee" strokeWidth="0.6" />
      <rect x="72" y="41" width="5" height="6" rx="2" fill="#22d3ee" opacity="0.12" stroke="#22d3ee" strokeWidth="0.6" />
      {/* Feet */}
      <ellipse cx="65.5" cy="48" rx="3.5" ry="1.5" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.5" opacity="0.3" />
      <ellipse cx="74.5" cy="48" rx="3.5" ry="1.5" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.5" opacity="0.3" />

      {/* ---- Work area sparkles — "actively repairing" ---- */}
      {/* Sparkle cluster near right hand */}
      <circle cx="95" cy="36" r="2.5" fill="url(#rb-glow)">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="r" values="2;3;2" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="32" r="2" fill="url(#rb-glow)">
        <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="r" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="93" cy="30" r="1.5" fill="url(#rb-glow)">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.3s" repeatCount="indefinite" />
      </circle>

      {/* Plus signs near sparkles — "healing" */}
      <g stroke="#f472b6" strokeWidth="0.8" strokeLinecap="round" opacity="0.45">
        <line x1="98" y1="26" x2="98" y2="30" />
        <line x1="96" y1="28" x2="100" y2="28" />
      </g>
      <g stroke="#22d3ee" strokeWidth="0.6" strokeLinecap="round" opacity="0.35">
        <line x1="104" y1="35" x2="104" y2="38" />
        <line x1="102.5" y1="36.5" x2="105.5" y2="36.5" />
      </g>

      {/* ---- Left side: circuit traces ---- */}
      <path d="M30 30h8" stroke="#374151" strokeWidth="0.5" opacity="0.2" />
      <path d="M28 35h6" stroke="#374151" strokeWidth="0.4" opacity="0.15" />
      <circle cx="30" cy="30" r="1.2" fill="#0f0f23" stroke="#a855f7" strokeWidth="0.5" opacity="0.2" />
      <circle cx="28" cy="35" r="1" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.4" opacity="0.15" />

      {/* ---- Right side: resolved nodes ---- */}
      <path d="M118 28h8" stroke="#374151" strokeWidth="0.5" opacity="0.2" />
      <path d="M115 38h10" stroke="#374151" strokeWidth="0.4" opacity="0.15" />
      <circle cx="126" cy="28" r="1.2" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.5" opacity="0.2" />
      <circle cx="125" cy="38" r="1" fill="#0f0f23" stroke="#f472b6" strokeWidth="0.4" opacity="0.15" />

      {/* ---- Bottom ground glow ---- */}
      <ellipse cx="70" cy="52" rx="30" ry="4" fill="#22d3ee" opacity="0.04" />
      <ellipse cx="95" cy="44" rx="15" ry="3" fill="#f472b6" opacity="0.04" />

      {/* Ambient floating dots */}
      <circle cx="22" cy="18" r="0.6" fill="#22d3ee" opacity="0.2" />
      <circle cx="135" cy="15" r="0.5" fill="#f472b6" opacity="0.2" />
      <circle cx="140" cy="42" r="0.4" fill="#22d3ee" opacity="0.15" />
      <circle cx="18" cy="45" r="0.5" fill="#a855f7" opacity="0.15" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Empty Stage with Spotlight — RunSidebar no-pipelines state     */
/* ------------------------------------------------------------------ */
export function LaunchpadIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lp-spot" x1="40" y1="8" x2="40" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lp-pool" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
          <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Stage floor */}
      <rect x="8" y="58" width="64" height="6" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      {/* Stage edge highlight */}
      <line x1="10" y1="58" x2="70" y2="58" stroke="#374151" strokeWidth="0.6" opacity="0.4" />
      {/* Stage floor boards */}
      <g stroke="#374151" strokeWidth="0.3" opacity="0.15">
        <line x1="20" y1="58" x2="20" y2="64" />
        <line x1="32" y1="58" x2="32" y2="64" />
        <line x1="48" y1="58" x2="48" y2="64" />
        <line x1="60" y1="58" x2="60" y2="64" />
      </g>

      {/* Spotlight cone — triangular beam from top */}
      <path
        d="M40 8 L26 56 L54 56 Z"
        fill="url(#lp-spot)"
      />
      {/* Spotlight cone edge lines */}
      <line x1="40" y1="8" x2="26" y2="56" stroke="#22d3ee" strokeWidth="0.4" opacity="0.12" />
      <line x1="40" y1="8" x2="54" y2="56" stroke="#22d3ee" strokeWidth="0.4" opacity="0.12" />

      {/* Light pool on stage */}
      <ellipse cx="40" cy="56" rx="14" ry="3" fill="url(#lp-pool)" />

      {/* Spotlight fixture at top */}
      <rect x="36" y="4" width="8" height="6" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <circle cx="40" cy="9" r="2" fill="#0f0f23" stroke="#22d3ee" strokeWidth="0.6" opacity="0.4" />
      <circle cx="40" cy="9" r="0.8" fill="#22d3ee" opacity="0.2" />
      {/* Fixture mount bar */}
      <line x1="36" y1="4" x2="44" y2="4" stroke="#374151" strokeWidth="0.6" opacity="0.3" />
      <line x1="34" y1="3" x2="46" y2="3" stroke="#374151" strokeWidth="0.5" opacity="0.2" />

      {/* Side curtain hints — left */}
      <g opacity="0.15">
        <path d="M4 10 Q6 30 5 56" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M7 12 Q9 32 8 54" stroke="#a855f7" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      </g>
      {/* Side curtain hints — right */}
      <g opacity="0.15">
        <path d="M76 10 Q74 30 75 56" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M73 12 Q71 32 72 54" stroke="#a855f7" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      </g>

      {/* Circuit-trace accents below stage */}
      <path d="M18 64 V70 H28" stroke="#374151" strokeWidth="0.4" opacity="0.15" strokeLinecap="round" />
      <path d="M62 64 V70 H52" stroke="#374151" strokeWidth="0.4" opacity="0.15" strokeLinecap="round" />
      <circle cx="28" cy="70" r="1.2" fill="#1f2937" stroke="#22d3ee" strokeWidth="0.4" opacity="0.15" />
      <circle cx="52" cy="70" r="1.2" fill="#1f2937" stroke="#a855f7" strokeWidth="0.4" opacity="0.15" />

      {/* Dim stars in darkness beyond stage */}
      <circle cx="14" cy="20" r="0.6" fill="#22d3ee" opacity="0.15" />
      <circle cx="66" cy="16" r="0.5" fill="#a855f7" opacity="0.2" />
      <circle cx="18" cy="42" r="0.4" fill="#a855f7" opacity="0.1" />
      <circle cx="64" cy="38" r="0.5" fill="#22d3ee" opacity="0.1" />
    </svg>
  );
}
