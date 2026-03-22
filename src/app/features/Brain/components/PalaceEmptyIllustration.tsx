'use client';

/**
 * PalaceEmptyIllustration
 *
 * Custom SVG illustration of an empty crystalline palace chamber with
 * glowing purple doorways and faint neural connection lines.
 * Style: geometric line art on dark background (#0c0c0f), using purple (#a855f7)
 * and zinc tones. Depicts a minimal isometric room outline with 3 archways
 * emitting soft purple glow, suggesting rooms waiting to be discovered.
 * 120x100px SVG with subtle CSS animations.
 */

export default function PalaceEmptyIllustration() {
  return (
    <svg
      width="120"
      height="100"
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="palace-empty-illustration"
    >
      <defs>
        {/* Archway glow gradients */}
        <radialGradient id="peGlow1" cx="50%" cy="70%" r="65%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="peGlow2" cx="50%" cy="70%" r="65%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="peGlow3" cx="50%" cy="70%" r="65%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.30" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>

        {/* Floor reflection gradient */}
        <linearGradient id="peFloorFade" x1="60" y1="45" x2="60" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>

        {/* Neural line glow filter */}
        <filter id="peNeuralGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Floor plane — isometric diamond ── */}
      <path
        d="M60 88 L108 66 L60 44 L12 66 Z"
        fill="url(#peFloorFade)"
        stroke="#3f3f46"
        strokeWidth="0.5"
        opacity="0.4"
      />
      {/* Floor grid lines */}
      <line x1="36" y1="55" x2="84" y2="77" stroke="#3f3f46" strokeWidth="0.3" opacity="0.15" />
      <line x1="36" y1="77" x2="84" y2="55" stroke="#3f3f46" strokeWidth="0.3" opacity="0.15" />
      <line x1="60" y1="44" x2="60" y2="88" stroke="#3f3f46" strokeWidth="0.25" opacity="0.10" />
      <line x1="12" y1="66" x2="108" y2="66" stroke="#3f3f46" strokeWidth="0.25" opacity="0.10" />

      {/* ── Left wall ── */}
      <path
        d="M12 66 L12 33 L60 13 L60 44"
        fill="none"
        stroke="#52525b"
        strokeWidth="0.7"
        opacity="0.45"
      />
      {/* Left wall crystalline facets */}
      <line x1="36" y1="23" x2="36" y2="55" stroke="#52525b" strokeWidth="0.3" opacity="0.15" />
      <line x1="24" y1="28" x2="48" y2="18" stroke="#52525b" strokeWidth="0.25" opacity="0.10" />

      {/* ── Right wall ── */}
      <path
        d="M108 66 L108 33 L60 13 L60 44"
        fill="none"
        stroke="#52525b"
        strokeWidth="0.7"
        opacity="0.45"
      />
      {/* Right wall crystalline facets */}
      <line x1="84" y1="23" x2="84" y2="55" stroke="#52525b" strokeWidth="0.3" opacity="0.15" />
      <line x1="96" y1="28" x2="72" y2="18" stroke="#52525b" strokeWidth="0.25" opacity="0.10" />

      {/* ── Ceiling ridge ── */}
      <line x1="12" y1="33" x2="108" y2="33" stroke="#3f3f46" strokeWidth="0.4" opacity="0.12" />
      <line x1="60" y1="13" x2="60" y2="33" stroke="#3f3f46" strokeWidth="0.3" opacity="0.10" />

      {/* ── Neural connection web (faint, with glow filter) ── */}
      <g filter="url(#peNeuralGlow)" opacity="0.6">
        {/* Primary connections */}
        <line x1="28" y1="52" x2="48" y2="36" stroke="#a855f7" strokeWidth="0.4" opacity="0.18">
          <animate attributeName="opacity" values="0.18;0.10;0.18" dur="4s" repeatCount="indefinite" />
        </line>
        <line x1="48" y1="36" x2="72" y2="38" stroke="#a855f7" strokeWidth="0.4" opacity="0.15">
          <animate attributeName="opacity" values="0.15;0.08;0.15" dur="5s" repeatCount="indefinite" />
        </line>
        <line x1="72" y1="38" x2="92" y2="52" stroke="#a855f7" strokeWidth="0.4" opacity="0.12">
          <animate attributeName="opacity" values="0.12;0.06;0.12" dur="4.5s" repeatCount="indefinite" />
        </line>
        <line x1="48" y1="36" x2="60" y2="56" stroke="#a855f7" strokeWidth="0.35" opacity="0.13">
          <animate attributeName="opacity" values="0.13;0.07;0.13" dur="5.5s" repeatCount="indefinite" />
        </line>
        {/* Secondary connections */}
        <line x1="35" y1="42" x2="60" y2="28" stroke="#a855f7" strokeWidth="0.3" opacity="0.08">
          <animate attributeName="opacity" values="0.08;0.04;0.08" dur="6s" repeatCount="indefinite" />
        </line>
        <line x1="60" y1="28" x2="85" y2="42" stroke="#a855f7" strokeWidth="0.3" opacity="0.08">
          <animate attributeName="opacity" values="0.08;0.04;0.08" dur="6.5s" repeatCount="indefinite" />
        </line>
        <line x1="72" y1="38" x2="60" y2="56" stroke="#a855f7" strokeWidth="0.3" opacity="0.07">
          <animate attributeName="opacity" values="0.07;0.03;0.07" dur="7s" repeatCount="indefinite" />
        </line>
      </g>

      {/* ── Neural nodes ── */}
      <g>
        <circle cx="28" cy="52" r="1.5" fill="#a855f7" opacity="0.25">
          <animate attributeName="opacity" values="0.25;0.12;0.25" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="48" cy="36" r="2" fill="#a855f7" opacity="0.30">
          <animate attributeName="opacity" values="0.30;0.15;0.30" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="72" cy="38" r="1.8" fill="#a855f7" opacity="0.25">
          <animate attributeName="opacity" values="0.25;0.12;0.25" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="92" cy="52" r="1.3" fill="#a855f7" opacity="0.20">
          <animate attributeName="opacity" values="0.20;0.10;0.20" dur="3.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="56" r="1.5" fill="#a855f7" opacity="0.22">
          <animate attributeName="opacity" values="0.22;0.10;0.22" dur="4.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="28" r="1.2" fill="#a855f7" opacity="0.18">
          <animate attributeName="opacity" values="0.18;0.08;0.18" dur="5s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ── Archway 1 — left wall ── */}
      <g>
        <ellipse cx="33" cy="56" rx="9" ry="15" fill="url(#peGlow1)">
          <animate attributeName="rx" values="9;10;9" dur="4s" repeatCount="indefinite" />
          <animate attributeName="ry" values="15;16;15" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <path
          d="M25 66 L25 48 A8 12 0 0 1 41 48 L41 66"
          fill="none"
          stroke="#a855f7"
          strokeWidth="0.8"
          opacity="0.55"
        />
        {/* Inner archway highlight */}
        <path
          d="M27 66 L27 50 A6 10 0 0 1 39 50 L39 66"
          fill="none"
          stroke="#c084fc"
          strokeWidth="0.3"
          opacity="0.15"
        />
        {/* Threshold glow line */}
        <line x1="25" y1="66" x2="41" y2="66" stroke="#a855f7" strokeWidth="0.6" opacity="0.30">
          <animate attributeName="opacity" values="0.30;0.15;0.30" dur="3s" repeatCount="indefinite" />
        </line>
      </g>

      {/* ── Archway 2 — back wall (center) ── */}
      <g>
        <ellipse cx="60" cy="30" rx="8" ry="14" fill="url(#peGlow2)">
          <animate attributeName="rx" values="8;9;8" dur="5s" repeatCount="indefinite" />
          <animate attributeName="ry" values="14;15;14" dur="5s" repeatCount="indefinite" />
        </ellipse>
        <path
          d="M53 42 L53 25 A7 11 0 0 1 67 25 L67 42"
          fill="none"
          stroke="#a855f7"
          strokeWidth="0.8"
          opacity="0.50"
        />
        {/* Inner archway highlight */}
        <path
          d="M55 42 L55 27 A5 9 0 0 1 65 27 L65 42"
          fill="none"
          stroke="#c084fc"
          strokeWidth="0.3"
          opacity="0.12"
        />
        {/* Threshold glow line */}
        <line x1="53" y1="42" x2="67" y2="42" stroke="#a855f7" strokeWidth="0.6" opacity="0.25">
          <animate attributeName="opacity" values="0.25;0.12;0.25" dur="4s" repeatCount="indefinite" />
        </line>
      </g>

      {/* ── Archway 3 — right wall ── */}
      <g>
        <ellipse cx="87" cy="56" rx="9" ry="15" fill="url(#peGlow3)">
          <animate attributeName="rx" values="9;10;9" dur="4.5s" repeatCount="indefinite" />
          <animate attributeName="ry" values="15;16;15" dur="4.5s" repeatCount="indefinite" />
        </ellipse>
        <path
          d="M79 66 L79 48 A8 12 0 0 1 95 48 L95 66"
          fill="none"
          stroke="#a855f7"
          strokeWidth="0.8"
          opacity="0.45"
        />
        {/* Inner archway highlight */}
        <path
          d="M81 66 L81 50 A6 10 0 0 1 93 50 L93 66"
          fill="none"
          stroke="#c084fc"
          strokeWidth="0.3"
          opacity="0.12"
        />
        {/* Threshold glow line */}
        <line x1="79" y1="66" x2="95" y2="66" stroke="#a855f7" strokeWidth="0.6" opacity="0.25">
          <animate attributeName="opacity" values="0.25;0.12;0.25" dur="3.5s" repeatCount="indefinite" />
        </line>
      </g>

      {/* ── Crystalline corner accents ── */}
      {/* Top apex crystal */}
      <polygon
        points="60,10 57,14 60,13 63,14"
        fill="#a855f7"
        opacity="0.12"
      >
        <animate attributeName="opacity" values="0.12;0.06;0.12" dur="6s" repeatCount="indefinite" />
      </polygon>

      {/* Bottom corner crystals */}
      <polygon
        points="12,66 14,63 16,66"
        fill="#7c3aed"
        opacity="0.08"
      />
      <polygon
        points="108,66 106,63 104,66"
        fill="#7c3aed"
        opacity="0.08"
      />

      {/* ── Ambient floating particles ── */}
      <circle cx="40" cy="60" r="0.7" fill="#a855f7" opacity="0.15">
        <animate attributeName="cy" values="60;57;60" dur="7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.05;0.15" dur="7s" repeatCount="indefinite" />
      </circle>
      <circle cx="78" cy="58" r="0.6" fill="#c084fc" opacity="0.12">
        <animate attributeName="cy" values="58;55;58" dur="8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.04;0.12" dur="8s" repeatCount="indefinite" />
      </circle>
      <circle cx="55" cy="48" r="0.5" fill="#a855f7" opacity="0.10">
        <animate attributeName="cy" values="48;45;48" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.10;0.03;0.10" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="68" cy="52" r="0.6" fill="#c084fc" opacity="0.10">
        <animate attributeName="cy" values="52;49;52" dur="9s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.10;0.04;0.10" dur="9s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
