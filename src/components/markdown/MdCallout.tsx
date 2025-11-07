import React from 'react';
import { motion } from 'framer-motion';
import { Info, CheckCircle, AlertTriangle, AlertCircle, LucideIcon } from 'lucide-react';

interface MdCalloutProps {
  content: string;
  calloutType: 'info' | 'success' | 'warning' | 'error';
  renderInlineContent: (text: string) => React.ReactElement;
}

type CalloutType = 'info' | 'success' | 'warning' | 'error';

interface CalloutStyle {
  container: string;
  icon: string;
  text: string;
}

const CALLOUT_ICONS: Record<CalloutType, React.ReactElement> = {
  info: <Info className="w-4 h-4" />,
  success: <CheckCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />
};

const CALLOUT_STYLES: Record<CalloutType, CalloutStyle> = {
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

const CALLOUT_ANIMATION = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3 }
};

// Callout content component
interface CalloutContentProps {
  content: string;
  textClass: string;
  renderInlineContent: (text: string) => React.ReactElement;
}

function CalloutContent({ content, textClass, renderInlineContent }: CalloutContentProps) {
  return (
    <div className={`${textClass} space-y-2`}>
      {content.split('\n').map((line, lineIndex) => (
        <p key={lineIndex} className="leading-relaxed">
          {renderInlineContent(line)}
        </p>
      ))}
    </div>
  );
}

export default function MdCallout({ content, calloutType, renderInlineContent }: MdCalloutProps) {
  const styles = CALLOUT_STYLES[calloutType];

  return (
    <motion.div
      {...CALLOUT_ANIMATION}
      className={`p-4 rounded-lg border backdrop-blur-sm ${styles.container}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`${styles.icon} mt-0.5`}>
          {CALLOUT_ICONS[calloutType]}
        </div>
        <CalloutContent
          content={content}
          textClass={styles.text}
          renderInlineContent={renderInlineContent}
        />
      </div>
    </motion.div>
  );
}