'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnnetteTheme } from '../components/AnnettePanel';

interface VoiceVisualizerProps {
  isActive: boolean;
  theme: AnnetteTheme;
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
}

interface WaveformSegment {
  amplitude: number;
  frequency: number;
  timestamp: number;
}

interface TooltipData {
  x: number;
  y: number;
  speakingRate: number; // words per minute estimate
  loudness: number; // amplitude percentage
  segment: number;
}

const THEME_GRADIENTS = {
  phantom: {
    low: '#9333ea', // purple-600
    mid: '#a855f7', // purple-500
    high: '#e879f9', // fuchsia-400
  },
  midnight: {
    low: '#2563eb', // blue-600
    mid: '#06b6d4', // cyan-500
    high: '#67e8f9', // cyan-300
  },
  shadow: {
    low: '#dc2626', // red-600
    mid: '#f43f5e', // rose-500
    high: '#f9a8d4', // pink-300
  },
};

// Helper function to convert hex color to RGB object
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
};

// Helper to interpolate between two hex colors
const interpolateColor = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
};

// Helper to add alpha transparency to RGB color
const addAlphaToRgb = (rgbString: string, alpha: number): string => {
  // Extract r, g, b values from "rgb(r, g, b)" string
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }
  return rgbString; // Fallback if parsing fails
};

// Calculate color based on amplitude (0-1)
const getColorForAmplitude = (amplitude: number, colors: typeof THEME_GRADIENTS.phantom): string => {
  if (amplitude < 0.33) {
    // Low amplitude - interpolate between low and mid
    const t = amplitude / 0.33;
    return interpolateColor(colors.low, colors.mid, t);
  } else if (amplitude < 0.66) {
    // Mid amplitude - interpolate between mid and high
    const t = (amplitude - 0.33) / 0.33;
    return interpolateColor(colors.mid, colors.high, t);
  } else {
    // High amplitude - stay at high color with intensity
    const t = (amplitude - 0.66) / 0.34;
    return interpolateColor(colors.high, '#ffffff', t * 0.3);
  }
};

