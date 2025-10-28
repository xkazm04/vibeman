import { Goal } from "@/types";
import { motion } from "framer-motion";
import { HammerIcon } from "lucide-react";

export const getStatusStyle = (status: Goal['status'], isSelected: boolean) => {
    const baseClasses = "w-4 h-4 rounded-full border cursor-pointer transition-all duration-500 flex items-center justify-center relative";
    
    switch (status) {
      case 'done':
        return `${baseClasses} bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-800 border-yellow-500 ${
          isSelected ? 'shadow-2xl shadow-yellow-400/80 ring-2 ring-yellow-300/50 ring-offset-2 ring-offset-transparent scale-110 brightness-125' : 'hover:scale-110 hover:brightness-110'
        }`;
      case 'in_progress':
        return `${baseClasses} bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-800 border-yellow-500 shadow-lg shadow-yellow-600/50 ${
          isSelected ? 'shadow-2xl shadow-yellow-400/80 ring-2 ring-yellow-300/50 ring-offset-2 ring-offset-transparent scale-110 brightness-125' : 'hover:scale-110 hover:brightness-110'
        }`;
      case 'open':
        return `${baseClasses} bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-800 border-yellow-500 ${
          isSelected ? 'shadow-2xl shadow-yellow-400/80 ring-2 ring-yellow-300/50 ring-offset-2 ring-offset-transparent scale-110 brightness-125' : 'hover:scale-110 hover:brightness-110'
        }`;
      default:
        return baseClasses;
    }
  };

export const getStatusIcon = (status: Goal['status']) => {
    switch (status) {
      case 'done':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-green-300 text-sm font-bold"
          >
            ✓
          </motion.div>
        );
      case 'in_progress':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-yellow-300 text-sm font-bold"
          >
            <HammerIcon size={12} />
          </motion.div>
        );
      case 'open':
        return null; // No icon for open
      default:
        return null;
    }
  };