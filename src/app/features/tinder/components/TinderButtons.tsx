'use client';
import { motion } from 'framer-motion';
import { X, Trash2, Check } from 'lucide-react';

interface ActionButtonsProps {
  onReject: () => void;
  onDelete: () => void;
  onAccept: () => void;
  disabled?: boolean;
}

export default function ActionButtons({
  onReject,
  onDelete,
  onAccept,
  disabled = false,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-6 pt-20">
      {/* Reject Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onReject}
        disabled={disabled}
        className={`flex items-center justify-center w-16 h-16 rounded-full transition-all ${
          disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500 text-red-400 shadow-lg shadow-red-500/20'
        }`}
        title="Reject (Swipe Left)"
      >
        <X className="w-8 h-8" />
      </motion.button>

      {/* Delete Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onDelete}
        disabled={disabled}
        className={`flex items-center justify-center w-14 h-14 rounded-full transition-all ${
          disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-500/20 hover:bg-gray-500/30 border-2 border-gray-500 text-gray-400 shadow-lg shadow-gray-500/20'
        }`}
        title="Delete Permanently"
      >
        <Trash2 className="w-6 h-6" />
      </motion.button>

      {/* Accept Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onAccept}
        disabled={disabled}
        className={`flex items-center justify-center w-16 h-16 rounded-full transition-all ${
          disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-green-500/20 hover:bg-green-500/30 border-2 border-green-500 text-green-400 shadow-lg shadow-green-500/20'
        }`}
        title="Accept (Swipe Right)"
      >
        <Check className="w-8 h-8" />
      </motion.button>
    </div>
  );
}
