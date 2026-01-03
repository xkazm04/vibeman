import { FolderOpen, Code, Server, Layers, Gem, Globe } from 'lucide-react';

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
    value: 'react' as const,
    label: 'React',
    icon: Code,
    color: 'text-cyan-400',
    defaultScript: 'npm run dev',
    defaultPort: 3000
  },
  {
    value: 'express' as const,
    label: 'Express',
    icon: Server,
    color: 'text-yellow-400',
    defaultScript: 'npm start',
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
    value: 'django' as const,
    label: 'Django',
    icon: Globe,
    color: 'text-emerald-400',
    defaultScript: 'python manage.py runserver',
    defaultPort: 8000
  },
  {
    value: 'rails' as const,
    label: 'Rails',
    icon: Gem,
    color: 'text-red-400',
    defaultScript: 'rails server',
    defaultPort: 3000
  },
  {
    value: 'combined' as const,
    label: 'Combined',
    icon: Layers,
    color: 'text-purple-400',
    defaultScript: 'npm run dev',
    defaultPort: 3000
  },
  {
    value: 'generic' as const,
    label: 'Generic',
    icon: FolderOpen,
    color: 'text-gray-400',
    defaultScript: 'npm start',
    defaultPort: 3000
  }
] as const;
