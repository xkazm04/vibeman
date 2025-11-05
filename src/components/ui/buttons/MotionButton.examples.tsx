'use client';
/**
 * MotionButton Usage Examples
 *
 * This file demonstrates various usage patterns for the MotionButton component.
 * Copy these examples to get started quickly.
 */

import React from 'react';
import MotionButton from './MotionButton';
import {
  Trash2,
  Check,
  X,
  Plus,
  Save,
  ChevronRight,
  Edit,
  Copy,
  Settings,
  Star,
} from 'lucide-react';

// ============================================================================
// BASIC EXAMPLES
// ============================================================================

export function BasicButton() {
  return (
    <MotionButton onClick={() => console.log("click")}>
      Click me
    </MotionButton>
  );
}

export function ButtonWithIcon() {
  return (
    <MotionButton
      icon={Trash2}
      colorScheme="red"
      variant="outline"
      onClick={() => {/* Handle delete */}}
    >
      Delete
    </MotionButton>
  );
}

export function IconOnlyButton() {
  return (
    <MotionButton
      icon={Plus}
      iconOnly
      colorScheme="green"
      aria-label="Add item"
      onClick={() => {/* Handle add */}}
    />
  );
}

// ============================================================================
// ANIMATION EXAMPLES
// ============================================================================

export function AnimationPresets() {
  return (
    <div className="flex gap-2">
      <MotionButton animationPreset="default">
        Default
      </MotionButton>
      <MotionButton animationPreset="subtle">
        Subtle
      </MotionButton>
      <MotionButton animationPreset="bounce">
        Bounce
      </MotionButton>
      <MotionButton animationPreset="lift">
        Lift
      </MotionButton>
      <MotionButton animationPreset="none">
        None
      </MotionButton>
    </div>
  );
}

export function CustomAnimation() {
  return (
    <MotionButton
      hoverScale={1.15}
      tapScale={0.85}
      hoverY={-3}
      colorScheme="purple"
    >
      Custom Animation
    </MotionButton>
  );
}

// ============================================================================
// COLOR SCHEME EXAMPLES
// ============================================================================

export function ColorSchemes() {
  return (
    <div className="flex flex-wrap gap-2">
      <MotionButton colorScheme="blue">Blue</MotionButton>
      <MotionButton colorScheme="cyan">Cyan</MotionButton>
      <MotionButton colorScheme="indigo">Indigo</MotionButton>
      <MotionButton colorScheme="purple">Purple</MotionButton>
      <MotionButton colorScheme="pink">Pink</MotionButton>
      <MotionButton colorScheme="red">Red</MotionButton>
      <MotionButton colorScheme="orange">Orange</MotionButton>
      <MotionButton colorScheme="amber">Amber</MotionButton>
      <MotionButton colorScheme="yellow">Yellow</MotionButton>
      <MotionButton colorScheme="green">Green</MotionButton>
      <MotionButton colorScheme="emerald">Emerald</MotionButton>
      <MotionButton colorScheme="slate">Slate</MotionButton>
      <MotionButton colorScheme="gray">Gray</MotionButton>
    </div>
  );
}

// ============================================================================
// VARIANT EXAMPLES
// ============================================================================

export function StyleVariants() {
  return (
    <div className="flex gap-2">
      <MotionButton variant="solid" colorScheme="blue">
        Solid
      </MotionButton>
      <MotionButton variant="outline" colorScheme="cyan">
        Outline
      </MotionButton>
      <MotionButton variant="ghost" colorScheme="gray">
        Ghost
      </MotionButton>
      <MotionButton variant="glassmorphic" colorScheme="purple">
        Glassmorphic
      </MotionButton>
    </div>
  );
}

// ============================================================================
// SIZE EXAMPLES
// ============================================================================

export function Sizes() {
  return (
    <div className="flex items-center gap-2">
      <MotionButton size="xs">XS</MotionButton>
      <MotionButton size="sm">SM</MotionButton>
      <MotionButton size="md">MD</MotionButton>
      <MotionButton size="lg">LG</MotionButton>
      <MotionButton size="xl">XL</MotionButton>
    </div>
  );
}

// ============================================================================
// STATE EXAMPLES
// ============================================================================

export function LoadingState() {
  return (
    <MotionButton
      loading={true}
      colorScheme="blue"
      variant="solid"
    >
      Loading...
    </MotionButton>
  );
}

export function DisabledState() {
  return (
    <MotionButton
      disabled={true}
      colorScheme="green"
    >
      Disabled
    </MotionButton>
  );
}

// ============================================================================
// COMMON PATTERNS
// ============================================================================

