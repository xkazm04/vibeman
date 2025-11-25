import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

interface Event {
    id: string;
    title: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
    created_at: string;
}

interface LiveEventTickerProps {
    projectId: string | null;
}

export default function LiveEventTicker({ projectId }: LiveEventTickerProps) {
    const [events, setEvents] = useState<Event[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { getThemeConfig } = useThemeStore();
    const themeConfig = getThemeConfig();

    useEffect(() => {
        if (!projectId) return;

        const fetchEvents = async () => {
            try {
                // In a real implementation, this would call an API endpoint
                // For now, we'll simulate fetching or use a direct DB call if possible via API
                // Assuming an API endpoint exists or we mock it
                const response = await fetch(`/api/kiro/events?projectId=${projectId}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.events) {
                        setEvents(data.events);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch events', error);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 10000); // Poll every 10s

        return () => clearInterval(interval);
    }, [projectId]);

    useEffect(() => {
        if (events.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % events.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [events.length]);

    if (!projectId || events.length === 0) return null;

    const currentEvent = events[currentIndex];

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-3 h-3 text-emerald-400" />;
            case 'error': return <XCircle className="w-3 h-3 text-red-400" />;
            case 'warning': return <AlertTriangle className="w-3 h-3 text-amber-400" />;
            default: return <Info className="w-3 h-3 text-cyan-400" />;
        }
    };

    return (
        <div className="w-full h-8 bg-black/20 backdrop-blur-sm border-t border-white/5 flex items-center px-4 overflow-hidden">
            <div className="flex items-center gap-2 mr-4">
                <Bell className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Live Feed</span>
            </div>

            <div className="flex-1 relative h-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentEvent.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="absolute inset-0 flex items-center gap-2"
                    >
                        {getIcon(currentEvent.type)}
                        <span className="text-xs text-gray-300 truncate font-light">
                            {currentEvent.title}
                        </span>
                        <span className="text-[10px] text-gray-600 ml-auto font-mono">
                            {new Date(currentEvent.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
