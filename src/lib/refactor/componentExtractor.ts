/**
 * Component Extractor
 * 
 * Identifies extractable JSX blocks (render functions, large return statements)
 * and generates new component files with proper props interface.
 * 
 * Requirements: 4.2, 4.3, 4.4
 */

/**
 * Definition of a prop for an extracted component
 */
export interface PropDefinition {
  name: string;
  type: string;
  optional: boolean;
}

/**
 * Candidate for extraction from a file
 */
export interface ExtractionCandidate {
  name: string;
  startLine: number;
  endLine: number;
  props: PropDefinition[];
  dependencies: string[];
  jsxContent: string;
}

/**
 * Result of extracting a component
 */
export interface ExtractedComponent {
  name: string;
  filePath: string;
  content: string;
  props: PropDefinition[];
}

/**
 * Result of the extraction process
 */
export interface ExtractionResult {
  originalFile: string;
  originalContent: string;
  updatedContent: string;
  extractedComponents: ExtractedComponent[];
  importStatements: string[];
}

/**
 * Regex patterns for identifying extractable JSX blocks
 */
const RENDER_FUNCTION_PATTERN = /const\s+render(\w+)\s*=\s*\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{?/g;
const LARGE_JSX_RETURN_PATTERN = /return\s*\(\s*<[\s\S]*?>\s*[\s\S]*?<\/[\s\S]*?>\s*\)/g;


/**
 * Extracts variable references from JSX content to determine props
 */
export function extractVariableReferences(jsxContent: string): string[] {
  const references: Set<string> = new Set();
  
  // Match {variableName} patterns in JSX
  const curlyBracePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let match;
  while ((match = curlyBracePattern.exec(jsxContent)) !== null) {
    references.add(match[1]);
  }
  
  // Match prop={variableName} patterns
  const propPattern = /\w+\s*=\s*\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  while ((match = propPattern.exec(jsxContent)) !== null) {
    references.add(match[1]);
  }
  
  // Match onClick={handleX} patterns
  const handlerPattern = /on\w+\s*=\s*\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  while ((match = handlerPattern.exec(jsxContent)) !== null) {
    references.add(match[1]);
  }
  
  return Array.from(references);
}

/**
 * Infers prop types from variable usage patterns
 */
export function inferPropType(varName: string, jsxContent: string): string {
  // Check for event handler patterns
  if (varName.startsWith('handle') || varName.startsWith('on')) {
    return '() => void';
  }
  
  // Check for boolean patterns (isX, hasX, showX)
  if (varName.startsWith('is') || varName.startsWith('has') || varName.startsWith('show')) {
    return 'boolean';
  }
  
  // Check for array patterns (items, list, data)
  if (varName.endsWith('s') || varName.endsWith('List') || varName.endsWith('Items')) {
    return 'unknown[]';
  }
  
  // Default to unknown
  return 'unknown';
}

/**
 * Creates prop definitions from variable references
 */
export function createPropDefinitions(
  varRefs: string[],
  jsxContent: string
): PropDefinition[] {
  return varRefs.map(name => ({
    name,
    type: inferPropType(name, jsxContent),
    optional: false,
  }));
}

/**
 * Generates a TypeScript interface for component props
 */
export function generatePropsInterface(
  componentName: string,
  props: PropDefinition[]
): string {
  if (props.length === 0) {
    return '';
  }
  
  const propsLines = props.map(p => 
    `  ${p.name}${p.optional ? '?' : ''}: ${p.type};`
  ).join('\n');
  
  return `interface ${componentName}Props {\n${propsLines}\n}`;
}

/**
 * Generates the extracted component file content
 */
export function generateComponentContent(
  componentName: string,
  props: PropDefinition[],
  jsxContent: string,
  dependencies: string[]
): string {
  const lines: string[] = [];
  
  // Add React import
  lines.push("import React from 'react';");
  
  // Add dependency imports if any
  if (dependencies.length > 0) {
    lines.push(`import { ${dependencies.join(', ')} } from './dependencies';`);
  }
  
  lines.push('');
  
  // Add props interface
  const propsInterface = generatePropsInterface(componentName, props);
  if (propsInterface) {
    lines.push(propsInterface);
    lines.push('');
  }
  
  // Add component definition
  const propsParam = props.length > 0 
    ? `{ ${props.map(p => p.name).join(', ')} }: ${componentName}Props`
    : '';
  
  lines.push(`export function ${componentName}(${propsParam}) {`);
  lines.push(`  return (`);
  
  // Indent JSX content
  const indentedJsx = jsxContent
    .split('\n')
    .map(line => '    ' + line)
    .join('\n');
  lines.push(indentedJsx);
  
  lines.push(`  );`);
  lines.push(`}`);
  
  return lines.join('\n');
}


/**
 * Finds render functions in file content that could be extracted
 */
export function findRenderFunctions(content: string): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = [];
  const lines = content.split('\n');
  
  // Look for const renderX = () => patterns
  const renderPattern = /const\s+(render\w+)\s*=\s*\(/;
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(renderPattern);
    if (match) {
      const functionName = match[1];
      const componentName = functionName.replace('render', '');
      
      // Find the end of this function by tracking braces
      const startLine = i + 1;
      let endLine = startLine;
      let braceCount = 0;
      let foundStart = false;
      
      for (let j = i; j < lines.length; j++) {
        for (const char of lines[j]) {
          if (char === '{') {
            braceCount++;
            foundStart = true;
          } else if (char === '}') {
            braceCount--;
          }
        }
        
        if (foundStart && braceCount === 0) {
          endLine = j + 1;
          break;
        }
      }
      
      // Extract the JSX content
      const jsxContent = lines.slice(i, endLine).join('\n');
      const varRefs = extractVariableReferences(jsxContent);
      const props = createPropDefinitions(varRefs, jsxContent);
      
      candidates.push({
        name: componentName,
        startLine,
        endLine,
        props,
        dependencies: [],
        jsxContent,
      });
    }
  }
  
  return candidates;
}

