# Requirements Document

## Introduction

This document specifies the requirements for refactoring the Vibeman codebase to replace hardcoded Tailwind color classes (specifically `cyan` and related colors) with theme tokens. The refactoring aims to enable consistent theme switching across the application while improving code modularity by extracting UI components from files exceeding 200 lines of code.

## Glossary

- **Theme Token**: A semantic color variable defined in the theme store (e.g., `colors.text`, `colors.border`) that maps to actual Tailwind classes based on the active theme
- **Hardcoded Color**: A direct Tailwind color class (e.g., `text-cyan-400`, `bg-cyan-500/20`) used inline in components
- **Theme Store**: The Zustand store (`themeStore.ts`) that manages theme state and provides color configurations
- **ThemeColors**: The interface defining all available color tokens for theming
- **Component Extraction**: The process of separating UI logic into smaller, focused components for better modularity

## Requirements

### Requirement 1

**User Story:** As a developer, I want to identify all files containing hardcoded cyan color classes, so that I can systematically replace them with theme tokens.

#### Acceptance Criteria

1. WHEN the refactoring process begins THEN the system SHALL scan all source files and identify files containing Tailwind `cyan` color class patterns
2. WHEN a file is identified as containing cyan colors THEN the system SHALL catalog the specific color classes used (e.g., `cyan-300`, `cyan-400`, `cyan-500`)
3. WHEN the scan completes THEN the system SHALL produce a manifest of all affected files with their cyan color usage patterns

### Requirement 2

**User Story:** As a developer, I want hardcoded cyan colors replaced with theme tokens, so that the application supports dynamic theme switching.

#### Acceptance Criteria

1. WHEN a component uses a hardcoded cyan text color (e.g., `text-cyan-300`) THEN the system SHALL replace the hardcoded class with the corresponding theme token from `getThemeColors().text`
2. WHEN a component uses a hardcoded cyan border color (e.g., `border-cyan-500/30`) THEN the system SHALL replace the hardcoded class with the corresponding theme token from `getThemeColors().border`
3. WHEN a component uses a hardcoded cyan background color (e.g., `bg-cyan-500/10`) THEN the system SHALL replace the hardcoded class with the corresponding theme token from `getThemeColors().bg`
4. WHEN a component uses a hardcoded cyan glow/shadow (e.g., `shadow-cyan-500/50`) THEN the system SHALL replace the hardcoded class with the corresponding theme token from `getThemeColors().glow`
5. WHEN a component uses a hardcoded cyan gradient (e.g., `from-cyan-500`) THEN the system SHALL replace the hardcoded class with the corresponding theme token from `getThemeColors().primaryFrom`

### Requirement 3

**User Story:** As a developer, I want components to access theme colors through the theme store, so that color changes propagate automatically when themes switch.

#### Acceptance Criteria

1. WHEN a component requires theme colors THEN the component SHALL import and use `useThemeStore` hook to access colors
2. WHEN the theme store provides colors THEN the component SHALL destructure the required color tokens from `getThemeColors()`
3. WHEN a theme change occurs THEN all components using theme tokens SHALL re-render with the new color values

### Requirement 4

**User Story:** As a developer, I want files exceeding 200 lines to have their UI components extracted, so that the codebase maintains good modularity.

#### Acceptance Criteria

1. WHEN a file modified during refactoring exceeds 200 lines of code THEN the system SHALL identify extractable UI components within that file
2. WHEN extractable UI components are identified THEN the system SHALL create separate component files in an appropriate location
3. WHEN a component is extracted THEN the original file SHALL import and use the extracted component
4. WHEN a component is extracted THEN the extracted component SHALL maintain all original functionality and props interface

### Requirement 5

**User Story:** As a developer, I want the refactoring to preserve existing functionality, so that the application behaves identically after the changes.

#### Acceptance Criteria

1. WHEN colors are replaced with theme tokens THEN the visual appearance with the default theme (midnight) SHALL remain identical to the original
2. WHEN components are extracted THEN all event handlers and state management SHALL continue to function correctly
3. WHEN the refactoring is complete THEN all existing tests SHALL pass without modification

### Requirement 6

**User Story:** As a developer, I want a consistent pattern for theme token usage, so that future development follows the same conventions.

#### Acceptance Criteria

1. WHEN theme colors are used in a component THEN the component SHALL follow the pattern of calling `useThemeStore()` and destructuring `getThemeColors()`
2. WHEN dynamic class names are constructed THEN the component SHALL use template literals or string concatenation with theme tokens
3. WHEN a component file is created or modified THEN the component SHALL include a comment indicating theme token usage if applicable
