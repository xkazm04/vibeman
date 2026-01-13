'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Check, X, Trash2, Loader2, Eye, FileCode2 } from 'lucide-react';
import { DbDirection } from '@/app/db';
import { useModal } from '@/contexts/ModalContext';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

interface GroupedDirections {
  contextMapId: string;
  contextMapTitle: string;
  directions: DbDirection[];
}

interface DirectionsListProps {
  grouped: GroupedDirections[];
  onAccept: (directionId: string) => Promise<void>;
  onReject: (directionId: string) => Promise<void>;
  onDelete: (directionId: string) => Promise<void>;
  loading?: boolean;
}

interface DirectionRowProps {
  direction: DbDirection;
  onAccept: (directionId: string) => Promise<void>;
  onReject: (directionId: string) => Promise<void>;
  onDelete: (directionId: string) => Promise<void>;
}

function DirectionRow({ direction, onAccept, onReject, onDelete }: DirectionRowProps) {
  const { showModal } = useModal();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPending = direction.status === 'pending';
  const isAccepted = direction.status === 'accepted';
  const isRejected = direction.status === 'rejected';

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAccepting(true);
    try {
      await onAccept(direction.id);
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRejecting(true);
    try {
      await onReject(direction.id);
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(direction.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDetails = () => {
    showModal(
      {
        title: direction.summary,
        subtitle: direction.context_map_title,
        icon: Compass,
        iconBgColor: 'from-cyan-500/20 via-teal-500/10 to-emerald-500/20',
        iconColor: 'text-cyan-400',
        maxWidth: 'max-w-4xl',
        maxHeight: 'max-h-[85vh]',
        showBackdrop: true,
        backdropBlur: true,
      },
      <MarkdownViewer content={direction.direction} />
    );
  };

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`
        border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer
        ${isAccepted ? 'bg-green-900/10' : ''}
        ${isRejected ? 'bg-red-900/10 opacity-60' : ''}
      `}
      onClick={handleViewDetails}
    >
      {/* Direction Summary */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <div className={`
            w-1.5 h-1.5 rounded-full flex-shrink-0
            ${isAccepted ? 'bg-green-400' : ''}
            ${isRejected ? 'bg-red-400' : ''}
            ${isPending ? 'bg-cyan-400' : ''}
          `} />
          <span className="text-sm text-gray-200 line-clamp-1">{direction.summary}</span>
          {isAccepted && direction.requirement_path && (
            <span title="Requirement created">
              <FileCode2 className="w-3 h-3 text-green-400 flex-shrink-0" />
            </span>
          )}
        </div>
      </td>

      {/* Context Name */}
      <td className="py-2.5 px-3">
        <span className="text-xs text-gray-400 line-clamp-1">{direction.context_map_title}</span>
      </td>

      {/* Actions */}
      <td className="py-2.5 px-3">
        <div className="flex items-center justify-end gap-1">
          {/* View button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleViewDetails(); }}
            className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
            title="View details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {isPending && (
            <>
              <button
                onClick={handleAccept}
                disabled={accepting || rejecting || deleting}
                className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded disabled:opacity-50 transition-colors"
                title="Accept"
              >
                {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleReject}
                disabled={accepting || rejecting || deleting}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded disabled:opacity-50 transition-colors"
                title="Reject"
              >
                {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-500/10 rounded disabled:opacity-50 transition-colors"
            title="Delete"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function DirectionsList({
  grouped,
  onAccept,
  onReject,
  onDelete,
  loading = false
}: DirectionsListProps) {
  // Flatten all directions with context info
  const allDirections = grouped.flatMap(group =>
    group.directions.map(d => ({ ...d, contextTitle: group.contextMapTitle }))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading directions...
      </div>
    );
  }

  if (allDirections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Compass className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No directions yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Select contexts and generate directions to get actionable development guidance
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/40 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700/50 bg-gray-900/30">
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Direction
            </th>
            <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-48">
              Context
            </th>
            <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-32">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {allDirections.map((direction) => (
              <DirectionRow
                key={direction.id}
                direction={direction}
                onAccept={onAccept}
                onReject={onReject}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
