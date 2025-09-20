'use client';

import { useEffect, useState } from 'react';
import RunnerSwitch from '@/app/runner/components/RunnerSwitch';
import { StandalonePreviewLever } from './components/StandalonePreviewLever';
import EmergencyKillModal from './components/EmergencyKillModal';

import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import RunnerRightPanel from './components/RunnerRightPanel';
import { RefreshCcw, Skull } from 'lucide-react';
import VoicebotPillar from '@/app/voicebot/VoicebotPillar';
import LogoSvg from "@/components/LogoSvg";
import { motion } from "framer-motion";
import { useChargingLevel } from "@/hooks/useChargingLevel";

export default function Runner() {
  const {
    fetchStatuses,
    forceRefresh
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

  return (
    <>
      <div className="w-full bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-gray-800 shadow-lg">
        {/* Logo Section */}
        <div className="flex absolute top-0 right-[30%] items-center space-x-4 mb-4">
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
            <LogoSvg width={200} fillColor={fillColor} borderColor={borderColor} chargingLevel={chargingLevel} />
          </motion.div>
        </div>
        {/* Main Header Bar */}
        <div className="px-6 pr-[10%] py-3">
          <div className="flex items-center justify-between pl-10">
            {/* Left: Logo and Controls */}
            <div className="p-3">
              {disabled && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 font-sans">Localhost only</span>
                </div>
              )}
              <div className={`flex overflow-hidden items-center space-x-3 pb-2
                ${disabled && 'opacity-50'}`}>
                {projects.map((project, index) => (
                  <RunnerSwitch
                    key={project.id || `project-${index}`}
                    project={project}
                    index={index}
                    disabled={disabled}
                  />
                ))}

                {/* Standalone Preview Lever with spacing */}
                <div className="ml-6 border-l border-gray-700 pl-6">
                  <StandalonePreviewLever />
                </div>
              </div>

              {/* Emergency actions */}
              <div className="flex absolute left-2 top-0 items-center space-x-2 mt-2">
                <button
                  onClick={() => setShowEmergencyKill(true)}
                  title="Emergency Kill"
                  className="text-xs px-2 py-1 cursor-pointer text-orange-400 border border-orange-600/10 rounded hover:bg-orange-600/30 transition-colors"
                >
                  <Skull size={16} />
                </button>
                <button
                  onClick={handleEmergencyRefresh}
                  title="Force Refresh"
                  className="text-xs px-2 py-1 cursor-pointer text-blue-400 border border-blue-600/10 rounded hover:bg-blue-600/30 transition-colors"
                >
                  <RefreshCcw size={16} />
                </button>
              </div>
            </div>

            {/* Right: Controls */}
            <RunnerRightPanel />
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