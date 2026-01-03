'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Copy,
  Check,
  Loader2,
  Link2,
  Link2Off,
  RefreshCw,
} from 'lucide-react';

interface SupabasePairingPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  pairingStatus: 'unpaired' | 'waiting' | 'paired';
  pairingCode: string | null;
  partnerName: string | null;
  onConnect: () => Promise<boolean>;
  onGenerateCode: () => Promise<string | null>;
  onPairWithCode: (code: string) => Promise<boolean>;
  onUnpair: () => Promise<void>;
}

export default function SupabasePairingPanel({
  isConnected,
  isConnecting,
  connectionError,
  pairingStatus,
  pairingCode,
  partnerName,
  onConnect,
  onGenerateCode,
  onPairWithCode,
  onUnpair,
}: SupabasePairingPanelProps) {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateCode = async () => {
    await onGenerateCode();
  };

  const handlePairWithCode = async () => {
    if (inputCode.length !== 6) {
      setPairError('Code must be 6 digits');
      return;
    }

    setIsPairing(true);
    setPairError(null);

    try {
      const success = await onPairWithCode(inputCode);
      if (!success) {
        setPairError('Invalid or expired code');
      } else {
        setInputCode('');
      }
    } catch {
      setPairError('Failed to pair');
    }

    setIsPairing(false);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-400">Cross-Device Sync</span>
          </div>
        </div>

        {connectionError && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            {connectionError}
          </div>
        )}

        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded text-sm font-medium text-cyan-400 disabled:opacity-50 transition-all"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span>Connect to Supabase</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Paired state
  if (pairingStatus === 'paired') {
    return (
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Paired</span>
          </div>
          <button
            onClick={onUnpair}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            title="Disconnect"
          >
            <Link2Off className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>

        <div className="text-center py-2">
          <p className="text-sm text-gray-300">
            Connected to{' '}
            <span className="text-green-400 font-medium">{partnerName || 'Partner Device'}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tasks can be offloaded between devices
          </p>
        </div>
      </div>
    );
  }

  // Waiting for pair (has code)
  if (pairingStatus === 'waiting' && pairingCode) {
    return (
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Waiting for Pair</span>
          </div>
          <button
            onClick={handleGenerateCode}
            className="p-1.5 hover:bg-cyan-500/20 rounded transition-colors"
            title="Generate new code"
          >
            <RefreshCw className="w-4 h-4 text-gray-400 hover:text-cyan-400" />
          </button>
        </div>

        <div className="text-center py-4">
          <p className="text-xs text-gray-400 mb-2">Your pairing code:</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-mono font-bold tracking-widest text-white">
              {pairingCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter this code on another device to pair
          </p>
        </div>

        <div className="border-t border-gray-700 pt-3 mt-3">
          <p className="text-xs text-gray-400 mb-2 text-center">Or enter a code:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setInputCode(val);
                setPairError(null);
              }}
              placeholder="000000"
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-center font-mono text-lg tracking-widest focus:border-cyan-500 focus:outline-none"
              maxLength={6}
            />
            <button
              onClick={handlePairWithCode}
              disabled={inputCode.length !== 6 || isPairing}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-sm font-medium text-cyan-400 disabled:opacity-50 transition-all"
            >
              {isPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pair'}
            </button>
          </div>
          {pairError && (
            <p className="text-xs text-red-400 mt-1 text-center">{pairError}</p>
          )}
        </div>
      </div>
    );
  }

  // Unpaired - show options to generate or enter code
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">Cross-Device Sync</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">Online</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleGenerateCode}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded text-sm font-medium text-cyan-400 transition-all"
        >
          <Link2 className="w-4 h-4" />
          <span>Generate Pairing Code</span>
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-gray-800 text-gray-500">or enter a code</span>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setInputCode(val);
              setPairError(null);
            }}
            placeholder="Enter 6-digit code"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-center font-mono tracking-widest focus:border-cyan-500 focus:outline-none"
            maxLength={6}
          />
          <button
            onClick={handlePairWithCode}
            disabled={inputCode.length !== 6 || isPairing}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-sm font-medium text-cyan-400 disabled:opacity-50 transition-all"
          >
            {isPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pair'}
          </button>
        </div>
        {pairError && (
          <p className="text-xs text-red-400 text-center">{pairError}</p>
        )}
      </div>
    </div>
  );
}
