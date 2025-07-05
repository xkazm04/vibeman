import { motion } from "framer-motion"
import { Goal } from "../../../types"

const GoalsTitle = ({ selectedGoal, isTransitioning, handleGoalDetailClick }: { selectedGoal: Goal, isTransitioning: boolean, handleGoalDetailClick: () => void }) => {
    return <div className="flex-1 flex justify-center px-8">
        {selectedGoal && (
            <motion.div
                key={selectedGoal.id} 
                initial={{ opacity: 0, y: 5 }}
                animate={{
                    opacity: isTransitioning ? 0 : 1,
                    y: isTransitioning ? -5 : 0
                }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="text-center cursor-pointer group"
                onClick={handleGoalDetailClick}
            >
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: isTransitioning ? 0 : 1,
                        y: isTransitioning ? -3 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="text-lg font-semibold text-white tracking-wide leading-tight group-hover:text-slate-200 transition-colors duration-200"
                >
                    {selectedGoal.title}
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: isTransitioning ? 0 : 1,
                        y: isTransitioning ? -2 : 0
                    }}
                    transition={{ duration: 0.3, delay: 0.05, ease: "easeInOut" }}
                    className="text-xs text-slate-400 capitalize mt-1 font-medium tracking-wider group-hover:text-slate-300 transition-colors duration-200"
                >
                    {selectedGoal.status.replace('_', ' ')}
                </motion.p>
            </motion.div>
        )}
    </div>
}

export default GoalsTitle