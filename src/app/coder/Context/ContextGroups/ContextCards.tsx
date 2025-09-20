import { Plus, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import EnhancedContextEditModal from '../ContextMenu/EnhancedContextEditModal';
import ContextCard from '../ContextCard';

type Props = {
    contexts: any[];
    group: any;
    availableGroups: any[];
    selectedFilePaths: string[];
    showFullScreenModal: (title: string, content: React.ReactNode, options?: any) => void;

}

const ContextCards = ({ contexts, group, availableGroups, selectedFilePaths, showFullScreenModal }: Props) => {
    const getGridLayout = () => {
        const count = contexts.length;
        if (count <= 4) return 'grid-cols-2';
        if (count <= 9) return 'grid-cols-3';
        if (count <= 16) return 'grid-cols-4';
        return 'grid-cols-5';
    };

    return <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
        style={{ overflow: 'visible' }}
    >
        <div className="p-6">
            {contexts.length === 0 ? (
                <motion.div
                    className="flex flex-col items-center justify-center py-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="relative mb-6">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                            style={{ backgroundColor: `${group?.color}15` }}
                        >
                            <Plus
                                className="w-10 h-10"
                                style={{ color: `${group?.color}80` }}
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
                        <p className="text-lg font-semibold text-gray-300 font-mono">
                            Ready for Contexts
                        </p>
                        <p className="text-sm text-gray-500 max-w-64">
                            Drag and drop contexts here or create new ones to organize your workflow
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
                                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 transition-all border border-cyan-500/30"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Save className="w-4 h-4" />
                                <span className="text-sm font-medium">Create Context ({selectedFilePaths.length} files)</span>
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            ) : (
                <div className={`grid gap-4 ${getGridLayout()}`}>
                    {contexts.map((context, index) => (
                        <motion.div
                            key={context.id}
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{
                                duration: 0.3,
                                delay: index * 0.05,
                                type: "spring",
                                stiffness: 300,
                                damping: 30
                            }}
                        >
                            <ContextCard
                                context={context}
                                groupColor={group?.color}
                                availableGroups={availableGroups}
                                selectedFilePaths={selectedFilePaths}
                            />
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    </motion.div>
}

export default ContextCards