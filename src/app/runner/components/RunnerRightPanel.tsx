import LogoSvg from "@/components/LogoSvg";
import { motion } from "framer-motion"
import { useChargingLevel } from "@/hooks/useChargingLevel"
import { useEffect } from "react"
import { useServerProjectStore } from "@/stores/serverProjectStore"
import { useProjectConfigStore } from "@/stores/projectConfigStore"

type Props = {
    disabled: boolean;
}

// NOTE: Project Settings and Add Project buttons have been moved to ProjectsLayout
// This component now only handles the LogoSvg display with charging level visualization

const RunnerRightPanel = ({ disabled }: Props) => {
    const chargingLevel = useChargingLevel();
    
    // Direct store access for debugging
    const processes = useServerProjectStore(state => state.processes);
    const projects = useProjectConfigStore(state => state.projects);
    
    // Debug effect to track charging level changes
    useEffect(() => {
        console.log('RunnerRightPanel: charging level updated to:', chargingLevel);
        console.log('RunnerRightPanel: Raw store data:', {
            processesCount: Object.keys(processes).length,
            projectsCount: projects.length,
            processStatuses: Object.entries(processes).map(([id, proc]) => ({
                id,
                status: proc.status
            }))
        });
    }, [chargingLevel, processes, projects]);
    
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
    const fillColor = getInterpolatedColor("#F5F5F5", "#FF3E3E", progress); // Light gray to red
    const borderColor = getInterpolatedColor("#E5E5E5", "#6B1515", progress); // Light gray to dark red
    
    // Calculate shadow intensity based on charging level
    const shadowIntensity = Math.round(chargingLevel / 100 * 20); // 0 to 20
    const shadowColor = getInterpolatedColor("#000000", "#FF3E3E", progress * 0.7); // Black to red shadow
    
    return (
        <div className="flex items-center space-x-2">
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
            
            {/* Project management buttons moved to ProjectsLayout */}
            {/* Use ProjectsLayout component for unified project management interface */}
        </div>
    );
}

export default RunnerRightPanel;
