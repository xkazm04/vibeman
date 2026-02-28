'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ArrowUp,
  Home,
  Loader2,
  X,
  Check
} from 'lucide-react';

interface FolderItem {
  name: string;
  path: string;
}

interface FolderBrowserInputProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  defaultPaths?: string[];
}

export default function FolderBrowserInput({
  value,
  onChange,
  placeholder = 'Select or enter a folder path',
  defaultPaths = []
}: FolderBrowserInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(value || '');
  const [directories, setDirectories] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Common starting points for Windows
  const quickPaths = [
    'C:\\',
    'C:\\Users',
    'C:\\Projects',
    'D:\\',
    ...defaultPaths.filter(p => p && !['C:\\', 'C:\\Users', 'C:\\Projects', 'D:\\'].includes(p))
  ].filter((p, i, arr) => arr.indexOf(p) === i); // Remove duplicates

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const loadDirectories = useCallback(async (path: string) => {
    if (!path) {
      setDirectories([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/disk/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'directories', path })
      });

      const data = await response.json();
      if (data.success) {
        setDirectories(data.directories || []);
        setCurrentPath(path);
      } else {
        setDirectories([]);
      }
    } catch (error) {
      setDirectories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    if (value) {
      loadDirectories(value);
    } else if (defaultPaths[0]) {
      loadDirectories(defaultPaths[0]);
    }
  };

  const handleNavigate = (path: string) => {
    loadDirectories(path);
  };

  const handleGoUp = () => {
    const parts = currentPath.split(/[\\\/]/).filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      // Handle Windows drive letters
      const parentPath = parts.length === 1 && parts[0].includes(':')
        ? parts[0] + '\\'
        : parts.join('\\');
      loadDirectories(parentPath);
    }
  };

  const handleSelect = (path: string) => {
    onChange(path);
    setInputValue(path);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    onChange(inputValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(inputValue);
      // Try to load the entered path
      if (inputValue) {
        loadDirectories(inputValue);
      }
    }
  };

  // Parse path into breadcrumb parts
  const pathParts = currentPath.split(/[\\\/]/).filter(Boolean);

  return (
    <div className="space-y-2">
      {/* Input with browse button */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-gray-900/60 border border-gray-700/40 rounded-md text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 font-mono text-xs"
        />
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/60 border border-gray-700/40 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Browse
        </button>
      </div>

      {/* Folder browser popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-gray-800/95 border border-gray-700/60 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Header with breadcrumb */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/40 bg-gray-900/40">
              <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                <button
                  type="button"
                  onClick={handleGoUp}
                  disabled={pathParts.length <= 1}
                  className="p-1 hover:bg-gray-700/50 rounded disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  title="Go up"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <div className="flex items-center gap-0.5 text-xs text-gray-500 overflow-hidden">
                  {pathParts.map((part, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                      <button
                        type="button"
                        onClick={() => {
                          const targetPath = pathParts.slice(0, idx + 1).join('\\');
                          loadDirectories(targetPath.includes(':') && idx === 0 ? targetPath + '\\' : targetPath);
                        }}
                        className="hover:text-gray-300 truncate max-w-[100px]"
                        title={part}
                      >
                        {part}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-700/50 rounded flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            {/* Quick access */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700/30 bg-gray-900/20">
              <span className="text-[10px] text-gray-600 mr-1">Quick:</span>
              {quickPaths.map(path => (
                <button
                  key={path}
                  type="button"
                  onClick={() => handleNavigate(path)}
                  className={`px-2 py-0.5 text-[10px] rounded ${
                    currentPath === path
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-700/40 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
                  }`}
                >
                  {path.replace('C:\\', 'C:').replace('D:\\', 'D:')}
                </button>
              ))}
            </div>

            {/* Directory listing */}
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400 mr-2" />
                  <span className="text-xs text-gray-500">Loading...</span>
                </div>
              ) : directories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                  <Folder className="w-5 h-5 mb-1 text-gray-600" />
                  <span className="text-xs">No subdirectories</span>
                </div>
              ) : (
                <div className="py-1">
                  {directories.map(dir => (
                    <div
                      key={dir.path}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700/40 cursor-pointer group"
                    >
                      <button
                        type="button"
                        onClick={() => handleNavigate(dir.path)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <Folder className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span className="text-xs text-gray-300 truncate">{dir.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect(dir.path)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-500/20 rounded transition-opacity"
                        title="Select this folder"
                      >
                        <Check className="w-3 h-3 text-blue-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Select current folder */}
            {currentPath && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700/40 bg-gray-900/40">
                <span className="text-[10px] text-gray-500 truncate flex-1 mr-2 font-mono">
                  {currentPath}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelect(currentPath)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Select
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
