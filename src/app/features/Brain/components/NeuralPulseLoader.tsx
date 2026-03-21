'use client';

/**
 * NeuralPulseLoader
 *
 * Branded micro-animation: 3-4 SVG nodes connected by lines with a pulse
 * traveling along the connections. CSS @keyframes only — no JS overhead.
 * Replaces generic SimpleSpinner in Brain panel loading states.
 */

const SIZE = 40;

export default function NeuralPulseLoader({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="status"
        aria-label="Loading"
      >
        <style>{`
          @keyframes neuralPulse1 {
            0%, 100% { stroke-dashoffset: 30; }
            50% { stroke-dashoffset: 0; }
          }
          @keyframes neuralPulse2 {
            0%, 100% { stroke-dashoffset: 26; }
            50% { stroke-dashoffset: 0; }
          }
          @keyframes neuralPulse3 {
            0%, 100% { stroke-dashoffset: 22; }
            50% { stroke-dashoffset: 0; }
          }
          @keyframes nodeGlow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          .np-line1 {
            stroke-dasharray: 6 24;
            animation: neuralPulse1 2s ease-in-out infinite;
          }
          .np-line2 {
            stroke-dasharray: 6 20;
            animation: neuralPulse2 2s ease-in-out 0.4s infinite;
          }
          .np-line3 {
            stroke-dasharray: 6 16;
            animation: neuralPulse3 2s ease-in-out 0.8s infinite;
          }
          .np-node {
            animation: nodeGlow 2s ease-in-out infinite;
          }
          .np-node-d1 { animation-delay: 0s; }
          .np-node-d2 { animation-delay: 0.5s; }
          .np-node-d3 { animation-delay: 1.0s; }
          .np-node-d4 { animation-delay: 1.5s; }
        `}</style>

        {/* Connection lines */}
        <line x1="8" y1="12" x2="20" y2="8" stroke="#a855f7" strokeWidth="1" className="np-line1" />
        <line x1="20" y1="8" x2="32" y2="16" stroke="#a855f7" strokeWidth="1" className="np-line2" />
        <line x1="20" y1="8" x2="16" y2="28" stroke="#a855f7" strokeWidth="1" className="np-line3" />
        <line x1="32" y1="16" x2="28" y2="32" stroke="#a855f7" strokeWidth="1" className="np-line1" />
        <line x1="16" y1="28" x2="28" y2="32" stroke="#a855f7" strokeWidth="1" className="np-line2" />

        {/* Nodes */}
        <circle cx="8" cy="12" r="2.5" fill="#a855f7" className="np-node np-node-d1" />
        <circle cx="20" cy="8" r="3" fill="#a855f7" className="np-node np-node-d2" />
        <circle cx="32" cy="16" r="2.5" fill="#a855f7" className="np-node np-node-d3" />
        <circle cx="16" cy="28" r="2" fill="#a855f7" className="np-node np-node-d4" />
        <circle cx="28" cy="32" r="2.5" fill="#a855f7" className="np-node np-node-d1" />
      </svg>
    </div>
  );
}
