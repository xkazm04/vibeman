'use client';

/**
 * PalaceEmptyIllustration
 *
 * Custom SVG illustration of an empty crystalline palace chamber with
 * glowing purple doorways and faint neural connection lines.
 * Style: geometric line art on dark background, using purple (#a855f7)
 * and zinc tones. Depicts a minimal isometric room outline with archways
 * emitting soft purple glow.
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
    >
      <defs>
        {/* Archway glow gradients */}
        <radialGradient id="palaceGlow1" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="palaceGlow2" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="palaceGlow3" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Floor plane — isometric diamond */}
      <path
        d="M60 85 L105 65 L60 45 L15 65 Z"
        fill="none"
        stroke="#3f3f46"
        strokeWidth="0.5"
        opacity="0.4"
      />
      {/* Floor grid lines */}
      <line x1="37" y1="55" x2="82" y2="75" stroke="#3f3f46" strokeWidth="0.3" opacity="0.2" />
      <line x1="37" y1="75" x2="82" y2="55" stroke="#3f3f46" strokeWidth="0.3" opacity="0.2" />

      {/* Left wall */}
      <path
        d="M15 65 L15 35 L60 15 L60 45"
        fill="none"
        stroke="#52525b"
        strokeWidth="0.7"
        opacity="0.5"
      />

      {/* Right wall */}
      <path
        d="M105 65 L105 35 L60 15 L60 45"
        fill="none"
        stroke="#52525b"
        strokeWidth="0.7"
        opacity="0.5"
      />

      {/* Neural connection lines (faint) */}
      <line x1="30" y1="50" x2="50" y2="35" stroke="#a855f7" strokeWidth="0.4" opacity="0.12" />
      <line x1="50" y1="35" x2="75" y2="40" stroke="#a855f7" strokeWidth="0.4" opacity="0.10" />
      <line x1="75" y1="40" x2="90" y2="50" stroke="#a855f7" strokeWidth="0.4" opacity="0.08" />
      <line x1="50" y1="35" x2="60" y2="55" stroke="#a855f7" strokeWidth="0.4" opacity="0.10" />

      {/* Neural nodes (tiny) */}
      <circle cx="30" cy="50" r="1.2" fill="#a855f7" opacity="0.2" />
      <circle cx="50" cy="35" r="1.5" fill="#a855f7" opacity="0.25" />
      <circle cx="75" cy="40" r="1.2" fill="#a855f7" opacity="0.2" />
      <circle cx="90" cy="50" r="1" fill="#a855f7" opacity="0.15" />

      {/* Archway 1 — center-left (on left wall) */}
      <g>
        <ellipse cx="35" cy="55" rx="8" ry="14" fill="url(#palaceGlow1)" />
        <path
          d="M28 65 L28 48 A7 10 0 0 1 42 48 L42 65"
          fill="none"
          stroke="#a855f7"
          strokeWidth="0.8"
          opacity="0.5"
        />
      </g>

      {/* Archway 2 — center (back wall) */}
      <g>
        <ellipse cx="60" cy="30" rx="7" ry="12" fill="url(#palaceGlow2)" />
        <path
          d="M54 42 L54 26 A6 9 0 0 1 66 26 L66 42"
          fill="none"
          stroke="#a855f7"
          strokeWidth="0.8"
          opacity="0.45"
        />
      </g>

      {/* Archway 3 — center-right (on right wall) */}
      <g>
        <ellipse cx="85" cy="55" rx="8" ry="14" fill="url(#palaceGlow3)" />
        <path
          d="M78 65 L78 48 A7 10 0 0 1 92 48 L92 65"
          fill="none"
          stroke="#a855f7"
          strokeWidth="0.8"
          opacity="0.4"
        />
      </g>

      {/* Ceiling line */}
      <line x1="15" y1="35" x2="105" y2="35" stroke="#3f3f46" strokeWidth="0.3" opacity="0.15" />
    </svg>
  );
}
