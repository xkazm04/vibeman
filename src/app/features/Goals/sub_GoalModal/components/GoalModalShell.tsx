'use client';
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';
import type { ModalSize } from '@/lib/design-tokens';

interface GoalModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  /** Preferred way to set width — pick a modalSizes token. */
  size?: ModalSize;
  /**
   * Legacy maxWidth string. Prefer `size` for new code.
   * @deprecated Use `size` instead.
   */
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Shared modal chrome for all GoalModal modes.
 * Centralises overlay, close button, and animation via UniversalModal.
 */
export default function GoalModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBgColor = 'from-cyan-800/60 to-blue-900/60',
  iconColor = 'text-cyan-300',
  size,
  maxWidth = 'max-w-2xl',
  children,
}: GoalModalShellProps) {
  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      iconBgColor={iconBgColor}
      iconColor={iconColor}
      size={size}
      maxWidth={maxWidth}
    >
      {children}
    </UniversalModal>
  );
}
