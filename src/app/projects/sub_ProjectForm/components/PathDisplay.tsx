import { Lock } from 'lucide-react';

interface PathDisplayProps {
  path: string;
}

export default function PathDisplay({ path }: PathDisplayProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-900/50 border border-gray-700/60 rounded-lg">
      <Lock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">Location (read-only)</p>
        <p className="text-sm text-gray-300 font-mono truncate">{path}</p>
      </div>
    </div>
  );
}
