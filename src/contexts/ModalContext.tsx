'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';

export interface GlobalModalOptions {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  maxWidth?: string;
  maxHeight?: string;
  showBackdrop?: boolean;
  backdropBlur?: boolean;
}

export type ShowFullScreenModalFn = (title: string, content: ReactNode, options?: Partial<GlobalModalOptions>) => void;

interface ModalContextType {
  showModal: (config: GlobalModalOptions, content: ReactNode) => void;
  hideModal: () => void;
  isModalOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<GlobalModalOptions | null>(null);
  const [modalContent, setModalContent] = useState<ReactNode>(null);

  const showModal = (config: GlobalModalOptions, content: ReactNode) => {
    setModalConfig(config);
    setModalContent(content);
    setIsModalOpen(true);
  };

  const hideModal = () => {
    setIsModalOpen(false);
    setModalConfig(null);
    setModalContent(null);
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal, isModalOpen }}>
      {children}

      {/* Global Modal Renderer */}
      {modalConfig && (
        <UniversalModal
          isOpen={isModalOpen}
          onClose={hideModal}
          title={modalConfig.title}
          subtitle={modalConfig.subtitle}
          icon={modalConfig.icon}
          iconBgColor={modalConfig.iconBgColor}
          iconColor={modalConfig.iconColor}
          maxWidth={modalConfig.maxWidth}
          maxHeight={modalConfig.maxHeight}
          showBackdrop={modalConfig.showBackdrop}
          backdropBlur={modalConfig.backdropBlur}
        >
          {modalContent}
        </UniversalModal>
      )}
    </ModalContext.Provider>
  );
};