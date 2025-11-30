import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Context, ContextGroup } from '../../../../stores/contextStore';
import ContextJailCard from './ContextJailCard';
import ContextCardsEmpty from './ContextCardsEmpty';

interface ContextCardsProps {
    contexts: Context[];
    group?: ContextGroup;
    availableGroups: ContextGroup[];
    showFullScreenModal: (title: string, content: React.ReactNode, options?: any) => void;
    onMoveContext?: (contextId: string, groupId: string | null) => void;
}

const ContextCards = React.memo(({ contexts, group, availableGroups, showFullScreenModal, onMoveContext }: ContextCardsProps) => {
    // Memoized layout configuration for performance with dynamic height
    const layout = useMemo(() => {
        const count = contexts.length;
        if (count === 1) return {
            gridCols: 'grid-cols-1',
            cellHeight: 'h-64', // Single card: large
            fontSize: 'text-4xl',
            showDividers: false
        };
        if (count === 2) return {
            gridCols: 'grid-cols-2',
            cellHeight: 'h-64', // Two cards: large
            fontSize: 'text-2xl',
            showDividers: true
        };
        if (count <= 4) return {
            gridCols: 'grid-cols-2',
            cellHeight: 'h-32', // 3-4 cards: medium
            fontSize: 'text-lg',
            showDividers: true
        };
        return {
            gridCols: 'grid-cols-3',
            cellHeight: 'h-28', // 5+ cards: compact
            fontSize: 'text-base',
            showDividers: true
        };
    }, [contexts.length]);

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="relative"
        >
            {contexts.length === 0 ? (
                <ContextCardsEmpty
                    group={group}
                    availableGroups={availableGroups}
                    showFullScreenModal={showFullScreenModal}
                />
            ) : (
                // Jail-Door Structure with dynamic height
                <div className="p-4">
                    <div className={`grid gap-0 ${layout.gridCols} relative`} style={{ gridAutoRows: `minmax(${layout.cellHeight === 'h-64' ? '16rem' : layout.cellHeight === 'h-32' ? '8rem' : '7rem'}, auto)` }}>
                        {contexts.map((context, index) => {
                            const colCount = layout.gridCols === 'grid-cols-2' ? 2 : layout.gridCols === 'grid-cols-3' ? 3 : 1;
                            const showVerticalDivider = layout.showDividers && (index % colCount !== colCount - 1);
                            const showHorizontalDivider = layout.showDividers && (index < contexts.length - colCount);

                            return (
                                <div key={context.id} className={`relative ${layout.cellHeight}`}>
                                    <ContextJailCard
                                        context={context}
                                        group={group}
                                        index={index}
                                        fontSize={layout.fontSize}
                                        availableGroups={availableGroups}
                                        onMoveContext={onMoveContext}
                                    />

                                    {/* Optimized Dividers */}
                                    {showVerticalDivider && (
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

                                    {showHorizontalDivider && (
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
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </motion.div>
    );
});

ContextCards.displayName = 'ContextCards';

export default ContextCards;