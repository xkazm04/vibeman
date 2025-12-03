'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import { useDeveloperMindMeldStore } from '@/stores/developerMindMeldStore';

interface PredictionBadgeProps {
  projectId: string;
  idea: {
    id: string;
    scanType: string;
    category: string;
    effort: number | null;
    impact: number | null;
  };
  showDetails?: boolean;
}

interface Prediction {
  willAccept: boolean;
  confidence: number;
  reasoning: string;
  basedOn: {
    scanTypeMatch: number;
    categoryMatch: number;
    effortImpactMatch: number;
  };
}

export default function PredictionBadge({ projectId, idea, showDetails = false }: PredictionBadgeProps) {
  const { isEnabled } = useDeveloperMindMeldStore();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isEnabled) return;

    const fetchPrediction = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/developer-mind-meld/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, idea }),
        });
        const data = await response.json();
        if (data.prediction) {
          setPrediction(data.prediction);
        }
      } catch (error) {
        console.error('Failed to fetch prediction:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrediction();
  }, [projectId, idea.id, isEnabled]);

  if (!isEnabled || isLoading) {
    return null;
  }

  if (!prediction || prediction.confidence < 30) {
    return null; // Don't show low confidence predictions
  }

  const getConfidenceColor = () => {
    if (prediction.confidence >= 70) {
      return prediction.willAccept
        ? { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' }
        : { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
    }
    return { bg: 'bg-gray-700/50', border: 'border-gray-600/30', text: 'text-gray-400' };
  };

  const colors = getConfidenceColor();

  if (!showDetails) {
    // Compact badge
    return (
      <motion.div
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${colors.bg} ${colors.border} border`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        title={prediction.reasoning}
        data-testid={`prediction-badge-${idea.id}`}
      >
        {prediction.willAccept ? (
          <ThumbsUp className={`w-2.5 h-2.5 ${colors.text}`} />
        ) : (
          <ThumbsDown className={`w-2.5 h-2.5 ${colors.text}`} />
        )}
        <span className={`text-[9px] font-mono ${colors.text}`}>{prediction.confidence}%</span>
      </motion.div>
    );
  }

  // Detailed view
  return (
    <motion.div
      className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid={`prediction-details-${idea.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Brain className={`w-4 h-4 ${colors.text}`} />
        <span className={`text-sm font-medium ${colors.text}`}>
          AI Prediction: {prediction.willAccept ? 'Likely Accept' : 'Likely Skip'}
        </span>
        <span className={`text-xs font-mono ${colors.text}`}>({prediction.confidence}%)</span>
      </div>
      <p className="text-xs text-gray-400 mb-2">{prediction.reasoning}</p>
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span>Scan: {Math.round(prediction.basedOn.scanTypeMatch)}%</span>
        <span>Category: {Math.round(prediction.basedOn.categoryMatch)}%</span>
        <span>Effort/Impact: {Math.round(prediction.basedOn.effortImpactMatch)}%</span>
      </div>
    </motion.div>
  );
}
