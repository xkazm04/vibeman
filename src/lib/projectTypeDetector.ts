import * as fs from 'fs';
import * as path from 'path';

export type ProjectType =
  | 'nextjs'
  | 'react'
  | 'express'
  | 'fastapi'
  | 'django'
  | 'rails'
  | 'generic'
  | 'combined';

export interface ProjectTypeResult {
  primary: ProjectType;
  secondary?: ProjectType;
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
}

/**
 * Detects project type based on file presence and package contents.
 * Returns detailed result with confidence level and indicators found.
 */
export async function detectProjectType(projectPath: string): Promise<ProjectTypeResult> {
  const indicators: string[] = [];
  let frontendType: ProjectType | null = null;
  let backendType: ProjectType | null = null;

  // Check for Node.js project files
  const packageJsonPath = path.join(projectPath, 'package.json');
  const hasPackageJson = fs.existsSync(packageJsonPath);

  // Check for Python project files
  const pyprojectPath = path.join(projectPath, 'pyproject.toml');
  const requirementsPath = path.join(projectPath, 'requirements.txt');
  const hasPyproject = fs.existsSync(pyprojectPath);
  const hasRequirements = fs.existsSync(requirementsPath);

  // Check for Ruby project files
  const gemfilePath = path.join(projectPath, 'Gemfile');
  const hasGemfile = fs.existsSync(gemfilePath);

  // Node.js detection
  if (hasPackageJson) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Next.js detection
      if (deps['next']) {
        const nextConfigExists =
          fs.existsSync(path.join(projectPath, 'next.config.js')) ||
          fs.existsSync(path.join(projectPath, 'next.config.mjs')) ||
          fs.existsSync(path.join(projectPath, 'next.config.ts'));

        if (nextConfigExists) {
          indicators.push('next.config.* found');
        }
        indicators.push('next in dependencies');
        frontendType = 'nextjs';
      }
      // React (non-Next.js) detection
      else if (deps['react'] && !deps['next']) {
        indicators.push('react in dependencies (no next)');

        // Check for Vite or CRA
        if (deps['vite']) {
          indicators.push('vite bundler detected');
        } else if (deps['react-scripts']) {
          indicators.push('create-react-app detected');
        }
        frontendType = 'react';
      }

      // Express.js detection
      if (deps['express']) {
        indicators.push('express in dependencies');
        backendType = 'express';
      }
    } catch {
      indicators.push('package.json parse error');
    }
  }

  // Python detection
  if (hasPyproject || hasRequirements) {
    try {
      let pythonDeps = '';

      if (hasPyproject) {
        pythonDeps = fs.readFileSync(pyprojectPath, 'utf-8').toLowerCase();
        indicators.push('pyproject.toml found');
      }
      if (hasRequirements) {
        pythonDeps += fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
        indicators.push('requirements.txt found');
      }

      // FastAPI detection
      if (pythonDeps.includes('fastapi')) {
        indicators.push('fastapi in dependencies');
        backendType = 'fastapi';
      }
      // Django detection
      else if (pythonDeps.includes('django')) {
        indicators.push('django in dependencies');
        // Additional Django confirmation
        const manageExists = fs.existsSync(path.join(projectPath, 'manage.py'));
        if (manageExists) {
          indicators.push('manage.py found');
        }
        backendType = 'django';
      }
    } catch {
      indicators.push('Python config parse error');
    }
  }

  // Ruby/Rails detection
  if (hasGemfile) {
    try {
      const gemfileContent = fs.readFileSync(gemfilePath, 'utf-8').toLowerCase();
      indicators.push('Gemfile found');

      if (gemfileContent.includes('rails')) {
        indicators.push('rails in Gemfile');
        backendType = 'rails';
      }
    } catch {
      indicators.push('Gemfile parse error');
    }
  }

  // Determine result
  if (frontendType && backendType) {
    return {
      primary: 'combined',
      secondary: frontendType,
      confidence: 'high',
      indicators
    };
  }

  if (frontendType) {
    return {
      primary: frontendType,
      confidence: indicators.length >= 2 ? 'high' : 'medium',
      indicators
    };
  }

  if (backendType) {
    return {
      primary: backendType,
      confidence: indicators.length >= 2 ? 'high' : 'medium',
      indicators
    };
  }

  // Check for generic patterns if no framework detected
  const srcExists = fs.existsSync(path.join(projectPath, 'src'));
  const libExists = fs.existsSync(path.join(projectPath, 'lib'));

  if (srcExists) indicators.push('src directory found');
  if (libExists) indicators.push('lib directory found');

  return {
    primary: 'generic',
    confidence: 'low',
    indicators: indicators.length > 0 ? indicators : ['No framework indicators found']
  };
}

/**
 * Simple synchronous version for quick checks.
 * Returns just the primary project type.
 */