export function ActionButtonsRow() {
  return (
    <div className="flex items-center gap-2">
      <MotionButton
        icon={Check}
        colorScheme="green"
        variant="outline"
        size="sm"
        onClick={() => {/* Handle accept */}}
      >
        Accept
      </MotionButton>

      <MotionButton
        icon={X}
        colorScheme="red"
        variant="outline"
        size="sm"
        onClick={() => {/* Handle reject */}}
      >
        Reject
      </MotionButton>
    </div>
  );
}

export function IconOnlyActionGroup() {
  return (
    <div className="flex items-center gap-1">
      <MotionButton
        icon={Edit}
        iconOnly
        aria-label="Edit"
        size="sm"
        onClick={() => {/* Handle edit */}}
      />
      <MotionButton
        icon={Copy}
        iconOnly
        aria-label="Copy"
        size="sm"
        onClick={() => {/* Handle copy */}}
      />
      <MotionButton
        icon={Trash2}
        iconOnly
        colorScheme="red"
        aria-label="Delete"
        size="sm"
        onClick={() => {/* Handle delete */}}
      />
    </div>
  );
}

export function FormSubmitButton() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <MotionButton
      type="submit"
      loading={isSubmitting}
      disabled={isSubmitting}
      colorScheme="blue"
      variant="solid"
      fullWidth
      onClick={() => {
        setIsSubmitting(true);
        setTimeout(() => setIsSubmitting(false), 2000);
      }}
    >
      {isSubmitting ? 'Submitting...' : 'Submit Form'}
    </MotionButton>
  );
}

export function TinderStyleButtons() {
  return (
    <div className="flex items-center justify-center gap-6">
      <MotionButton
        icon={X}
        iconOnly
        colorScheme="red"
        variant="outline"
        size="xl"
        animationPreset="bounce"
        aria-label="Reject"
        className="w-16 h-16 rounded-full border-2 shadow-lg shadow-red-500/20"
        onClick={() => {/* Handle reject */}}
      />

      <MotionButton
        icon={Trash2}
        iconOnly
        colorScheme="gray"
        variant="outline"
        size="lg"
        animationPreset="bounce"
        aria-label="Delete"
        className="w-14 h-14 rounded-full border-2 shadow-lg shadow-gray-500/20"
        onClick={() => {/* Handle delete */}}
      />

      <MotionButton
        icon={Check}
        iconOnly
        colorScheme="green"
        variant="outline"
        size="xl"
        animationPreset="bounce"
        aria-label="Accept"
        className="w-16 h-16 rounded-full border-2 shadow-lg shadow-green-500/20"
        onClick={() => {/* Handle accept */}}
      />
    </div>
  );
}

export function IconPositions() {
  return (
    <div className="flex gap-2">
      <MotionButton icon={Save} iconPosition="left">
        Save
      </MotionButton>
      <MotionButton icon={ChevronRight} iconPosition="right">
        Next
      </MotionButton>
    </div>
  );
}

export function CustomIconSize() {
  return (
    <MotionButton
      icon={Star}
      iconSize="w-6 h-6"
      size="md"
    >
      Custom Icon Size
    </MotionButton>
  );
}

// ============================================================================
// MIGRATION EXAMPLE
// ============================================================================

// BEFORE: Using motion.button directly
export function BeforeMigration() {
  return (
    <div className="hidden">
      {/* This is the old pattern - DO NOT USE */}
      {/*
      <motion.button
        onClick={() => console.log("click")}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete</span>
      </motion.button>
      */}
    </div>
  );
}

// AFTER: Using MotionButton
export function AfterMigration() {
  return (
    <MotionButton
      icon={Trash2}
      colorScheme="red"
      variant="outline"
      size="sm"
      onClick={() => {/* Handle click */}}
    >
      Delete
    </MotionButton>
  );
}

// ============================================================================
// ALL EXAMPLES SHOWCASE
// ============================================================================

export default function MotionButtonExamplesShowcase() {
  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white">MotionButton Examples</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">Basic Examples</h2>
        <div className="flex gap-4">
          <BasicButton />
          <ButtonWithIcon />
          <IconOnlyButton />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">Animation Presets</h2>
        <AnimationPresets />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">Color Schemes</h2>
        <ColorSchemes />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">Style Variants</h2>
        <StyleVariants />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">Sizes</h2>
        <Sizes />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">States</h2>
        <div className="flex gap-4">
          <LoadingState />
          <DisabledState />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-300">Common Patterns</h2>
        <div className="space-y-4">
          <ActionButtonsRow />
          <IconOnlyActionGroup />
          <FormSubmitButton />
          <TinderStyleButtons />
        </div>
      </section>
    </div>
  );
}
