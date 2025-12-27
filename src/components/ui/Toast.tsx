'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, Toast as ToastType, ToastType as ToastVariant } from '@/stores/toastStore';

const icons: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors: Record<ToastVariant, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-green-900/80',
    border: 'border-green-500/50',
    icon: 'text-green-400',
    text: 'text-green-100',
  },
  error: {
    bg: 'bg-red-900/80',
    border: 'border-red-500/50',
    icon: 'text-red-400',
    text: 'text-red-100',
  },
  warning: {
    bg: 'bg-yellow-900/80',
    border: 'border-yellow-500/50',
    icon: 'text-yellow-400',
    text: 'text-yellow-100',
  },
  info: {
    bg: 'bg-blue-900/80',
    border: 'border-blue-500/50',
    icon: 'text-blue-400',
    text: 'text-blue-100',
  },
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = icons[toast.type];
  const colorScheme = colors[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        relative flex items-start gap-3 min-w-[320px] max-w-[420px]
        px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg
        ${colorScheme.bg} ${colorScheme.border}
      `}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colorScheme.icon}`} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${colorScheme.text}`}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-sm text-gray-300 mt-0.5 line-clamp-2">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className={`mt-2 text-sm font-medium ${colorScheme.icon} hover:underline`}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxVisible?: number;
}

const positionClasses: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export function ToastContainer({ position = 'top-right', maxVisible = 5 }: ToastContainerProps) {
  const { toasts, removeToast } = useToastStore();
  const visibleToasts = toasts.slice(-maxVisible);

  return (
    <div
      className={`fixed z-[100] flex flex-col gap-2 pointer-events-none ${positionClasses[position]}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ToastContainer;
