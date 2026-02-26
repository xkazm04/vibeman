import React from 'react';

type GlassCardVariant = 'panel' | 'card' | 'inline';

interface GlassCardProps {
  variant?: GlassCardVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<GlassCardVariant, string> = {
  panel:  'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.02)]',
  card:   'bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl',
  inline: 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg',
};

export default function GlassCard({ variant = 'card', className = '', children }: GlassCardProps) {
  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
