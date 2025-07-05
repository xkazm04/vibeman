# Vibe - Project Management & Preview Tool

A comprehensive project management and preview tool for development teams.

## Features

### Preview System
- **Single Project View**: Traditional tab-based preview of individual projects
- **Enhanced Prototype Mode**: Advanced grid-based view to preview multiple running projects simultaneously

#### Enhanced Prototype Mode
The Prototype mode allows you to view all running projects in a responsive grid layout with advanced visual effects:

**🎨 Enhanced Visual Design:**
- **TestTube Icon**: Creative test tube diagonal icon representing experimentation
- **Animated Glow Effects**: 
  - Subtle pink glow when inactive (breathing effect)
  - Intense animated glow when active
  - Moving particle animation around the button when active
- **Layout Shadow Glow**: Entire preview layout gets animated shadow glow border in prototype mode
- **Proper Height Management**: Grid items now use full available height like single project view

**📐 Grid Layout Features:**
- **Responsive Design**: Automatically adjusts based on screen size and project count
  - 1 project: Full width
  - 2 projects: Side-by-side on large screens, stacked on mobile
  - 3+ projects: Grid layout (1 column on mobile, 2 on tablet, 3 on desktop)
- **Full Height Cards**: Each project card uses maximum available height
- **Individual Project Headers**: Name, port, and external link button for each project

**🎭 Animation & Effects:**
- **Button Animations**: 
  - Icon rotation on state change
  - Pulsing glow effects
  - Circular particle movement when active
- **Layout Transitions**: Smooth transitions between single and grid modes
- **Border Glow**: Animated gradient border effect for the entire layout
- **TV Turn-on Effect**: Maintains the iconic TV animation for iframes

#### Component Architecture
The code has been refactored into cleaner, more maintainable components:

- **PreviewLayout.tsx**: Main orchestration component with shadow glow effects
- **PreviewTabNavigation.tsx**: Enhanced tab navigation with animated prototype button
- **PreviewContentArea.tsx**: Content area with proper height management
- **PreviewContent.tsx**: Individual project preview component (reusable)
- **PreviewTab.tsx**: Individual tab component with disabled state support

## Usage

1. Start your development projects using the Runner
2. Navigate to the Preview section
3. Use individual tabs for focused single-project view
4. Click the **TestTube** button to enter prototype mode
   - Watch the animated glow effects activate
   - See moving particles around the button
   - Notice the layout border glow effect
5. View all running projects in a responsive grid
6. Click the button again to exit prototype mode

## Technical Implementation

### Enhanced Features
- **Framer Motion**: Advanced animations for button effects and layout transitions
- **CSS Grid**: Responsive grid system with proper height management
- **Particle System**: Mathematical particle movement using trigonometry
- **Gradient Animations**: CSS keyframe animations for border effects
- **Height Management**: Proper flexbox and min-height usage for full-screen layout

### Performance Optimizations
- **Component Separation**: Cleaner code organization and better maintainability
- **Efficient Re-renders**: Proper state management to minimize unnecessary updates
- **Responsive Design**: Mobile-first approach with progressive enhancement

## Getting Started

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## Visual Preview

### Prototype Button States
- **Inactive**: TestTube icon with subtle pink glow breathing effect
- **Active**: Intense glow with 6 orbiting particles and icon rotation
- **Layout Effect**: Animated purple-pink gradient border around entire preview area

### Grid Layout
- **Responsive**: Adapts from 1 column on mobile to 3 columns on desktop
- **Full Height**: Each project card uses maximum available screen height
- **Individual Controls**: External link button and project information for each card
