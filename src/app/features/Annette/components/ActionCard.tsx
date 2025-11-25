import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

interface ActionCardProps {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    delay?: number;
}

export default function ActionCard({ title, description, actionLabel = 'Execute', onAction, delay = 0 }: ActionCardProps) {
    const { getThemeConfig } = useThemeStore();
    const themeConfig = getThemeConfig();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 transition-all cursor-pointer"
            onClick={onAction}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 group-hover:via-cyan-500/10 transition-all duration-500" />

            <div className="relative p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                    <Play className="w-3 h-3 text-cyan-400 fill-cyan-400/20" />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{title}</h4>
                    {description && (
                        <p className="text-xs text-gray-500 truncate">{description}</p>
                    )}
                </div>

                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-all" />
            </div>
        </motion.div>
    );
}
