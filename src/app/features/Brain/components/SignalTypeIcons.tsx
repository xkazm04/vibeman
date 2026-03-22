/**
 * Custom signal-type SVG icons with a neural/brain visual language.
 * 16×16 viewBox, monochrome 1.5px stroke, compatible with Lucide icon API.
 *
 * - GitNeuralPathway  → git_activity  (branching neural pathway)
 * - ApiSignalPulse    → api_focus     (pulse radiating from a node)
 * - ContextBrainLayer → context_focus (layered brain cross-section)
 * - CircuitComplete   → implementation (circuit completing)
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

/** Branching neural pathway — represents git_activity */
export function GitNeuralPathway({ className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Main trunk */}
      <path d="M8 14V6" />
      {/* Left branch */}
      <path d="M8 9C6.5 9 4.5 7.5 4 5" />
      {/* Right branch */}
      <path d="M8 7C9.5 7 11.5 5.5 12 4" />
      {/* Neural nodes */}
      <circle cx={8} cy={14} r={1} strokeWidth={1.2} />
      <circle cx={8} cy={5} r={1} strokeWidth={1.2} />
      <circle cx={4} cy={4} r={1} strokeWidth={1.2} />
      <circle cx={12} cy={3} r={1} strokeWidth={1.2} />
    </svg>
  );
}

/** Signal pulse radiating from a node — represents api_focus */
export function ApiSignalPulse({ className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Central node */}
      <circle cx={8} cy={8} r={1.5} strokeWidth={1.2} />
      {/* Inner pulse ring */}
      <path d="M5.2 5.2A4 4 0 0 1 10.8 5.2" />
      <path d="M10.8 10.8A4 4 0 0 1 5.2 10.8" />
      {/* Outer pulse ring */}
      <path d="M3.2 3.2A6.8 6.8 0 0 1 12.8 3.2" />
      <path d="M12.8 12.8A6.8 6.8 0 0 1 3.2 12.8" />
    </svg>
  );
}

/** Layered brain cross-section — represents context_focus */
export function ContextBrainLayer({ className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer brain hemisphere */}
      <path d="M3 10C2 8.5 2 6 3.5 4.5C5 3 7 2.5 8 2.5C9 2.5 11 3 12.5 4.5C14 6 14 8.5 13 10" />
      {/* Middle layer */}
      <path d="M4.5 9.5C3.8 8.3 3.8 6.5 5 5.3C6 4.3 7.2 4 8 4C8.8 4 10 4.3 11 5.3C12.2 6.5 12.2 8.3 11.5 9.5" />
      {/* Inner core */}
      <path d="M6 8.8C5.6 8.2 5.6 7.2 6.5 6.3C7 5.8 7.5 5.5 8 5.5C8.5 5.5 9 5.8 9.5 6.3C10.4 7.2 10.4 8.2 10 8.8" />
      {/* Brain stem */}
      <path d="M6.5 10L8 13.5L9.5 10" />
    </svg>
  );
}

/** Circuit completing — represents implementation */
export function CircuitComplete({ className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Circuit path — open square with a gap that completes */}
      <path d="M4 3H12V8H10" />
      <path d="M6 8H4V13H12V10" />
      {/* Junction nodes */}
      <circle cx={4} cy={3} r={0.8} strokeWidth={1} />
      <circle cx={12} cy={10} r={0.8} strokeWidth={1} />
      {/* Completion spark in the gap */}
      <path d="M7 7L8 8L9 7" />
      <path d="M8 6.5V5" />
    </svg>
  );
}
