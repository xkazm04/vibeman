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
    <div className="flex items-center justify-center gap-4 pt-4">
      {/* Reject Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onReject}
        disabled={disabled}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-out ${
          disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
            : 'bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500 text-red-400 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/40 hover:border-red-400 active:scale-95'
        }`}
        title="Reject (Swipe Left)"
      >
        <X className="w-6 h-6 transition-transform duration-200" />
      </motion.button>

      {/* Delete Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onDelete}
        disabled={disabled}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-out ${
          disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
            : 'bg-gray-500/20 hover:bg-gray-500/30 border-2 border-gray-500 text-gray-400 shadow-lg shadow-gray-500/20 hover:shadow-xl hover:shadow-gray-500/30 hover:border-gray-400 active:scale-95'
        }`}
        title="Delete Permanently"
      >
        <Trash2 className="w-5 h-5 transition-transform duration-200" />
      </motion.button>

      {/* Accept Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onAccept}
        disabled={disabled}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-out ${
          disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
            : 'bg-green-500/20 hover:bg-green-500/30 border-2 border-green-500 text-green-400 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:border-green-400 active:scale-95'
        }`}
        title="Accept (Swipe Right)"
      >
        <Check className="w-6 h-6 transition-transform duration-200" />
      </motion.button>
    </div>
  );
}
