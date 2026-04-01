import { ChevronRight } from 'lucide-react';

interface ExpandChevronProps {
  expanded: boolean;
  className?: string;
}

/**
 * Standardized expand/collapse chevron.
 * Points right when collapsed, rotates to point down when expanded.
 */
export default function ExpandChevron({ expanded, className = 'w-3.5 h-3.5 text-gray-500' }: ExpandChevronProps) {
  return (
    <ChevronRight
      className={`${className} transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
    />
  );
}
