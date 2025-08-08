// File API utilities for loading and saving files

export interface FileApiResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface SaveFileResponse {
  success: boolean;
  error?: string;
}

/**
 * Load file content from the server
 */
export const loadFileContent = async (filePath: string): Promise<string> => {
  try {
    const response = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error loading file:', error);
    
    // Return placeholder content for demo purposes
    const fileName = filePath.split('/').pop() || 'unknown';
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    return generatePlaceholderContent(filePath, extension);
  }
};

/**
 * Save file content to the server
 */
export const saveFileContent = async (filePath: string, content: string): Promise<void> => {
  try {
    const response = await fetch('/api/files/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: filePath,
        content,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save file: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

/**
 * Generate placeholder content based on file type
 */
const generatePlaceholderContent = (filePath: string, extension?: string): string => {
  const fileName = filePath.split('/').pop() || 'unknown';
  
  const templates: Record<string, string> = {
    'ts': `// ${fileName}
// TypeScript file

interface ExampleInterface {
  id: string;
  name: string;
  value: number;
}

export class ExampleClass implements ExampleInterface {
  constructor(
    public id: string,
    public name: string,
    public value: number
  ) {}

  public getValue(): number {
    return this.value;
  }

  public setValue(newValue: number): void {
    this.value = newValue;
  }
}

export default ExampleClass;`,

    'tsx': `// ${fileName}
// React TypeScript component

import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
  onAction?: () => void;
}

export default function ExampleComponent({ title, onAction }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Component mounted');
  }, []);

  const handleClick = () => {
    setCount(prev => prev + 1);
    onAction?.();
  };

  return (
    <div className="example-component">
      <h2>{title}</h2>
      <p>Count: {count}</p>
      <button onClick={handleClick}>
        Increment
      </button>
    </div>
  );
}`,

    'js': `// ${fileName}
// JavaScript file

class ExampleClass {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  getValue() {
    return this.value;
  }

  setValue(newValue) {
    this.value = newValue;
  }

  toString() {
    return \`\${this.name}: \${this.value}\`;
  }
}

// Export for use in other modules
module.exports = ExampleClass;`,

    'jsx': `// ${fileName}
// React JavaScript component

import React, { useState } from 'react';

function ExampleComponent({ title, items = [] }) {
  const [selectedItem, setSelectedItem] = useState(null);

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  return (
    <div className="example-component">
      <h2>{title}</h2>
      <ul>
        {items.map((item, index) => (
          <li 
            key={index}
            onClick={() => handleItemClick(item)}
            className={selectedItem === item ? 'selected' : ''}
          >
            {item}
          </li>
        ))}
      </ul>
      {selectedItem && (
        <p>Selected: {selectedItem}</p>
      )}
    </div>
  );
}

export default ExampleComponent;`,

    'css': `/* ${fileName} */
/* Stylesheet */

.example-component {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.example-component h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.5rem;
}

.example-component ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.example-component li {
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.example-component li:hover {
  background-color: #e0e0e0;
}

.example-component li.selected {
  background-color: #007bff;
  color: white;
}`,

    'json': `{
  "name": "${fileName.replace('.json', '')}",
  "version": "1.0.0",
  "description": "Example JSON configuration",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest",
    "build": "webpack --mode production"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "webpack": "^5.0.0",
    "jest": "^29.0.0"
  },
  "keywords": ["example", "demo", "placeholder"],
  "author": "Developer",
  "license": "MIT"
}`,

    'md': `# ${fileName.replace('.md', '')}

This is a placeholder markdown file for demonstration purposes.

## Features

- **Bold text** and *italic text*
- [Links](https://example.com)
- Code blocks and \`inline code\`

## Code Example

\`\`\`javascript
function example() {
  console.log('Hello, World!');
}
\`\`\`

## List Items

1. First item
2. Second item
3. Third item

- Bullet point
- Another bullet point

## Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |

> This is a blockquote with some example content.`,

    'py': `# ${fileName}
# Python file

class ExampleClass:
    """Example Python class for demonstration."""
    
    def __init__(self, name: str, value: int):
        self.name = name
        self.value = value
    
    def get_value(self) -> int:
        """Get the current value."""
        return self.value
    
    def set_value(self, new_value: int) -> None:
        """Set a new value."""
        self.value = new_value
    
    def __str__(self) -> str:
        return f"{self.name}: {self.value}"

def main():
    """Main function."""
    example = ExampleClass("test", 42)
    print(example)
    
    example.set_value(100)
    print(f"Updated value: {example.get_value()}")

if __name__ == "__main__":
    main()`,
  };

  return templates[extension || 'txt'] || `// ${fileName}
// File: ${filePath}
// This is placeholder content for demonstration purposes.
// In a real implementation, this would load the actual file content.

const example = {
  message: "Hello World",
  timestamp: new Date().toISOString(),
  filePath: "${filePath}"
};

console.log(example);`;
};

/**
 * Check if a file exists
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/files/exists?path=${encodeURIComponent(filePath)}`);
    const data = await response.json();
    return data.exists || false;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (filePath: string): Promise<{
  size: number;
  lastModified: Date;
  exists: boolean;
} | null> => {
  try {
    const response = await fetch(`/api/files/metadata?path=${encodeURIComponent(filePath)}`);
    const data = await response.json();
    
    if (!data.exists) {
      return null;
    }
    
    return {
      size: data.size || 0,
      lastModified: new Date(data.lastModified || Date.now()),
      exists: true,
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return null;
  }
};