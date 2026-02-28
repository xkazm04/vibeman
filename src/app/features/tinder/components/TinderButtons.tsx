'use client';
import { motion } from 'framer-motion';
import { X, Trash2, Check, Layers } from 'lucide-react';

// ── Shared button style helper ───────────────────────────────────────────────

interface ColorScheme {
  active: string;
  disabled: string;
  ringColor: string;
}

const COLOR_SCHEMES: Record<string, ColorScheme> = {
  red: {
    active: 'bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500 text-red-400 shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/40 hover:border-red-400 active:scale-95',
    disabled: 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60',
    ringColor: 'focus-visible:ring-cyan-400',
  },
  green: {
    active: 'bg-green-500/20 hover:bg-green-500/30 border-2 border-green-500 text-green-400 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:border-green-400 active:scale-95',
    disabled: 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60',
    ringColor: 'focus-visible:ring-cyan-400',
  },
  gray: {
    active: 'bg-gray-500/20 hover:bg-gray-500/30 border-2 border-gray-500 text-gray-400 shadow-lg shadow-gray-500/20 hover:shadow-xl hover:shadow-gray-500/30 hover:border-gray-400 active:scale-95',
    disabled: 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60',
    ringColor: 'focus-visible:ring-cyan-400',
  },
  purple: {
    active: 'bg-purple-500/20 hover:bg-purple-500/30 border-2 border-purple-500 text-purple-400 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40 hover:border-purple-400 active:scale-95',
    disabled: 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60',
    ringColor: 'focus-visible:ring-cyan-400',
  },
};

// ── Side Action Button (flanking the card on desktop) ────────────────────────

interface SideActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  color: 'red' | 'green';
  icon: React.ReactNode;
  title: string;
  ariaLabel: string;
}

export function SideActionButton({
  onClick,
  disabled = false,
  color,
  icon,
  title,
  ariaLabel,
}: SideActionButtonProps) {
  const scheme = COLOR_SCHEMES[color];
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.1 }}
      whileTap={{ scale: disabled ? 1 : 0.9 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${scheme.ringColor} ${
        disabled ? scheme.disabled : scheme.active
      }`}
      title={title}
      aria-label={ariaLabel}
    >
      {icon}
    </motion.button>
  );
}

// ── Compact Bottom Bar (delete + variants inline) ────────────────────────────

interface CompactBottomBarProps {
  onDelete: () => void;
  disabled?: boolean;
  onVariants?: () => void;
}

export function CompactBottomBar({
  onDelete,
  disabled = false,
  onVariants,
}: CompactBottomBarProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {/* Delete Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onDelete}
        disabled={disabled}
        className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${COLOR_SCHEMES.gray.ringColor} ${
          disabled ? COLOR_SCHEMES.gray.disabled : COLOR_SCHEMES.gray.active
        }`}
        title="Delete Permanently (D)"
        aria-label="Delete permanently"
      >
        <Trash2 className="w-4 h-4 transition-transform duration-200" />
      </motion.button>

      {/* Variants Button */}
      {onVariants && (
        <motion.button
          whileHover={{ scale: disabled ? 1 : 1.1 }}
          whileTap={{ scale: disabled ? 1 : 0.9 }}
          onClick={onVariants}
          disabled={disabled}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${COLOR_SCHEMES.purple.ringColor} ${
            disabled ? COLOR_SCHEMES.purple.disabled : COLOR_SCHEMES.purple.active
          }`}
          title="Generate Variants (V)"
          aria-label="Generate variants"
        >
          <Layers className="w-4 h-4 transition-transform duration-200" />
        </motion.button>
      )}
    </div>
  );
}

// ── Original ActionButtons (backward compat + mobile fallback) ───────────────

interface ActionButtonsProps {
  onReject: () => void;
  onDelete: () => void;
  onAccept: () => void;
  disabled?: boolean;
  /** If provided, shows the Variants button */
  onVariants?: () => void;
}

export default function ActionButtons({
  onReject,
  onDelete,
  onAccept,
  disabled = false,
  onVariants,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      {/* Reject Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onReject}
        disabled={disabled}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${COLOR_SCHEMES.red.ringColor} ${
          disabled ? COLOR_SCHEMES.red.disabled : COLOR_SCHEMES.red.active
        }`}
        title="Reject (Swipe Left)"
        aria-label="Reject idea"
      >
        <X className="w-6 h-6 transition-transform duration-200" />
      </motion.button>

      {/* Delete Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onDelete}
        disabled={disabled}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${COLOR_SCHEMES.gray.ringColor} ${
          disabled ? COLOR_SCHEMES.gray.disabled : COLOR_SCHEMES.gray.active
        }`}
        title="Delete Permanently"
        aria-label="Delete permanently"
      >
        <Trash2 className="w-5 h-5 transition-transform duration-200" />
      </motion.button>

      {/* Accept Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        onClick={onAccept}
        disabled={disabled}
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${COLOR_SCHEMES.green.ringColor} ${
          disabled ? COLOR_SCHEMES.green.disabled : COLOR_SCHEMES.green.active
        }`}
        title="Accept (Swipe Right)"
        aria-label="Accept idea"
      >
        <Check className="w-6 h-6 transition-transform duration-200" />
      </motion.button>

      {/* Variants Button */}
      {onVariants && (
        <motion.button
          whileHover={{ scale: disabled ? 1 : 1.1 }}
          whileTap={{ scale: disabled ? 1 : 0.9 }}
          onClick={onVariants}
          disabled={disabled}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${COLOR_SCHEMES.purple.ringColor} ${
            disabled ? COLOR_SCHEMES.purple.disabled : COLOR_SCHEMES.purple.active
          }`}
          title="Generate Variants (V)"
          aria-label="Generate variants"
        >
          <Layers className="w-5 h-5 transition-transform duration-200" />
        </motion.button>
      )}
    </div>
  );
}
