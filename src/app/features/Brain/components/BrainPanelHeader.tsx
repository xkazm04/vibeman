'use client';

import { motion } from 'framer-motion';

interface BrainPanelHeaderProps {
  icon: React.ElementType;
  title: string;
  accentColor: string;
  glowColor: string;
  /** Show the glowing icon container (GlowCard style) vs bare icon */
  glow?: boolean;
  /** Count badge shown next to title */
  count?: number | string;
  /** Extra elements rendered after title (e.g. badges, scope tags) */
  trailing?: React.ReactNode;
  /** Extra elements rendered on the right side (e.g. search, status badge) */
  right?: React.ReactNode;
}

export default function BrainPanelHeader({
  icon: Icon,
  title,
  accentColor,
  glowColor,
  glow = false,
  count,
  trailing,
  right,
}: BrainPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {glow ? (
          <motion.div
            className="p-2 rounded-xl border"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}40`,
              boxShadow: `0 0 20px ${glowColor}`,
            }}
            whileHover={{ scale: 1.05 }}
          >
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </motion.div>
        ) : (
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        )}
        <h2 className="text-lg font-semibold text-zinc-200">{title}</h2>
        {count !== undefined && (
          <span
            className="text-sm font-mono px-2 py-0.5 rounded"
            style={{
              color: accentColor,
              background: `${accentColor}15`,
              textShadow: `0 0 10px ${glowColor}`,
            }}
          >
            {count}
          </span>
        )}
        {trailing}
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
}
