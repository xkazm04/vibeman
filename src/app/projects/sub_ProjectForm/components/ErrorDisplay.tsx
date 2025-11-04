import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}
