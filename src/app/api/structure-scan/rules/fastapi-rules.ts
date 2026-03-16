/**
 * FastAPI Structure Rules
 *
 * Defines expected file/folder patterns for FastAPI projects.
 * These rules are used by the structure scanner to detect violations and
 * generate guidelines for AI-assisted development.
 *
 * Rule format:
 *   pattern     - Glob pattern to match files/folders
 *   description - What should exist at this location (used by LLMs for context)
 *   required    - Whether this pattern is mandatory (default: false)
 *   examples    - Example file paths matching this pattern
 *   context     - Whether this pattern defines a scannable context boundary
 */

import type { StructureRule } from '../structureTemplates';

/** Structure rules for FastAPI projects */
export const FASTAPI_RULES: StructureRule[] = [
  // Core application
  {
    pattern: 'app/**',
    description: 'Main application code. All Python modules should be under app/ directory.',
    required: true,
    examples: ['app/main.py', 'app/__init__.py'],
  },
  {
    pattern: 'app/main.py',
    description:
      'FastAPI application entry point with app instance and startup configuration.',
    required: true,
  },

  // API routes
  {
    pattern: 'app/api/**',
    description:
      'API route handlers organized by domain/resource. Each router should handle a specific entity.',
    required: true,
    examples: ['app/api/users.py', 'app/api/items.py', 'app/api/auth.py'],
  },
  {
    pattern: 'app/api/__init__.py',
    description: 'API router initialization and aggregation.',
    required: true,
  },

  // Models and schemas
  {
    pattern: 'app/models/**',
    description:
      'Pydantic models for request/response validation and database models (SQLAlchemy/etc).',
    required: true,
    examples: ['app/models/user.py', 'app/models/item.py'],
  },
  {
    pattern: 'app/schemas/**',
    description:
      'Pydantic schemas for API request/response validation, separate from database models.',
    required: false,
    examples: ['app/schemas/user.py', 'app/schemas/item.py'],
  },

  // Services and business logic
  {
    pattern: 'app/services/**',
    description:
      'Business logic layer. Services should contain the core application logic, separate from API routes.',
    required: true,
    context: true,
    examples: ['app/services/user_service.py', 'app/services/auth_service.py'],
  },

  // Database
  {
    pattern: 'app/db/**',
    description: 'Database configuration, connection management, and session handling.',
    required: false,
    examples: ['app/db/database.py', 'app/db/session.py'],
  },
  {
    pattern: 'app/crud/**',
    description:
      'CRUD operations for database entities. Each file handles database operations for a specific model.',
    required: false,
    examples: ['app/crud/user.py', 'app/crud/item.py'],
  },

  // Core configuration
  {
    pattern: 'app/core/**',
    description: 'Core configuration, settings, security, and shared utilities.',
    required: true,
    examples: ['app/core/config.py', 'app/core/security.py', 'app/core/deps.py'],
  },
  {
    pattern: 'app/core/config.py',
    description: 'Application configuration using Pydantic BaseSettings.',
    required: true,
  },

  // Dependencies
  {
    pattern: 'requirements.txt',
    description: 'Python dependencies for the project.',
    required: true,
  },

  // Anti-patterns
  {
    pattern: 'app/utils/**',
    description:
      'AVOID: Use app/core/ or app/services/ instead of utils/ for better organization.',
    required: false,
  },
  {
    pattern: 'app/helpers/**',
    description:
      'AVOID: Use app/core/ or app/services/ instead of helpers/ for better organization.',
    required: false,
  },
  {
    pattern: '*.py (root level)',
    description:
      'AVOID: Python files in root directory. Keep application code under app/ directory.',
    required: false,
  },
];
