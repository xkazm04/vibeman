/**
 * BalancingModal — Thin modal wrapper around the unified BalancingView.
 */

'use client';

import { Settings2, RotateCcw } from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';
import { MODAL_ICON_GRADIENT } from '../lib/stageTheme';
import { useConductorStore } from '../lib/conductorStore';
import BalancingView from './BalancingView';

interface BalancingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BalancingModal({ isOpen, onClose }: BalancingModalProps) {
  const { resetConfig } = useConductorStore();

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pipeline Settings"
      subtitle="Configure pipeline settings"
      icon={Settings2}
      iconBgColor={MODAL_ICON_GRADIENT.config.bg}
      iconColor={MODAL_ICON_GRADIENT.config.text}
      maxWidth="max-w-5xl"
      footerActions={[
        {
          icon: RotateCcw,
          label: 'Reset Defaults',
          onClick: resetConfig,
          variant: 'secondary',
          testId: 'reset-defaults-btn',
        },
      ]}
    >
      <BalancingView layout="modal" />
    </UniversalModal>
  );
}
