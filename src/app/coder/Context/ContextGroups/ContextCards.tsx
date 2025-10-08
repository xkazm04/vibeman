import { Plus, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import EnhancedContextEditModal from '../ContextMenu/EnhancedContextEditModal';
import ContextJailCard from './ContextJailCard';

type Props = {
    contexts: any[];
    group: any;
    availableGroups: any[];
    selectedFilePaths: string[];
    showFullScreenModal: (title: string, content: React.ReactNode, options?: any) => void;
}

const ContextCards = ({ contexts, group, availableGroups, selectedFilePaths, showFullScreenModal }: Props) => {
    // Dynamic layout and font sizing based on context count
    const getLayoutConfig = () => {
        const count = contexts.length;
        if (count === 1) return {
            gridCols: 'grid-cols-1',
            cellHeight: 'h-64',
            fontSize: 'text-4xl',
            showDividers: false
        };
        if (count === 2) return {
            gridCols: 'grid-cols-2',
            cellHeight: 'h-64',
            fontSize: 'text-2xl',
            showDividers: true
        };
        if (count <= 4) return {
            gridCols: 'grid-cols-2',
            cellHeight: 'h-32',
            fontSize: 'text-lg',
            showDividers: true
        };
        return {
            gridCols: 'grid-cols-3',
            cellHeight: 'h-28',
            fontSize: 'text-base',
            showDividers: true
        };
    };

    const layout = getLayoutConfig();

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="relative"
        >
            {contexts.length === 0 ? (
                // Empty State
                <motion.div
                    className="flex flex-col items-center justify-center py-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="relative mb-6">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-sm border"
                            style={{
                                backgroundColor: `${group?.color}10`,
                                borderColor: `${group?.color}30`
                            }}
                        >
                            <Plus
                                className="w-10 h-10"
                                style={{ color: `${group?.color}` }}
                            />
                        </div>
                        <motion.div
                            className="absolute -inset-2 rounded-2xl opacity-50"
                            style={{
                                background: `linear-gradient(45deg, ${group?.color}20, transparent, ${group?.color}20)`,
                                filter: 'blur(12px)',
                            }}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>

                    <div className="text-center space-y-4">
                        <p className="text-lg font-semibold bg-gradient-to-r bg-clip-text text-transparent font-mono"
                            style={{ backgroundImage: `linear-gradient(to right, ${group?.color}, ${group?.color}80)` }}>
                            Neural Cluster Ready
                        </p>
                        <p className="text-sm text-gray-500 max-w-64 font-mono">
                            Initialize context nodes or transfer existing data streams
                        </p>

                        {selectedFilePaths.length > 0 && (
                            <motion.button
                                onClick={() => {
                                    showFullScreenModal(
                                        'Create New Context',
                                        <EnhancedContextEditModal
                                            availableGroups={availableGroups}
                                            selectedFilePaths={selectedFilePaths}
                                        />,
                                        {
                                            icon: Save,
                                            iconBgColor: "from-cyan-500/20 to-blue-500/20",
                                            iconColor: "text-cyan-400",
                                            maxWidth: "max-w-6xl",
                                            maxHeight: "max-h-[90vh]"
                                        }
                                    );
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 transition-all border border-cyan-500/30 backdrop-blur-sm"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Save className="w-4 h-4" />
                                <span className="text-sm font-medium font-mono">Initialize ({selectedFilePaths.length} nodes)</span>
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            ) : (
                // Jail-Door Structure
                <div className="p-4">
                    <div className={`grid gap-0 ${layout.gridCols} ${layout.cellHeight} relative`}>
                        {contexts.map((context, index) => (
                            <div key={context.id} className="relative">
                                <ContextJailCard
                                    context={context}
                                    group={group}
                                    index={index}
                                    fontSize={layout.fontSize}
                                    availableGroups={availableGroups}
                                    selectedFilePaths={selectedFilePaths}
                                />

                                {/* Dividers between cells */}
                                {layout.showDividers && (
                                    <>
                                        {/* Vertical divider */}
                                        {index % (layout.gridCols === 'grid-cols-2' ? 2 : 3) !== (layout.gridCols === 'grid-cols-2' ? 1 : 2) && (
                                            <motion.div
                                                className="absolute top-2 -right-px w-px h-[calc(100%-16px)] bg-gradient-to-b from-transparent via-gray-600/60 to-transparent"
                                                style={{
                                                    background: `linear-gradient(to bottom, transparent, ${group?.color}60, transparent)`
                                                }}
                                                initial={{ scaleY: 0 }}
                                                animate={{ scaleY: 1 }}
                                                transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
                                            />
                                        )}

                                        {/* Horizontal divider */}
                                        {index < contexts.length - (layout.gridCols === 'grid-cols-2' ? 2 : 3) && (
                                            <motion.div
                                                className="absolute -bottom-px left-2 w-[calc(100%-16px)] h-px bg-gradient-to-r from-transparent via-gray-600/60 to-transparent"
                                                style={{
                                                    background: `linear-gradient(to right, transparent, ${group?.color}60, transparent)`
                                                }}
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ delay: index * 0.1 + 0.6, duration: 0.3 }}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ContextCards;