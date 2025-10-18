'use client';

import React from 'react';

interface FrozenComponentProps {
  children: React.ReactNode;
  shouldFreeze: boolean;
  className?: string;
}

/**
 * Component that freezes its children when shouldFreeze is true
 * This prevents unnecessary re-renders and improves performance
 */
const FrozenComponent = React.memo(({ children, shouldFreeze, className }: FrozenComponentProps) => {
  const frozenChildrenRef = React.useRef<React.ReactNode>(null);

  // Freeze the children when shouldFreeze becomes true
  React.useEffect(() => {
    if (!shouldFreeze) {
      frozenChildrenRef.current = children;
    }
  }, [children, shouldFreeze]);

  const displayChildren = shouldFreeze ? frozenChildrenRef.current : children;

  return (
    <div 
      className={className}
      style={{
        pointerEvents: shouldFreeze ? 'none' : 'auto',
        opacity: shouldFreeze ? 0.7 : 1,
        transition: 'opacity 0.3s ease-in-out'
      }}
    >
      {displayChildren}
    </div>
  );
});

FrozenComponent.displayName = 'FrozenComponent';

export default FrozenComponent;