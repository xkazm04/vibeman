import React, { useState, useEffect } from 'react';
import { MarkdownViewer } from './markdown';

export default function MarkdownDemo() {
  const [demoContent, setDemoContent] = useState<string>('');

  useEffect(() => {
    // In a real app, you'd fetch this from your demo file
    // For now, we'll use a sample content
    const sampleContent = `# Enhanced MarkdownViewer Demo

This document demonstrates all the enhanced features of the new MarkdownViewer component.

## Interactive Content

You can create interactive content using the custom syntax. Try clicking on this {{API Documentation|This is detailed API documentation that appears in a modal window when you click the trigger word.|text}} to see how it works.

Here's an example with a PlantUML diagram: {{System Architecture|@startuml
actor User
participant "Web App" as WA
participant "API Gateway" as AG
participant "Database" as DB

User -> WA: Request
WA -> AG: API Call
AG -> DB: Query
DB -> AG: Response
AG -> WA: Data
WA -> User: Display
@enduml|plantuml}}

## Enhanced Styling

### Code Blocks

\`\`\`javascript
// Enhanced code blocks with better styling
function enhancedMarkdown() {
  const features = [
    'Floating table of contents',
    'Interactive content blocks',
    'PlantUML diagram support',
    'Premium animations',
    'Improved component structure'
  ];
  
  return features.map(feature => ({
    name: feature,
    implemented: true,
    awesome: true
  }));
}
\`\`\`

### Tables

| Feature | Status | Description |
|---------|--------|-------------|
| Table of Contents | ✅ Complete | Floating, auto-generated TOC |
| Interactive Content | ✅ Complete | Click-to-reveal content blocks |
| PlantUML Support | ✅ Complete | Embedded diagram rendering |
| Enhanced Animations | ✅ Complete | Smooth framer-motion transitions |
| Component Refactoring | ✅ Complete | Clean, modular architecture |

### Callouts

:::info
This is an info callout with enhanced styling and animations. It supports **bold text**, *italic text*, and \`inline code\`.
:::

:::success
Success callouts are perfect for highlighting positive outcomes and completed tasks.
:::

:::warning
Warning callouts help draw attention to important information that users should be aware of.
:::

:::error
Error callouts are used to highlight critical issues or problems that need immediate attention.
:::

### Lists

- Enhanced list styling with custom bullets
- Smooth animations for each list item
- Support for **bold** and *italic* text
- Inline \`code\` formatting
- [Links to external resources](https://example.com)

### Blockquotes

> This is an enhanced blockquote with improved styling and visual hierarchy. It supports all inline formatting including **bold text**, *italic text*, and \`inline code\`.

---

## Conclusion

This enhanced MarkdownViewer provides a premium experience with modular architecture, interactive features, and enhanced UX!`;

    setDemoContent(sampleContent);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <MarkdownViewer 
            content={demoContent}
            className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-8 border border-gray-800"
          />
        </div>
      </div>
    </div>
  );
}