export default function VoiceVisualizer({
  isActive,
  theme,
  audioContext,
  analyser
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [waveformHistory, setWaveformHistory] = useState<WaveformSegment[]>([]);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  const colors = THEME_GRADIENTS[theme];
  const barCount = 32; // More bars for smoother gradient
  const barWidth = 3;
  const barGap = 1;

  // Draw waveform
  const drawWaveform = (dataArray: Uint8Array, bufferLength: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate bar dimensions
    const totalWidth = barCount * (barWidth + barGap) - barGap;
    const startX = (width - totalWidth) / 2;

    // Draw each bar
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * bufferLength);
      const amplitude = dataArray[dataIndex] / 255; // Normalize to 0-1

      const barHeight = amplitude * height * 0.8; // Use 80% of height
      const x = startX + i * (barWidth + barGap);
      const y = height - barHeight;

      // Get color based on amplitude
      const color = getColorForAmplitude(amplitude, colors);

      // Draw bar with gradient
      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, addAlphaToRgb(color, 0.53)); // Add transparency at bottom (0x88 ≈ 0.53)

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Add glow effect for high amplitude
      if (amplitude > 0.7) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.shadowBlur = 0;
      }
    }

    // Store waveform data for speaking rate analysis
    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 100) { // Sample every 100ms
      const avgAmplitude = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;
      const avgFrequency = Math.sqrt(dataArray.reduce((a, b) => a + b * b, 0) / bufferLength);

      setWaveformHistory(prev => {
        const newHistory = [...prev, { amplitude: avgAmplitude, frequency: avgFrequency, timestamp: now }];
        // Keep only last 30 samples (3 seconds at 100ms intervals)
        return newHistory.slice(-30);
      });

      lastUpdateTimeRef.current = now;
    }
  };

  // Animation loop
  useEffect(() => {
    if (!isActive || !analyser) {
      // Draw idle state
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          // Draw minimal idle bars
          const totalWidth = barCount * (barWidth + barGap) - barGap;
          const startX = (width - totalWidth) / 2;

          for (let i = 0; i < barCount; i++) {
            const idleHeight = 4;
            const x = startX + i * (barWidth + barGap);
            const y = height - idleHeight;

            // Convert hex to rgba with alpha (0x33 ≈ 0.2)
            const rgb = hexToRgb(colors.low);
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
            ctx.fillRect(x, y, barWidth, idleHeight);
          }
        }
      }
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      drawWaveform(dataArray, bufferLength);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, analyser, theme]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || waveformHistory.length === 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate which segment was hovered
    const canvas = canvasRef.current;
    if (!canvas) return;

    const totalWidth = barCount * (barWidth + barGap) - barGap;
    const startX = (canvas.width - totalWidth) / 2;
    const relativeX = x - startX;

    if (relativeX < 0 || relativeX > totalWidth) {
      setTooltipData(null);
      return;
    }

    const segment = Math.floor(relativeX / (barWidth + barGap));

    // Calculate speaking rate from waveform history
    // Speaking rate estimation: count peaks in amplitude
    const peaks = waveformHistory.filter((seg, idx) => {
      if (idx === 0 || idx === waveformHistory.length - 1) return false;
      return seg.amplitude > waveformHistory[idx - 1].amplitude &&
             seg.amplitude > waveformHistory[idx + 1].amplitude &&
             seg.amplitude > 0.3; // Threshold for significant peaks
    }).length;

    const durationSeconds = waveformHistory.length * 0.1; // 100ms samples
    const speakingRate = Math.round((peaks / durationSeconds) * 60 * 2.5); // Estimate WPM

    // Get current loudness from latest sample
    const loudness = Math.round((waveformHistory[waveformHistory.length - 1]?.amplitude || 0) * 100);

    setTooltipData({
      x: e.clientX,
      y: e.clientY,
      speakingRate: Math.min(speakingRate, 250), // Cap at reasonable max
      loudness,
      segment,
    });
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        data-testid="voice-visualizer"
      >
        <canvas
          ref={canvasRef}
          width={barCount * (barWidth + barGap)}
          height={32}
          className="w-full h-full"
        />

        {/* Segment highlight overlay */}
        {tooltipData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div
              className="absolute h-full bg-white/10 backdrop-blur-sm"
              style={{
                left: `${(tooltipData.segment / barCount) * 100}%`,
                width: `${(1 / barCount) * 100}%`,
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltipData.x,
              top: tooltipData.y - 80,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg px-3 py-2 shadow-2xl">
              {/* Arrow pointer */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-700/50" />
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                {/* Speaking Rate */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400 font-mono">Rate:</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-bold ${tooltipData.speakingRate > 150 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                      {tooltipData.speakingRate}
                    </span>
                    <span className="text-xs text-gray-500">WPM</span>
                  </div>
                </div>

                {/* Loudness */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400 font-mono">Volume:</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-bold ${
                      tooltipData.loudness > 70 ? 'text-red-400' :
                      tooltipData.loudness > 40 ? 'text-green-400' :
                      'text-blue-400'
                    }`}>
                      {tooltipData.loudness}
                    </span>
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>

                {/* Visual indicator bars */}
                <div className="mt-1 pt-1.5 border-t border-gray-700/30 space-y-1">
                  {/* Rate indicator */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((tooltipData.speakingRate / 200) * 100, 100)}%` }}
                        className={`h-full ${
                          tooltipData.speakingRate > 150 ? 'bg-yellow-500' : 'bg-cyan-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Volume indicator */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tooltipData.loudness}%` }}
                        className={`h-full ${
                          tooltipData.loudness > 70 ? 'bg-red-500' :
                          tooltipData.loudness > 40 ? 'bg-green-500' :
                          'bg-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
