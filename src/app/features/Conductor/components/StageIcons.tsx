/**
 * Custom pipeline stage icons — 24x24 SVG, monoline stroke,
 * circuit-neural visual language with geometric shapes + trace accents.
 *
 * Each icon represents a pipeline concept:
 *   scout  — radar sweep scanning for targets
 *   triage — diamond junction routing signals
 *   batch  — honeycomb cells bundling tasks
 *   execute — precision lightning bolt with circuit leads
 *   review — analysis lens with checkmark
 *   plan   — constellation map of connected nodes
 *   dispatch — fan-out branching from hub
 *   reflect — prism refracting light into insights
 */

interface IconProps {
  className?: string;
}

export function ScoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Radar sweep — concentric arcs with sweep line */}
      <circle cx="12" cy="12" r="9" opacity="0.12" />
      <path d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5" />
      <path d="M12 7.5a4.5 4.5 0 0 1 4.5 4.5" />
      <path d="M12 12l5-5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      {/* Circuit trace accents */}
      <path d="M3 7H5.5" strokeWidth="1" opacity="0.35" />
      <circle cx="3" cy="7" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M3 17H5" strokeWidth="1" opacity="0.35" />
      <circle cx="3" cy="17" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function TriageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Diamond decision node with routing paths */}
      <path d="M12 3l5 5-5 5-5-5z" />
      <path d="M9 13l-3 7" />
      <path d="M12 13v7" />
      <path d="M15 13l3 7" />
      <circle cx="6" cy="20" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1" fill="currentColor" stroke="none" />
      {/* Circuit trace accent */}
      <path d="M19.5 5H21.5" strokeWidth="1" opacity="0.35" />
      <circle cx="21.5" cy="5" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function BatchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Honeycomb hexagonal cells — bundling tasks */}
      <path d="M12 3l3 1.8v3.6L12 10.2 9 8.4V4.8z" />
      <path d="M9 8.4l-3 1.8v3.6l3 1.8 3-1.8V10.2z" />
      <path d="M15 8.4l3 1.8v3.6l-3 1.8-3-1.8V10.2z" />
      <path d="M12 13.8l3 1.8v3.6L12 21l-3-1.8v-3.6z" />
      {/* Circuit trace accents */}
      <path d="M2 6h2" strokeWidth="1" opacity="0.35" />
      <circle cx="2" cy="6" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M20 18h2" strokeWidth="1" opacity="0.35" />
      <circle cx="22" cy="18" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function ExecuteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Precision lightning bolt */}
      <path d="M13.5 2L6.5 12h5l-1 10 7-10h-5z" />
      {/* Circuit trace leads */}
      <path d="M2.5 6H5.5" strokeWidth="1" opacity="0.35" />
      <circle cx="2.5" cy="6" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M18.5 18H21.5" strokeWidth="1" opacity="0.35" />
      <circle cx="21.5" cy="18" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function ReviewIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Magnifying lens with checkmark */}
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
      <path d="M7 10.5l2.5 2.5 4-4" />
      {/* Circuit trace accent */}
      <path d="M2 5h2" strokeWidth="1" opacity="0.35" />
      <circle cx="2" cy="5" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function PlanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Constellation map — nodes connected by traces */}
      <path d="M4 5l5-1 5 2 6-2" />
      <path d="M9 4l-2 7-4 6" />
      <path d="M14 6l-1 6 3 6" />
      <path d="M7 11l6 1" />
      <path d="M3 17l6 3 7-2" />
      <circle cx="4" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="18" r="1" fill="currentColor" stroke="none" />
      {/* Circuit trace accent */}
      <path d="M20 8h2" strokeWidth="1" opacity="0.35" />
      <circle cx="22" cy="8" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function DispatchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Hub fan-out — central node branching to endpoints */}
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M5.5 12H10" />
      <path d="M10 12l8-7" />
      <path d="M10 12h8" />
      <path d="M10 12l8 7" />
      <path d="M16 3.5l2 1.5-2 1.5" />
      <path d="M16 10.5l2 1.5-2 1.5" />
      <path d="M16 17.5l2 1.5-2 1.5" />
      {/* Circuit trace accent */}
      <path d="M21 5h1.5" strokeWidth="1" opacity="0.35" />
      <circle cx="22.5" cy="5" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M21 19h1.5" strokeWidth="1" opacity="0.35" />
      <circle cx="22.5" cy="19" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function ReflectIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Mirror prism refracting light into insights */}
      <path d="M12 3l8 16H4z" />
      <path d="M2 10l5.5 2" strokeWidth="1" opacity="0.45" />
      <path d="M16.5 10l5-3.5" strokeWidth="1" opacity="0.45" />
      <path d="M17 12.5l4.5 0" strokeWidth="1" opacity="0.45" />
      <path d="M16.5 15l5 4" strokeWidth="1" opacity="0.45" />
      {/* Circuit trace accent */}
      <circle cx="2" cy="10" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

/* ── Status indicator icons (circuit-neural visual language) ──────── */

export function CompletedIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Circuit node ring with signal check */}
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12l3 3 5-5" />
      {/* Circuit trace accents */}
      <path d="M2 12h1.5" strokeWidth="1" opacity="0.35" />
      <circle cx="2" cy="12" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
      <path d="M20.5 12h1.5" strokeWidth="1" opacity="0.35" />
      <circle cx="22" cy="12" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function FailedIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Broken circuit node — octagonal alert shape */}
      <path d="M9 3h6l5 5v6.5l-5 5.5H9l-5-5.5V8z" />
      <path d="M12 8v4.5" />
      <circle cx="12" cy="16" r="0.8" fill="currentColor" stroke="none" />
      {/* Broken trace accent */}
      <path d="M2 7h2" strokeWidth="1" opacity="0.35" />
      <circle cx="2" cy="7" r="0.75" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function SkippedIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Bypassed circuit node — pause lines through ring */}
      <circle cx="12" cy="12" r="8.5" opacity="0.4" />
      <path d="M10 8.5v7" />
      <path d="M14 8.5v7" />
      {/* Bypass trace */}
      <path d="M2 8l2 4-2 4" strokeWidth="1" opacity="0.3" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

export function PendingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Dormant circuit node — ring with waiting signal dots */}
      <circle cx="12" cy="12" r="6" opacity="0.4" />
      <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" opacity="0.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" opacity="0.5" />
      <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
  );
}

export type StageIconComponent = ({ className }: IconProps) => React.JSX.Element;

export const STAGE_ICONS: Record<string, StageIconComponent> = {
  scout: ScoutIcon,
  triage: TriageIcon,
  batch: BatchIcon,
  execute: ExecuteIcon,
  review: ReviewIcon,
  plan: PlanIcon,
  dispatch: DispatchIcon,
  reflect: ReflectIcon,
};
