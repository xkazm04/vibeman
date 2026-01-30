'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  SkipForward,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import DirectionCardRemote from './DirectionCardRemote';
import { useRemoteTriage } from '../hooks/useRemoteTriage';

interface RemoteTriagePanelProps {
  targetDeviceId: string | null;
  targetDeviceName?: string;
}

export default function RemoteTriagePanel({
  targetDeviceId,
  targetDeviceName,
}: RemoteTriagePanelProps) {
  const {
    directions,
    isLoading,
    error,
    triageStats,
    fetchDirections,
    acceptDirection,
    rejectDirection,
    skipDirection,
    clearError,
  } = useRemoteTriage(targetDeviceId);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch directions when target device changes
  useEffect(() => {
    if (targetDeviceId) {
      fetchDirections();
      setCurrentIndex(0);
    }
  }, [targetDeviceId, fetchDirections]);

  const currentDirection = directions[currentIndex];

  // Handle accept swipe
  const handleAccept = useCallback(async () => {
    if (!currentDirection || processingId) return;

    setProcessingId(currentDirection.id);
    const success = await acceptDirection(currentDirection.id);
    setProcessingId(null);

    if (success) {
      // Direction is removed from store, currentIndex stays same
      // (pointing to next card which shifted into position)
    }
  }, [currentDirection, processingId, acceptDirection]);

  // Handle reject swipe
  const handleReject = useCallback(async () => {
    if (!currentDirection || processingId) return;

    setProcessingId(currentDirection.id);
    const success = await rejectDirection(currentDirection.id);
    setProcessingId(null);
  }, [currentDirection, processingId, rejectDirection]);

  // Handle skip swipe
  const handleSkip = useCallback(() => {
    if (!currentDirection || processingId) return;
    skipDirection(currentDirection.id);
  }, [currentDirection, processingId, skipDirection]);

  // No device selected
  if (!targetDeviceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Sparkles className="w-10 h-10 text-gray-600 mb-3" />
        <p className="text-sm text-gray-400">Select a target device to triage directions</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-400">
          Fetching directions from <span className="text-purple-300">{targetDeviceName}</span>...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-sm text-red-400 mb-3">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={clearError}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
          >
            Dismiss
          </button>
          <button
            onClick={fetchDirections}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // All done state
  if (directions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 bg-green-500/10 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-200 mb-2">All caught up!</h3>
        <p className="text-sm text-gray-400 mb-4">
          No pending directions from <span className="text-purple-300">{targetDeviceName}</span>
        </p>

        {/* Stats */}
        {triageStats.reviewed > 0 && (
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5 text-green-400">
              <Check className="w-3 h-3" />
              <span>{triageStats.accepted} accepted</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-400">
              <X className="w-3 h-3" />
              <span>{triageStats.rejected} rejected</span>
            </div>
          </div>
        )}

        <button
          onClick={fetchDirections}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Check for new directions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">
            {directions.length} pending
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1 text-green-400">
              <Check className="w-3 h-3" />
              {triageStats.accepted}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <X className="w-3 h-3" />
              {triageStats.rejected}
            </span>
          </div>
        </div>
        <button
          onClick={fetchDirections}
          disabled={isLoading}
          className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Card Stack */}
      <div className="relative h-[320px]">
        <AnimatePresence mode="popLayout">
          {directions.slice(0, 3).map((direction, index) => (
            <DirectionCardRemote
              key={direction.id}
              direction={direction}
              onSwipeRight={index === 0 ? handleAccept : () => {}}
              onSwipeLeft={index === 0 ? handleReject : () => {}}
              onSwipeDown={index === 0 ? handleSkip : undefined}
              isProcessing={processingId === direction.id}
              style={{
                zIndex: 3 - index,
                scale: 1 - index * 0.02,
                y: index * 8,
                opacity: index === 0 ? 1 : 0.7 - index * 0.2,
                pointerEvents: index === 0 ? 'auto' : 'none',
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={handleReject}
          disabled={!currentDirection || !!processingId}
          className="flex flex-col items-center gap-1 p-3 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XCircle className="w-6 h-6" />
        </button>

        <button
          onClick={handleSkip}
          disabled={!currentDirection || !!processingId}
          className="flex flex-col items-center gap-1 p-2 rounded-full bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 text-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <button
          onClick={handleAccept}
          disabled={!currentDirection || !!processingId}
          className="flex flex-col items-center gap-1 p-3 rounded-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Hint */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600">
        <span>Swipe left: reject</span>
        <span>Swipe down: skip</span>
        <span>Swipe right: accept</span>
      </div>
    </div>
  );
}
