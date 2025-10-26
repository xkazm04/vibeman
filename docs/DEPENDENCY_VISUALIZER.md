# Cross-Project Dependency Visualizer

## Overview

The Cross-Project Dependency Visualizer is a powerful feature that maps shared modules and libraries across multiple projects, highlighting overlapping dependencies and identifying potential refactoring opportunities. This tool helps development teams improve code maintainability, identify duplicated code, plan shared libraries, and ultimately achieve cost savings.

## Features

### 1. **Multi-Project Dependency Scanning**
- Scan multiple projects simultaneously to analyze their dependencies
- Support for npm (Node.js), Python (requirements.txt), and other package managers
- Automatic detection of package.json and requirements.txt files
- Real-time progress tracking during scans

### 2. **Interactive Dependency Graph**
- Visual representation of project dependencies using D3.js
- Color-coded nodes by type:
  - **Purple**: Projects
  - **Green**: Dependencies
  - **Amber**: Shared dependencies (used across multiple projects)
  - **Red**: Code duplicates
- Interactive features:
  - Drag nodes to rearrange the graph
  - Zoom and pan for detailed exploration
  - Hover to highlight connected nodes
  - Click for detailed information

### 3. **Shared Dependency Analysis**
- Identifies dependencies used across multiple projects
- Detects version conflicts
- Prioritizes refactoring opportunities:
  - **Critical**: Version conflicts across 4+ projects
  - **High**: Version conflicts across 2-3 projects
  - **Medium**: Shared across 5+ projects (same version)
  - **Low**: Shared across fewer projects
- Provides actionable refactoring suggestions

### 4. **Code Duplicate Detection**
- Scans source code for duplicate patterns:
  - Functions
  - Classes
  - React components
  - Utility modules
- Calculates similarity scores
- Estimates potential code savings (lines of code, file count)
- Provides refactoring suggestions for each duplicate

### 5. **Relationship Mapping**
- Maps inter-project dependencies (imports, exports, API calls)
- Visualizes module relationships
- Tracks connection strength (number of references)

### 6. **Export & Sharing**
- Export scan results in multiple formats:
  - **JSON**: Complete data for programmatic use
  - **CSV**: Tabular data for spreadsheet analysis
  - **Markdown**: Human-readable reports with recommendations
- Share insights with team members
- Track historical scans for trend analysis

## Architecture

### Database Schema

The feature uses a dedicated SQLite database (`dependencies.db`) with the following tables:

1. **dependency_scans**: Stores scan metadata
2. **project_dependencies**: Individual project dependencies
3. **shared_dependencies**: Dependencies shared across projects
4. **code_duplicates**: Detected code duplication patterns
5. **dependency_relationships**: Inter-project module relationships

### API Endpoints

- `POST /api/dependencies/scan`: Start a new dependency scan
- `GET /api/dependencies/scans`: List all scans
- `GET /api/dependencies/[scanId]`: Get detailed scan results
- `DELETE /api/dependencies/[scanId]`: Delete a scan
- `GET /api/dependencies/[scanId]/export`: Export scan data

### Core Services

- **dependencyScanner.ts**: Analyzes project files and detects dependencies
- **dependency_database.ts**: Database operations for dependency data
- **DependencyGraph.tsx**: Interactive D3.js graph visualization
- **DependencyVisualizer.tsx**: Main UI component with controls

## Usage Guide

### Starting a Scan

1. Click the floating **Dependency Visualizer** button (bottom-right corner)
2. Select at least 2 projects from the project list
3. Click **Start Scan**
4. Wait for the scan to complete (progress bar shows status)

### Viewing Results

Once a scan completes, you can explore the results in four tabs:

#### 1. Dependency Graph Tab
- Visual network diagram of all dependencies
- Drag nodes to reorganize
- Hover over nodes for quick info
- Click nodes for detailed metadata

#### 2. Shared Dependencies Tab
- List of dependencies used across multiple projects
- Priority badges (low/medium/high/critical)
- Version conflict warnings with project-specific versions
- Refactoring opportunity suggestions

#### 3. Code Duplicates Tab
- List of duplicated code patterns
- Similarity scores and occurrence counts
- Code snippets with file locations
- Estimated savings calculations
- Refactoring suggestions

#### 4. Relationships Tab
- Inter-project module relationships
- Connection types (imports, exports, API calls)
- Strength indicators (number of references)

### Exporting Results

Click one of the export buttons in the top-right:
- **Export JSON**: Full data structure
- **Export CSV**: Spreadsheet-friendly format
- **Export MD**: Formatted markdown report

### Managing Scans

- **Load Previous Scan**: Click 📊 button next to a scan in the sidebar
- **Delete Scan**: Click 🗑️ button to remove a scan
- **View Scan History**: Sidebar shows all previous scans with metadata

## Implementation Guidelines

### Adding New Dependency Types

