'use client';

import React, { ReactNode, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { GlassCard } from './GlassCard';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'glass' | 'gradient';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  clickable?: boolean;
  className?: string;
}

const variantClasses: Record<Exclude<CardVariant, 'glass'>, string> = {
  default: 'bg-white/5 border border-white/10',
  outlined: 'bg-transparent border border-white/20',
  elevated: 'bg-gray-900/80 border border-white/10 shadow-lg shadow-black/20',
  gradient: 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * Card - Flexible container component
 *
 * A simple, composable card component with multiple variants.
 * The `glass` variant delegates to GlassCard for unified glassmorphism styling.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  clickable = false,
  className = '',
  onClick,
  ...props
}, ref) => {
  // Glass variant delegates to the unified GlassCard primitive
  if (variant === 'glass') {
    return (
      <GlassCard
        ref={ref}
        padding={padding}
        hover={hover}
        clickable={clickable}
        className={className}
        onClick={onClick}
      >
        {children}
      </GlassCard>
    );
  }

  const isInteractive = hover || clickable || onClick;

  const baseClasses = `
    rounded-xl transition-all duration-200
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${isInteractive ? 'cursor-pointer hover:border-white/20 hover:bg-white/[0.08]' : ''}
    ${className}
  `;

  if (isInteractive) {
    return (
      <motion.div
        ref={ref}
        className={baseClasses}
        onClick={onClick}
        whileHover={hover ? { scale: 1.01 } : undefined}
        whileTap={clickable ? { scale: 0.99 } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={baseClasses}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

/**
 * CardHeader - Header section of a card
 */
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function CardHeader({ children, className = '', actions }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex-1 min-w-0">{children}</div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * CardTitle - Title within card header
 */
interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({ children, className = '', as: Tag = 'h3' }: CardTitleProps) {
  return (
    <Tag className={`text-base font-semibold text-gray-100 ${className}`}>
      {children}
    </Tag>
  );
}

/**
 * CardDescription - Description text in card header
 */
interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-400 mt-1 ${className}`}>
      {children}
    </p>
  );
}

/**
 * CardContent - Main content area of a card
 */
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`${className}`}>
      {children}
    </div>
  );
}

/**
 * CardFooter - Footer section of a card
 */
interface CardFooterProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

const footerAlignClasses: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

export function CardFooter({ children, className = '', align = 'right' }: CardFooterProps) {
  return (
    <div className={`flex items-center gap-2 pt-4 border-t border-white/5 ${footerAlignClasses[align]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardDivider - Horizontal divider within a card
 */
export function CardDivider({ className = '' }: { className?: string }) {
  return <div className={`border-t border-white/5 my-4 ${className}`} />;
}

export default Card;
