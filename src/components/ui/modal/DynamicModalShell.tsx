"use client";
import React from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

// Dynamic Header (wraps existing ui/ModalHeader)
const ModalHeader = dynamic(() => import("../../ui/ModalHeader"), {
  ssr: false,
  loading: () => (
    <div className="p-4 border-b border-gray-700 bg-gray-800/50">
      <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
    </div>
  ),
});

// Dynamic Content (wraps existing ui/ModalContent)
const ModalContent = dynamic(() => import("../../ui/ModalContent"), {
  ssr: false,
  loading: () => (
    <div className="p-6">
      <div className="h-5 w-56 bg-gray-700 rounded animate-pulse mb-3" />
      <div className="h-4 w-full bg-gray-700 rounded animate-pulse mb-2" />
      <div className="h-4 w-11/12 bg-gray-700 rounded animate-pulse mb-2" />
      <div className="h-4 w-10/12 bg-gray-700 rounded animate-pulse" />
    </div>
  ),
});

// Dynamic Footer (wraps new ui/modal/ModalFooter)
const ModalFooter = dynamic(() => import("./ModalFooter"), {
  ssr: false,
  loading: () => (
    <div className="p-4 border-t border-gray-700 bg-gray-800/30">
      <div className="h-9 w-28 bg-gray-700 rounded animate-pulse ml-auto" />
    </div>
  ),
});

// Shell that composes header, content, and footer with motion transitions
interface DynamicModalShellProps {
  header?: React.ComponentProps<typeof ModalHeader> & { enabled?: boolean };
  content?: React.ComponentProps<typeof ModalContent> & { enabled?: boolean };
  footer?: React.ComponentProps<typeof ModalFooter> & { enabled?: boolean };
  // If false, we render lightweight placeholders and mark this layer inert/hidden
  isTopMost?: boolean;
  // Optional custom content to render instead of the standard ModalContent
  customContent?: React.ReactNode;
}

export default function DynamicModalShell({ header, content, footer, isTopMost = true, customContent }: DynamicModalShellProps) {
  const PlaceholderBlock = ({ height = 120 }: { height?: number }) => (
    <div className="p-6">
      <div className="h-5 w-56 bg-gray-700 rounded animate-pulse mb-3" />
      <div className="h-4 w-full bg-gray-700 rounded animate-pulse mb-2" />
      <div className="h-4 w-11/12 bg-gray-700 rounded animate-pulse mb-2" />
      <div className="h-4 w-10/12 bg-gray-700 rounded animate-pulse" />
    </div>
  );

  const inertProps = !isTopMost
    ? { 'aria-hidden': true as const, 'data-inert': true, style: { pointerEvents: 'none' as const, userSelect: 'none' as const } }
    : {};

  return (
    <AnimatePresence mode="wait">
      {header?.enabled && (
        <motion.div
          key="dyn-header"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          {...inertProps}
        >
          {isTopMost ? (
            // @ts-ignore dynamic default export
            <ModalHeader {...header} />
          ) : (
            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
              <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
            </div>
          )}
        </motion.div>
      )}

      {content?.enabled && (
        <motion.div
          key="dyn-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex-1 min-h-[200px]"
          {...inertProps}
        >
          {isTopMost ? (
            customContent ? (
              <>{customContent}</>
            ) : (
              // @ts-ignore dynamic default export
              <ModalContent {...content} />
            )
          ) : (
            <PlaceholderBlock />
          )}
        </motion.div>
      )}

      {footer?.enabled && (
        <motion.div
          key="dyn-footer"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18 }}
          {...inertProps}
        >
          {isTopMost ? (
            // @ts-ignore dynamic default export
            <ModalFooter {...footer} />
          ) : (
            <div className="p-4 border-t border-gray-700 bg-gray-800/30">
              <div className="h-9 w-28 bg-gray-700 rounded animate-pulse ml-auto" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
