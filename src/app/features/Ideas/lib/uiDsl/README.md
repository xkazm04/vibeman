# Declarative UI DSL

A JSON-based component description language for the Ideas feature that eliminates repeated inline styling and provides a single source of truth for visual design.

## Overview

This DSL encodes card layouts, status colors, effort/impact badges, and interactive behaviors in JSON descriptors. The `RenderComponent` engine interprets these descriptors to generate React components with Tailwind classes, Framer Motion animations, and event handlers.

## Benefits

- **10× faster UI iteration**: Change themes, colors, and layouts without touching component code
- **Single source of truth**: All styling decisions live in `theme.ts`
- **No duplicate styling logic**: Reuse patterns across IdeaStickyNote, BufferItem, and any new components
- **Designer-friendly**: JSON descriptors allow non-developers to tweak themes and add badges
- **Consistent experience**: All components use the same theme engine

## Architecture

```
uiDsl/
├── types.ts           # TypeScript interfaces for DSL
├── theme.ts           # Theme configuration (colors, badges, animations)
├── descriptors.ts     # Component descriptors (JSON-like definitions)
├── RenderComponent.tsx # Engine that interprets descriptors
└── index.ts           # Public API exports
```

## Usage

### Basic Example

```tsx
import { RenderComponent, defaultTheme, stickyNoteDescriptor } from '../lib/uiDsl';

function IdeaStickyNote({ idea, index, onClick }) {
  return (
    <RenderComponent
      descriptor={stickyNoteDescriptor}
      context={{
        data: idea,
        theme: defaultTheme,
        handlers: { onClick },
      }}
      index={index}
    />
  );
}
```

### Component Descriptors

Descriptors define the structure and behavior of a component:

```typescript
const stickyNoteDescriptor: ComponentDescriptor = {
  type: 'card',
  variant: 'stickyNote',
  className: 'p-4 hover:scale-105',

  layout: {
    topRight: {
      type: 'badge',
      badges: [{ type: 'category', style: 'minimal' }],
      className: 'text-2xl',
    },
    header: {
      type: 'date',
      value: 'created_at',
      className: 'text-sm text-gray-500 font-mono',
    },
    content: {
      type: 'text',
      value: 'title',
      className: 'text-base font-semibold text-white',
    },
    center: {
      type: 'badges',
      badges: [
        { type: 'effort', style: 'default' },
        { type: 'impact', style: 'default' },
      ],
    },
  },

  decorations: {
    cornerFold: true,
    hoverGradient: true,
  },
};
```

### Theme Configuration

The theme defines all visual styling:

```typescript
const defaultTheme: ThemeConfig = {
  name: 'default',

  variants: {
    pending: {
      bg: 'bg-gray-700/20',
      border: 'border-gray-600/40',
      shadow: 'shadow-gray-500/5',
      hover: {
        bg: 'hover:bg-gray-800/60',
      },
    },
    accepted: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      // ...
    },
  },

  badges: {
    effort: {
      1: { label: 'Low', color: 'text-green-400', description: 'Quick fix' },
      2: { label: 'Med', color: 'text-yellow-400', description: 'Moderate change' },
      3: { label: 'High', color: 'text-red-400', description: 'Major change' },
    },
    // ...
  },

  animations: {
    cardEntrance: {
      initial: { opacity: 0, y: 20, rotateZ: -2 },
      animate: { opacity: 1, y: 0, rotateZ: 0 },
      transition: { duration: 0.4, type: 'spring', stiffness: 200 },
    },
  },
};
```

## Layout Regions

Components support these layout regions:

- `topLeft`, `topRight` - Positioned absolutely at top corners
- `bottomLeft`, `bottomRight` - Positioned absolutely at bottom corners
- `header` - Top section with margin-bottom
- `content` - Main content area
- `footer` - Bottom section with margin-top
- `center` - Centered content (no positioning)

## Content Types

Each layout region can contain:

- **text**: Display text from data
- **date**: Format and display dates
- **badge**: Single badge (effort, impact, category, status)
- **badges**: Array of badges
- **emoji**: Display emoji
- **icon**: Lucide icon component
- **custom**: Custom React content

## Badge Types

- **effort**: Effort level (1-3) with color coding
- **impact**: Impact level (1-3) with color coding
- **category**: Category emoji
- **status**: Status label with colors
- **custom**: Custom badge with label/icon/emoji

## Customizing Themes

To create a new theme:

