/**
 * Target Inputs Component
 *
 * Contains the target/goal and fulfillment/progress text areas
 */

import React from 'react';

interface TargetInputsProps {
  target: string;
  fulfillment: string;
  isGenerating: boolean;
  onTargetChange: (value: string) => void;
  onFulfillmentChange: (value: string) => void;
}

export default function TargetInputs({
  target,
  fulfillment,
  isGenerating,
  onTargetChange,
  onFulfillmentChange,
}: TargetInputsProps) {
  return (
    <div className="space-y-5">
      {/* Target Input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider ml-1">
          Target / Goal
        </label>
        <textarea
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
          placeholder="What is the strategic vision for this context? What user value and productivity gains should it deliver?"
          disabled={isGenerating}
          className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none h-24 custom-scrollbar ${
            isGenerating ? 'opacity-50 cursor-wait' : ''
          }`}
          autoFocus={!isGenerating}
        />
        <p className="text-xs text-gray-500 ml-1">
          Describe the ambitious vision: business value, user productivity gains, and strategic direction
        </p>
      </div>

      {/* Fulfillment Input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider ml-1">
          Current Progress / Fulfillment
        </label>
        <textarea
          value={fulfillment}
          onChange={(e) => onFulfillmentChange(e.target.value)}
          placeholder="How far along is this context? What's implemented, what's working well, and what's the next priority?"
          disabled={isGenerating}
          className={`w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none h-24 custom-scrollbar ${
            isGenerating ? 'opacity-50 cursor-wait' : ''
          }`}
        />
        <p className="text-xs text-gray-500 ml-1">
          Honestly assess current state: maturity level, what's done, and immediate opportunities
        </p>
      </div>
    </div>
  );
}
