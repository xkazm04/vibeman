import { FolderOpen, Code, Server } from 'lucide-react';

export const PROJECT_TYPES = [
  {
    value: 'nextjs' as const,
    label: 'Next.js',
    icon: Code,
    color: 'text-blue-400',
    defaultScript: 'npm run dev',
    defaultPort: 3000
  },
  {
    value: 'fastapi' as const,
    label: 'FastAPI',
    icon: Server,
    color: 'text-green-400',
    defaultScript: 'uvicorn main:app --reload',
    defaultPort: 8000
  },
  {
    value: 'other' as const,
    label: 'Other',
    icon: FolderOpen,
    color: 'text-gray-400',
    defaultScript: 'npm start',
    defaultPort: 3000
  }
] as const;