/**
 * Generates import statement for an extracted component
 */
export function generateImportStatement(
  componentName: string,
  relativePath: string
): string {
  return `import { ${componentName} } from '${relativePath}';`;
}

/**
 * Updates the original file to use the extracted component
 */
export function updateOriginalFile(
  content: string,
  candidate: ExtractionCandidate,
  componentName: string,
  relativePath: string
): string {
  const lines = content.split('\n');
  
  // Add import statement after existing imports
  let lastImportLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportLine = i;
    }
  }
  
  const importStatement = generateImportStatement(componentName, relativePath);
  lines.splice(lastImportLine + 1, 0, importStatement);
  
  // Replace the render function call with component usage
  // This is a simplified replacement - real implementation would need AST
  const renderFunctionName = `render${componentName}`;
  const componentUsage = `<${componentName} ${candidate.props.map(p => `${p.name}={${p.name}}`).join(' ')} />`;
  
  let result = lines.join('\n');
  
  // Replace {renderX()} with <X />
  const callPattern = new RegExp(`\\{${renderFunctionName}\\(\\)\\}`, 'g');
  result = result.replace(callPattern, componentUsage);
  
  return result;
}

/**
 * Extracts components from a file based on candidates
 */
export function extractComponents(
  filePath: string,
  content: string,
  candidates: ExtractionCandidate[],
  outputDir: string
): ExtractionResult {
  const extractedComponents: ExtractedComponent[] = [];
  const importStatements: string[] = [];
  let updatedContent = content;
  
  for (const candidate of candidates) {
    const componentName = candidate.name;
    const componentFileName = `${componentName}.tsx`;
    const componentFilePath = `${outputDir}/${componentFileName}`;
    const relativePath = `./${componentName}`;
    
    // Generate component content
    const componentContent = generateComponentContent(
      componentName,
      candidate.props,
      candidate.jsxContent,
      candidate.dependencies
    );
    
    extractedComponents.push({
      name: componentName,
      filePath: componentFilePath,
      content: componentContent,
      props: candidate.props,
    });
    
    // Generate import statement
    importStatements.push(generateImportStatement(componentName, relativePath));
    
    // Update original file
    updatedContent = updateOriginalFile(
      updatedContent,
      candidate,
      componentName,
      relativePath
    );
  }
  
  return {
    originalFile: filePath,
    originalContent: content,
    updatedContent,
    extractedComponents,
    importStatements,
  };
}

/**
 * Analyzes a file and returns extraction candidates
 */
export function analyzeForExtraction(content: string): ExtractionCandidate[] {
  return findRenderFunctions(content);
}
