'use client';

import React from 'react';
import { Send } from 'lucide-react';
import { ProjectContext } from '../lib/typesAnnette';

interface AnnetteChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (messageText?: string) => Promise<void>;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isListening?: boolean;
  onToggleListening?: () => void;
  selectedProject?: ProjectContext;
  isProcessing?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function AnnetteChatInput({
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isListening,
  onToggleListening,
  selectedProject,
  isProcessing,
  inputRef
}: AnnetteChatInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isProcessing) {
      onSendMessage(inputValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700/50">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={onKeyPress}
          disabled={isProcessing}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="submit"
          disabled={isProcessing || !inputValue.trim()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
