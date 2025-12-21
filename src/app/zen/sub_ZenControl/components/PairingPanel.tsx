'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Unlink, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { useZenStore } from '../../lib/zenStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import {
  generatePairingCode,
  acceptPairing,
  disconnect,
  getMyUrl,
} from '../lib/offloadApi';

/**
 * Pairing Panel Component
 * Handles device pairing for cross-device offloading
 */
export default function PairingPanel() {
  const { mode, pairing, setPairing, clearPairing } = useZenStore();
  const { activeProject } = useActiveProjectStore();

  const [partnerUrl, setPartnerUrl] = useState('');
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const deviceName = typeof window !== 'undefined' ? window.location.hostname : 'Unknown';

  // Generate pairing code (Active device)
  const handleGenerateCode = async () => {
    if (!activeProject?.id) {
      setError('No active project selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await generatePairingCode(activeProject.id, deviceName);
      setPairing({
        status: 'pairing',
        pairingCode: result.pairingCode,
        devicePairId: result.devicePairId,
        projectId: activeProject.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code');
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to partner (Passive device)
  const handleConnect = async () => {
    if (!partnerUrl.trim()) {
      setError('Please enter partner URL');
      return;
    }
    if (!pairingCodeInput.trim()) {
      setError('Please enter pairing code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const myUrl = getMyUrl();
      const result = await acceptPairing(
        partnerUrl.trim(),
        pairingCodeInput.trim(),
        activeProject?.path || '.',
        deviceName,
        myUrl
      );

      setPairing({
        status: 'paired',
        devicePairId: result.devicePairId,
        partnerUrl: partnerUrl.trim(),
        partnerDeviceName: result.partnerDeviceName,
        projectId: result.projectId,
        myUrl,
      });

      // Clear inputs
      setPartnerUrl('');
      setPairingCodeInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!pairing.devicePairId) return;

    setIsLoading(true);
    setError(null);

    try {
      await disconnect(pairing.devicePairId);
      clearPairing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (pairing.pairingCode) {
      navigator.clipboard.writeText(pairing.pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Only show in online mode or when paired
  if (mode === 'offline' && pairing.status === 'unpaired') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Device Pairing</h3>
      </div>

      <AnimatePresence mode="wait">
        {/* Unpaired State */}
        {pairing.status === 'unpaired' && (
          <motion.div
            key="unpaired"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Generate Code Section */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider">
                Generate Code (as Active)
              </label>
              <button
                onClick={handleGenerateCode}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-400 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Generate Pairing Code'
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-xs">OR</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* Connect Section */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider">
                Connect to Partner (as Passive)
              </label>
              <input
                type="text"
                placeholder="Partner URL (e.g., http://192.168.1.50:3000)"
                value={partnerUrl}
                onChange={(e) => setPartnerUrl(e.target.value)}
                className="w-full py-2 px-3 bg-gray-900 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Pairing Code (6 digits)"
                value={pairingCodeInput}
                onChange={(e) => setPairingCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full py-2 px-3 bg-gray-900 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none font-mono text-center tracking-widest"
                maxLength={6}
              />
              <button
                onClick={handleConnect}
                disabled={isLoading || !partnerUrl || !pairingCodeInput}
                className="w-full py-2 px-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded text-blue-400 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Pairing State (waiting for partner) */}
        {pairing.status === 'pairing' && (
          <motion.div
            key="pairing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="text-center py-4">
              <div className="text-3xl font-mono font-bold text-cyan-400 tracking-[0.5em] mb-2">
                {pairing.pairingCode}
              </div>
              <p className="text-xs text-gray-400">
                Share this code with your partner device
              </p>
            </div>

            <button
              onClick={handleCopyCode}
              className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-yellow-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Waiting for partner to connect...
            </div>

            <button
              onClick={clearPairing}
              className="w-full py-2 px-4 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Paired State */}
        {pairing.status === 'paired' && (
          <motion.div
            key="paired"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  Connected to "{pairing.partnerDeviceName || 'Partner'}"
                </div>
                <div className="text-xs text-gray-400">
                  {pairing.partnerUrl}
                </div>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-400 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Unlink className="w-4 h-4" />
                  Disconnect
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 text-red-400 text-xs"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