To support additional package managers, extend `scanProjectDependencies` in `dependencyScanner.ts`:

```typescript
// Example: Add support for Cargo (Rust)
const cargoPath = path.join(projectPath, 'Cargo.toml');
if (fs.existsSync(cargoPath)) {
  // Parse Cargo.toml and extract dependencies
  // Add to dependencies array
}
```

### Customizing Code Pattern Detection

Modify `extractCodePatterns` function to detect additional patterns:

```typescript
// Example: Detect TypeScript interfaces
const interfaceRegex = /interface\s+(\w+)\s*\{/g;
// Add extraction logic
```

### Adjusting Graph Layout

Modify D3.js force simulation parameters in `DependencyGraph.tsx`:

```typescript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links)
    .distance(100) // Adjust distance between nodes
    .strength(0.5) // Adjust link strength
  )
  .force('charge', d3.forceManyBody().strength(-300)) // Adjust repulsion
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(40)); // Adjust collision radius
```

## Performance Considerations

- **Large Codebases**: Scanning limits to 200 lines per code block to prevent memory issues
- **File Exclusions**: Automatically excludes `node_modules`, `.git`, `dist`, `build`, etc.
- **Depth Limits**: Directory scanning limited to 10 levels deep
- **Batch Operations**: Database uses transactions for bulk inserts

## Refactoring Recommendations

The visualizer automatically generates recommendations based on:

1. **Version Conflicts**: Standardize versions across projects
2. **High Usage**: Extract to shared library when used in 3+ projects
3. **Code Duplicates**: Create utility modules or shared components
4. **Import Patterns**: Consider API consolidation for heavy inter-project imports

## Example Use Cases

### 1. Monorepo Management
Identify which packages are shared across workspace projects and consolidate them into a shared package.

### 2. Microservices Architecture
Map dependencies between microservices to identify tight coupling and refactoring opportunities.

### 3. Code Quality Improvement
Find duplicated utility functions and consolidate them to reduce technical debt.

### 4. Dependency Upgrade Planning
Identify version conflicts before planning major dependency upgrades.

### 5. Shared Library Extraction
Determine which code patterns appear frequently enough to justify extraction into a shared library.

## Troubleshooting

### Scan Fails with "Project path does not exist"
- Verify project paths in the projects database are correct
- Check that projects are properly configured in Project Manager

### Graph Not Rendering
- Ensure D3.js is properly installed (`npm install d3 @types/d3`)
- Check browser console for errors
- Verify scan completed successfully

### Missing Dependencies
- Ensure package.json or requirements.txt exists in project root
- Check file permissions for project directories
- Verify project type is correctly set (nextjs, fastapi, etc.)

### Slow Performance
- Reduce number of projects in a single scan
- Exclude large binary files or generated code directories
- Consider scanning smaller subsets of codebases

## Future Enhancements

Potential improvements for future versions:

1. **AI-Powered Suggestions**: Use LLM to generate detailed refactoring plans
2. **Automated Refactoring**: Generate pull requests for common refactoring patterns
3. **Trend Analysis**: Track dependency changes over time
4. **Cost Estimation**: Calculate actual cost savings from refactoring
5. **Integration with CI/CD**: Automatic scans on code changes
6. **Similarity Search**: Find similar code even with minor variations (fuzzy matching)
7. **Dependency Health Scores**: Rate dependencies by maintenance, security, and popularity

## Technical Details

### Dependency Detection Algorithm

1. **Package Manager Files**: Parse package.json, requirements.txt, etc.
2. **Import Statement Analysis**: Scan source files for import/require statements
3. **Usage Tracking**: Count occurrences of each dependency
4. **Pattern Extraction**: Identify code patterns using regex and AST analysis
5. **Hash Comparison**: Compare code patterns using MD5 hashes (normalized for whitespace)

### Graph Layout Algorithm

Uses D3.js force-directed graph layout:
- **Force Link**: Attracts connected nodes
- **Force Charge**: Repels all nodes from each other
- **Force Center**: Pulls nodes toward the center
- **Force Collision**: Prevents node overlap

### Priority Calculation

```typescript
if (versionConflicts) {
  priority = projectCount > 3 ? 'critical' : 'high';
} else {
  priority = projectCount > 5 ? 'medium' : 'low';
}
```

## Contributing

To extend this feature:

1. Add new dependency type support in `dependencyScanner.ts`
2. Create new database tables in `dependency_database.ts`
3. Add new visualization types in `DependencyGraph.tsx`
4. Update API endpoints as needed
5. Add documentation for new features

## References

- **D3.js Documentation**: https://d3js.org/
- **Force-Directed Graph**: https://github.com/d3/d3-force
- **Code Similarity Detection**: https://en.wikipedia.org/wiki/Code_smell
- **Dependency Analysis**: https://en.wikipedia.org/wiki/Dependency_analysis

---

*Generated as part of Vibeman's Cross-Project Dependency Visualizer feature*
