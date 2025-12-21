'use client';

import React, { useEffect, useRef } from 'react';
import {
  Eye,
  Search,
  UserCog,
  Bot,
  CheckCircle,
  RotateCcw,
  Github,
  Link,
  MoreVertical,
  type LucideIcon,
} from 'lucide-react';
import type { FeedbackItem, KanbanStatus } from '../lib/types/feedbackTypes';

// Full menu props (with item)
interface CardMenuFullProps {
  item: FeedbackItem;
  onClose: () => void;
  onAction: (action: string) => void;
}

// Compact menu props (for inline usage)
export interface CardMenuCompactProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: string) => void;
  status: KanbanStatus;
  hasAIResult?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  showIn?: KanbanStatus[];
  separator?: boolean;
}

const menuItems: MenuItem[] = [
  { id: 'view', label: 'View Details', icon: Eye },
  { id: 'analyze', label: 'Run Analysis', icon: Search, showIn: ['new'] },
  { id: 'assign-manual', label: 'Assign to Developer', icon: UserCog, showIn: ['analyzed'] },
  { id: 'assign-auto', label: 'Send to AI Agent', icon: Bot, showIn: ['analyzed'] },
  { id: 'mark-done', label: 'Mark as Done', icon: CheckCircle, showIn: ['manual', 'automatic'] },
  { id: 'reopen', label: 'Reopen', icon: RotateCcw, showIn: ['done'] },
  { id: 'separator-1', label: '', icon: Eye, separator: true },
  { id: 'create-github', label: 'Create GitHub Issue', icon: Github },
  { id: 'copy-link', label: 'Copy Link', icon: Link },
];

// Full CardMenu (standalone, for modal usage)
export default function CardMenu({ item, onClose, onAction }: CardMenuFullProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const visibleItems = menuItems.filter((menuItem) => {
    if (menuItem.separator) return true;
    if (!menuItem.showIn) return true;
    return menuItem.showIn.includes(item.status);
  });

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700/60 rounded-lg shadow-lg min-w-[180px] py-1 z-50"
      role="menu"
    >
      {visibleItems.map((menuItem, index) => {
        if (menuItem.separator) {
          return (
            <div
              key={`sep-${index}`}
              className="h-px bg-gray-700/60 mx-2 my-1"
            />
          );
        }

        const IconComponent = menuItem.icon;

        return (
          <button
            key={menuItem.id}
            onClick={(e) => {
              e.stopPropagation();
              onAction(menuItem.id);
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 rounded-sm mx-1 transition-colors"
            role="menuitem"
          >
            <IconComponent className="w-4 h-4 text-gray-400" />
            <span>{menuItem.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Compact CardMenu (inline, for card usage with toggle)
export function CardMenuCompact({
  isOpen,
  onOpenChange,
  onAction,
  status,
}: CardMenuCompactProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onOpenChange]);

  const visibleItems = menuItems.filter((menuItem) => {
    if (menuItem.separator) return true;
    if (!menuItem.showIn) return true;
    return menuItem.showIn.includes(status);
  });

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!isOpen);
        }}
        className="p-0.5 rounded hover:bg-gray-700/60 transition-colors"
      >
        <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700/60 rounded-lg shadow-lg min-w-[160px] py-1 z-50"
          role="menu"
        >
          {visibleItems.map((menuItem, index) => {
            if (menuItem.separator) {
              return (
                <div
                  key={`sep-${index}`}
                  className="h-px bg-gray-700/60 mx-2 my-1"
                />
              );
            }

            const IconComponent = menuItem.icon;

            return (
              <button
                key={menuItem.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(menuItem.id);
                  onOpenChange(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 transition-colors"
                role="menuitem"
              >
                <IconComponent className="w-3.5 h-3.5 text-gray-400" />
                <span>{menuItem.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