export function detectProjectTypeSync(projectPath: string): ProjectType {
  try {
    let frontendType: ProjectType | null = null;
    let backendType: ProjectType | null = null;

    const packageJsonPath = path.join(projectPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['next']) frontendType = 'nextjs';
      else if (deps['react']) frontendType = 'react';

      if (deps['express']) backendType = 'express';
    }

    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    const requirementsPath = path.join(projectPath, 'requirements.txt');

    if (fs.existsSync(pyprojectPath) || fs.existsSync(requirementsPath)) {
      let content = '';
      if (fs.existsSync(pyprojectPath)) {
        content += fs.readFileSync(pyprojectPath, 'utf-8').toLowerCase();
      }
      if (fs.existsSync(requirementsPath)) {
        content += fs.readFileSync(requirementsPath, 'utf-8').toLowerCase();
      }

      if (content.includes('fastapi')) backendType = 'fastapi';
      else if (content.includes('django')) backendType = 'django';
    }

    if (fs.existsSync(path.join(projectPath, 'Gemfile'))) {
      const gemfile = fs.readFileSync(path.join(projectPath, 'Gemfile'), 'utf-8');
      if (gemfile.toLowerCase().includes('rails')) backendType = 'rails';
    }

    // Check for Go projects
    if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
      backendType = 'generic';
    }

    // Check for Rust projects
    if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
      backendType = 'generic';
    }

    // Check for Java/Spring projects
    if (fs.existsSync(path.join(projectPath, 'pom.xml')) ||
        fs.existsSync(path.join(projectPath, 'build.gradle'))) {
      backendType = 'generic';
    }

    // Determine final type
    if (frontendType && backendType) return 'combined';
    if (frontendType) return frontendType;
    if (backendType) return backendType;

    return 'generic';
  } catch {
    return 'generic';
  }
}

/**
 * Returns human-readable label for project type.
 */
export function getProjectTypeLabel(type: ProjectType): string {
  const labels: Record<ProjectType, string> = {
    nextjs: 'Next.js',
    react: 'React',
    express: 'Express.js',
    fastapi: 'FastAPI',
    django: 'Django',
    rails: 'Ruby on Rails',
    generic: 'Generic',
    combined: 'Full-Stack'
  };
  return labels[type];
}

/**
 * Returns icon name for project type (Lucide icon).
 */
export function getProjectTypeIcon(type: ProjectType): string {
  const icons: Record<ProjectType, string> = {
    nextjs: 'Triangle',      // Next.js triangle logo
    react: 'Atom',           // React atom
    express: 'Server',       // Backend server
    fastapi: 'Zap',          // Fast lightning
    django: 'Database',      // Django ORM focus
    rails: 'Train',          // Rails
    generic: 'Folder',       // Generic folder
    combined: 'Layers'       // Stacked layers
  };
  return icons[type];
}

/**
 * Returns theme color for project type badge.
 */
export function getProjectTypeColor(type: ProjectType): string {
  const colors: Record<ProjectType, string> = {
    nextjs: '#000000',       // Next.js black
    react: '#61DAFB',        // React blue
    express: '#68A063',      // Express green
    fastapi: '#009688',      // FastAPI teal
    django: '#092E20',       // Django green
    rails: '#CC0000',        // Rails red
    generic: '#6B7280',      // Gray
    combined: '#8B5CF6'      // Purple for full-stack
  };
  return colors[type];
}

/**
 * Returns Tailwind CSS classes for project type badge.
 */
export function getProjectTypeBadgeClasses(type: ProjectType): string {
  const classes: Record<ProjectType, string> = {
    nextjs: 'bg-black text-white',
    react: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    express: 'bg-green-500/20 text-green-400 border-green-500/30',
    fastapi: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    django: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rails: 'bg-red-500/20 text-red-400 border-red-500/30',
    generic: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    combined: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return classes[type] || classes.generic;
}

/**
 * Check if a project type is a backend type.
 */
export function isBackendType(type: ProjectType): boolean {
  return ['express', 'fastapi', 'django', 'rails', 'generic'].includes(type);
}

/**
 * Check if a project type is a frontend type.
 */
export function isFrontendType(type: ProjectType): boolean {
  return ['nextjs', 'react'].includes(type);
}

/**
 * Get available scan types for a project type.
 * Different project types support different scan capabilities.
 */
export function getAvailableScanTypes(type: ProjectType): string[] {
  const common = ['build', 'structure', 'contexts', 'vision', 'security'];

  const typeSpecific: Record<ProjectType, string[]> = {
    nextjs: [...common, 'photo', 'selectors', 'a11y', 'performance'],
    react: [...common, 'photo', 'selectors', 'a11y', 'performance'],
    express: [...common, 'api-docs', 'routes'],
    fastapi: [...common, 'api-docs', 'endpoints'],
    django: [...common, 'api-docs', 'models', 'admin'],
    rails: [...common, 'api-docs', 'models', 'routes'],
    generic: common,
    combined: [...common, 'photo', 'selectors', 'api-docs'],
  };

  return typeSpecific[type] || common;
}

/**
 * Get emoji icon for project type.
 */
export function getProjectTypeEmoji(type: ProjectType): string {
  const emojis: Record<ProjectType, string> = {
    nextjs: '▲',
    react: '⚛️',
    express: '🚂',
    fastapi: '⚡',
    django: '🎸',
    rails: '💎',
    generic: '📦',
    combined: '🔗',
  };
  return emojis[type] || '📦';
}

/**
 * Get detailed description for project type.
 */
export function getProjectTypeDescription(type: ProjectType): string {
  const descriptions: Record<ProjectType, string> = {
    nextjs: 'React framework with server-side rendering and API routes',
    react: 'JavaScript library for building user interfaces',
    express: 'Fast, unopinionated web framework for Node.js',
    fastapi: 'Modern, fast Python web framework for building APIs',
    django: 'High-level Python web framework for rapid development',
    rails: 'Ruby web application framework following MVC pattern',
    generic: 'Standard project structure with common patterns',
    combined: 'Full-stack project with frontend and backend',
  };
  return descriptions[type] || 'Unknown project type';
}
