'use client';
import { useModal } from '@/contexts/ModalContext';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalOptions {
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

interface ModalShellSectionConfig {
  enabled: boolean;
  previewMode?: 'edit' | 'preview';
  markdownContent?: string;
  hasContent?: boolean;
  [key: string]: unknown;
}

interface DynamicModalShellProps {
  header: ModalShellSectionConfig;
  content: ModalShellSectionConfig;
  footer: ModalShellSectionConfig;
  customContent?: ReactNode;
  isTopMost?: boolean;
}

export const useGlobalModal = () => {
  const { showModal, hideModal, isModalOpen } = useModal();

  const showConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    const content = (
      <div className="space-y-4">
        <p className="text-gray-300">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              onCancel?.();
              hideModal();
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              hideModal();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    );

    showModal({
      title,
      maxWidth: "max-w-md",
      maxHeight: "max-h-[40vh]"
    }, content);
  };

  const showInfoModal = (title: string, content: ReactNode, options?: Partial<ModalOptions>) => {
    showModal({
      title,
      maxWidth: "max-w-2xl",
      maxHeight: "max-h-[90vh]",
      ...options
    }, content);
  };

  const showFullScreenModal = (title: string, content: ReactNode, options?: Partial<ModalOptions>) => {
    showModal({
      title,
      maxWidth: "max-w-6xl",
      maxHeight: "max-h-[100vh]",
      ...options
    }, content);
  };

  // Unified dynamic modal helpers
  // 1) Show a standard markdown-based modal using the dynamic ModalContent
  const showMarkdownModal = (
    title: string,
    markdown: string,
    options?: Partial<ModalOptions> & { previewMode?: 'edit' | 'preview' }
  ) => {
    const DynamicModalShell = require("@/components/ui/modal/DynamicModalShell").default as React.ComponentType<DynamicModalShellProps>;
    const content = (
      <DynamicModalShell
        header={{ enabled: false }}
        content={{ enabled: true, previewMode: options?.previewMode || 'preview', markdownContent: markdown, hasContent: true }}
        footer={{ enabled: false }}
      />
    );

    showModal({
      title,
      maxWidth: "max-w-4xl",
      maxHeight: "max-h-[100vh]",
      ...options
    }, content);
  };

  // 2) Generic shell hook: caller provides props for Header/Content/Footer
  const showShellModal = (
    config: ModalOptions,
    shell: {
      header?: ModalShellSectionConfig;
      content?: ModalShellSectionConfig;
      footer?: ModalShellSectionConfig;
      customContent?: React.ReactNode;
      isTopMost?: boolean;
    }
  ) => {
    const DynamicModalShell = require("@/components/ui/modal/DynamicModalShell").default as React.ComponentType<DynamicModalShellProps>;
    const content = (
      <DynamicModalShell
        header={shell.header ? { enabled: true, ...shell.header } : { enabled: false }}
        content={shell.content ? { enabled: true, ...shell.content } : { enabled: false }}
        footer={shell.footer ? { enabled: true, ...shell.footer } : { enabled: false }}
        customContent={shell.customContent}
        isTopMost={shell.isTopMost ?? true}
      />
    );

    showModal(config, content);
  };

  return {
    showModal,
    hideModal,
    isModalOpen,
    showConfirmModal,
    showInfoModal,
    showFullScreenModal,
    showMarkdownModal,
    showShellModal,
  };
};
