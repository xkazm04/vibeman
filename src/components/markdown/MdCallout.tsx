import React from 'react';
import { motion } from 'framer-motion';
import { Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

interface MdCalloutProps {
  content: string;
  calloutType: 'info' | 'success' | 'warning' | 'error';
  renderInlineContent: (text: string) => React.ReactElement;
}

export default function MdCallout({ content, calloutType, renderInlineContent }: MdCalloutProps) {
  const calloutIcons = {
    info: <Info className="w-4 h-4" />,
    success: <CheckCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />
  };

  const calloutStyles = {
    info: {
      container: 'bg-blue-500/10 border-blue-500/30 border-l-4 border-l-blue-500 shadow-lg shadow-blue-500/10',
      icon: 'text-blue-400',
      text: 'text-blue-100'
    },
    success: {
      container: 'bg-green-500/10 border-green-500/30 border-l-4 border-l-green-500 shadow-lg shadow-green-500/10',
      icon: 'text-green-400',
      text: 'text-green-100'
    },
    warning: {
      container: 'bg-yellow-500/10 border-yellow-500/30 border-l-4 border-l-yellow-500 shadow-lg shadow-yellow-500/10',
      icon: 'text-yellow-400',
      text: 'text-yellow-100'
    },
    error: {
      container: 'bg-red-500/10 border-red-500/30 border-l-4 border-l-red-500 shadow-lg shadow-red-500/10',
      icon: 'text-red-400',
      text: 'text-red-100'
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-lg border backdrop-blur-sm ${calloutStyles[calloutType].container}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`${calloutStyles[calloutType].icon} mt-0.5`}>
          {calloutIcons[calloutType]}
        </div>
        <div className={`${calloutStyles[calloutType].text} space-y-2`}>
          {content.split('\n').map((line, lineIndex) => (
            <p key={lineIndex} className="leading-relaxed">
              {renderInlineContent(line)}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}