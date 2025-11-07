import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

interface MdCodeProps {
  content: string;
  language: string;
  index: number;
}

const CODE_ANIMATION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

// Code header component
interface CodeHeaderProps {
  language: string;
  isCopied: boolean;
  onCopy: () => void;
}

function CodeHeader({ language, isCopied, onCopy }: CodeHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
      <span className="text-sm text-gray-400 font-mono">
        {language}
      </span>
      <button
        onClick={onCopy}
        className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
        data-testid="code-copy-btn"
      >
        {isCopied ? (
          <>
            <Check className="w-3 h-3" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
}

export default function MdCode({ content, language }: MdCodeProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Silently fail - clipboard access might be denied
    }
  };

  return (
    <motion.div {...CODE_ANIMATION} className="relative group my-6">
      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
        <CodeHeader
          language={language}
          isCopied={copiedCode === content}
          onCopy={() => copyCode(content)}
        />

        {/* Code content */}
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm font-mono text-gray-300 leading-relaxed">
            {content}
          </code>
        </pre>
      </div>
    </motion.div>
  );
} 