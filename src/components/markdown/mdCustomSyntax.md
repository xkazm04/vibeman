# Enhanced MarkdownViewer Custom Syntax

This document describes the custom syntax extensions available in the enhanced MarkdownViewer component.

## Interactive Content Blocks

The MarkdownViewer supports custom interactive content that appears as clickable triggers and expands into modal windows.

### Syntax

```markdown
{{trigger|content|type}}
```

### Parameters

- **trigger**: The clickable text that appears in the document
- **content**: The content that appears in the modal when clicked
- **type**: Either `text` or `plantuml`

### Examples

#### Text Content

```markdown
Click here for {{API Details|This is detailed information about the API that will appear in a modal window.|text}} more information.
```

This creates a clickable "API Details" trigger that opens a modal with the specified text content.

#### PlantUML Diagrams

```markdown
Here's the {{System Architecture|@startuml
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
@enduml|plantuml}} for our system.
```

This creates a clickable "System Architecture" trigger that opens a modal with a rendered PlantUML diagram.

## Standard Markdown Features

All standard markdown features are supported with enhanced styling:

### Headings
```markdown
# H1 Heading
## H2 Heading
### H3 Heading
```

### Code Blocks
```markdown
\`\`\`javascript
function example() {
  return "Enhanced code blocks with syntax highlighting";
}
\`\`\`
```

### Tables
```markdown
| Feature | Status | Description |
|---------|--------|-------------|
| TOC | ✅ | Floating table of contents |
| Interactive | ✅ | Click-to-reveal content |
```

### Callouts
```markdown
:::info
Information callout with enhanced styling
:::

:::success
Success message with green styling
:::

:::warning
Warning message with yellow styling
:::

:::error
Error message with red styling
:::
```

### Lists
```markdown
- Enhanced list items
- With custom bullet points
- And smooth animations
```

### Blockquotes
```markdown
> Enhanced blockquotes with improved styling
> and visual hierarchy
```

## Features

### Floating Table of Contents
- Automatically generated from headings
- Smooth scroll navigation
- Active section highlighting
- Responsive hover expansion

### Enhanced Animations
- Staggered content loading
- Smooth transitions
- Interactive hover effects
- Modal entrance/exit animations

### Premium Styling
- Glass-morphism effects
- Consistent color schemes
- Professional typography
- Responsive design

## Usage in Components

```typescript
import { MarkdownViewer } from './components/markdown';

function MyComponent() {
  const content = `
# My Document

This is a sample with {{Interactive Content|This appears in a modal!|text}} embedded.
  `;

  return (
    <MarkdownViewer 
      content={content}
      className="custom-styling"
    />
  );
}
```

The MarkdownViewer will automatically parse and render all custom syntax along with standard markdown features.