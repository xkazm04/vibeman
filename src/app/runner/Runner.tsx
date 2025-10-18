'use client';

import { useEffect, useState } from 'react';
import { StandalonePreviewLever } from './components/StandalonePreviewLever';
import EmergencyKillModal from './components/EmergencyKillModal';
import CompactSystemLogs from './components/CompactSystemLogs';

import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

import { RefreshCcw, Skull } from 'lucide-react';
import VoicebotPillar from '@/app/voicebot/VoicebotPillar';
import LogoSvg from "@/components/LogoSvg";
import { motion } from "framer-motion";
import { useChargingLevel } from "@/hooks/useChargingLevel";

export default function Runner() {
  const {
    fetchStatuses,
    forceRefresh,
    startServer,
    stopServer,
    processes
  } = useServerProjectStore();

  const {
    projects,
    initializeProjects
  } = useProjectConfigStore();

  const chargingLevel = useChargingLevel();

  const [showEmergencyKill, setShowEmergencyKill] = useState(false);

  const disabled = false

  useEffect(() => {
    const initProjects = async () => {
      try {
        await initializeProjects();
      } catch (error) {
        console.error('Runner: Failed to initialize projects:', error);
      }
    };

    initProjects();
  }, [initializeProjects]);

  // Fetch statuses periodically
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchWithCheck = async () => {
      if (isMounted) {
        console.log('Runner: Fetching statuses...');
        await fetchStatuses();
        console.log('Runner: Statuses fetched');
      }
    };

    fetchWithCheck();
    intervalId = setInterval(fetchWithCheck, 50000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchStatuses]);

  // Color interpolation based on charging level
  const getInterpolatedColor = (startColor: string, endColor: string, progress: number) => {
    const start = parseInt(startColor.slice(1), 16);
    const end = parseInt(endColor.slice(1), 16);

    const startR = (start >> 16) & 255;
    const startG = (start >> 8) & 255;
    const startB = start & 255;

    const endR = (end >> 16) & 255;
    const endG = (end >> 8) & 255;
    const endB = end & 255;

    const r = Math.round(startR + (endR - startR) * progress);
    const g = Math.round(startG + (endG - startG) * progress);
    const b = Math.round(startB + (endB - startB) * progress);

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Calculate colors based on charging level (0-100)
  const progress = chargingLevel / 100;
  const fillColor = getInterpolatedColor("#F5F5F5", "#FF3E3E", progress);
  const borderColor = getInterpolatedColor("#E5E5E5", "#6B1515", progress);

  // Calculate shadow intensity based on charging level
  const shadowIntensity = Math.round(chargingLevel / 100 * 20);
  const shadowColor = getInterpolatedColor("#000000", "#FF3E3E", progress * 0.7);

  const handleEmergencyRefresh = async () => {
    try {
      await forceRefresh();
      await initializeProjects();
    } catch (error) {
      console.error('Emergency refresh failed:', error);
    }
  };

  const handleToggleServer = async (projectId: string) => {
    const status = processes[projectId];
    const isRunning = status?.status === 'running';

    try {
      if (isRunning) {
        await stopServer(projectId);
      } else {
        await startServer(projectId);
      }
    } catch (error) {
      console.error('Failed to toggle server:', error);
    }
  };

  return (
    <>
      <div className="w-full bg-gradient-to-r from-gray-950 via-indigo-950/30 to-purple-950/20 border-b border-gray-800/50 shadow-2xl backdrop-blur-xl">
        {/* Neural Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-indigo-500/5 to-purple-500/5" />

        {/* Animated Grid Pattern */}
        <motion.div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '30px 30px'],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Logo Section */}
        <div className="flex absolute top-0 right-[25%] items-center space-x-4 mb-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: chargingLevel > 0 ? 1.02 + (chargingLevel / 100) * 0.03 : 1,
              filter: `drop-shadow(0 0 ${shadowIntensity}px ${shadowColor}${Math.round(progress * 255).toString(16).padStart(2, '0')})`
            }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
              duration: 2,
              scale: { duration: 0.5, ease: "easeInOut" },
              filter: { duration: 0.3, ease: "easeInOut" }
            }}
            style={{
              filter: `drop-shadow(0 0 ${shadowIntensity}px ${shadowColor}${Math.round(progress * 255).toString(16).padStart(2, '0')})`
            }}
          >
            <LogoSvg width={180} fillColor={fillColor} borderColor={borderColor} chargingLevel={chargingLevel} />
          </motion.div>
        </div>

        {/* Emergency Actions - Fixed Position */}
        <div className="fixed top-4 left-4 z-50 flex items-center space-x-2">
          <motion.button
            onClick={() => setShowEmergencyKill(true)}
            title="Emergency Neural Shutdown"
            className="p-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 rounded-xl hover:from-red-500/30 hover:to-orange-500/30 transition-all border border-red-500/30 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Skull className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={handleEmergencyRefresh}
            title="Force Neural Refresh"
            className="p-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 rounded-xl hover:from-blue-500/30 hover:to-cyan-500/30 transition-all border border-blue-500/30 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCcw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Main Header Bar */}
        <div className="relative px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: System Logs and Controls */}
            <div className="flex items-center space-x-6 flex-1">
              {/* Expanded System Logs */}
              <div className="flex-1 max-w-2xl">
                <CompactSystemLogs />
              </div>

              {/* Standalone Preview Lever */}
              <div className="ml-4 pl-4 border-l border-gray-700/50">
                <StandalonePreviewLever />
              </div>

              {disabled && (
                <motion.div
                  className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <span className="text-yellow-400 font-mono text-sm">LOCALHOST MODE</span>
                </motion.div>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* Emergency Kill Modal */}
      <EmergencyKillModal
        isOpen={showEmergencyKill}
        onClose={() => setShowEmergencyKill(false)}
        onRefresh={handleEmergencyRefresh}
      />

      {/* Voicebot Pillar */}
      <VoicebotPillar disabled={disabled} />
    </>
  );
} 