```typescript
import { ThemeConfig, defaultTheme } from './uiDsl';

const darkTheme: ThemeConfig = {
  ...defaultTheme,
  name: 'dark',
  variants: {
    ...defaultTheme.variants,
    pending: {
      bg: 'bg-black/40',
      border: 'border-gray-900/60',
      shadow: 'shadow-black/20',
    },
  },
};
```

Then use it in your component:

```tsx
<RenderComponent
  descriptor={stickyNoteDescriptor}
  context={{ data: idea, theme: darkTheme, handlers }}
/>
```

## Creating New Component Types

1. **Define a descriptor** in `descriptors.ts`:

```typescript
export const myCardDescriptor: ComponentDescriptor = {
  type: 'card',
  variant: 'myCustomVariant',
  layout: {
    header: { type: 'text', value: 'title' },
    content: { type: 'badges', badges: [{ type: 'effort' }] },
  },
};
```

2. **Add the variant to theme** in `theme.ts`:

```typescript
variants: {
  myCustomVariant: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    shadow: 'shadow-purple-500/10',
  },
}
```

3. **Use it in your component**:

```tsx
<RenderComponent descriptor={myCardDescriptor} context={context} />
```

## Processing States

Components can display processing state:

```tsx
<RenderComponent
  descriptor={bufferItemDescriptor}
  context={{
    data: idea,
    theme: defaultTheme,
    processingState: {
      isProcessing: processingIdeaId === idea.id,
      processingId: processingIdeaId,
    },
  }}
/>
```

When processing, the component automatically uses the `processing` variant with animated border glow.

## Advanced Features

### Custom Content Handlers

For complex custom content, add handlers in RenderComponent:

```typescript
case 'custom': {
  if (content.value === 'myCustomContent') {
    return <MyCustomComponent data={data} />;
  }
  return typeof content.value === 'function' ? content.value(data) : content.value;
}
```

### Per-Component Animations

Override default animations in descriptors:

```typescript
layout: {
  topRight: {
    type: 'badge',
    animation: {
      initial: { scale: 0, rotate: -180 },
      animate: { scale: 1, rotate: 0 },
      transition: { duration: 0.5, delay: 0.2 },
    },
  },
}
```

### Badge Styles

Badges support multiple styles:

- `default`: Full badge with background and border
- `outline`: Border only
- `pill`: Rounded pill shape
- `minimal`: No background, just icon/text

## Migration Guide

### Before (Traditional Component)

```tsx
function IdeaStickyNote({ idea, onClick }) {
  const config = getCategoryConfig(idea.category);
  const statusStyle = statusConfig[idea.status];

  return (
    <motion.div
      className={`relative group cursor-pointer ${statusStyle.bg} ${statusStyle.border} border rounded-xl p-4`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 text-2xl">{config.emoji}</div>
      <h3 className="text-base font-semibold text-white">{idea.title}</h3>
      {idea.effort && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-800/40">
          <EffortIcon className="w-3 h-3 text-green-400" />
          <span className="text-xs text-green-400">Low</span>
        </div>
      )}
    </motion.div>
  );
}
```

### After (Declarative DSL)

```tsx
function IdeaStickyNote({ idea, onClick }) {
  return (
    <RenderComponent
      descriptor={stickyNoteDescriptor}
      context={{
        data: idea,
        theme: defaultTheme,
        handlers: { onClick },
      }}
    />
  );
}
```

The descriptor lives in `descriptors.ts` and can be reused, customized, and shared across components.

## Best Practices

1. **Keep descriptors in descriptors.ts**: Centralize component definitions
2. **Keep styling in theme.ts**: Never hardcode colors or styles in descriptors
3. **Use semantic variant names**: `pending`, `accepted` vs `gray`, `green`
4. **Leverage theme inheritance**: Extend `defaultTheme` instead of rewriting
5. **Test with multiple themes**: Ensure components work with different themes
6. **Document custom content types**: Add comments for special custom handlers

## Performance

- **Memoization**: Use `React.memo` for components using RenderComponent
- **Descriptor reuse**: Descriptors are objects that can be shared
- **Animation optimization**: Framer Motion handles GPU acceleration
- **Tailwind JIT**: Only used classes are included in final bundle

## Future Enhancements

- Theme switcher UI for designers
- Visual descriptor editor
- Export/import themes as JSON
- Theme preview gallery
- Animation library expansion
- More badge styles (glass, neon, etc.)
