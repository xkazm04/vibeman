'use client';

import { motion } from 'framer-motion';
import { Bot, Plus, Sparkles, Wrench, Zap } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';

export default function EmptyState() {
  const createPersona = usePersonaStore((s) => s.createPersona);
  const selectPersona = usePersonaStore((s) => s.selectPersona);

  const handleCreate = async () => {
    try {
      const p = await createPersona({
        name: 'My First Persona',
        description: 'An AI agent that helps with tasks',
        system_prompt: 'You are a helpful AI assistant that can execute tasks and use tools to help the user accomplish their goals.',
        icon: '🤖',
        color: '#8b5cf6',
      });
      selectPersona(p.id);
    } catch { /* handled in store */ }
  };

  const features = [
    { icon: Sparkles, label: 'Custom Prompts', desc: 'Define how your agent thinks', color: 'text-primary' },
    { icon: Wrench, label: 'Tool Integration', desc: 'HTTP, Gmail, filesystem & more', color: 'text-accent' },
    { icon: Zap, label: 'Event Triggers', desc: 'Schedules, webhooks, polling', color: 'text-amber-400' },
  ];

  return (
    <div className="flex items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-lg px-8"
      >
        {/* Icon with glow */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl" />
          <div className="relative w-24 h-24 rounded-2xl bg-secondary/60 backdrop-blur-md border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <Bot className="w-11 h-11 text-accent/80" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          Create Your First Persona
        </h2>
        <p className="text-muted-foreground/70 mb-8 leading-relaxed max-w-md mx-auto">
          Personas are AI agents powered by Claude Code. Define their behavior with natural language prompts, give them tools, and set triggers.
        </p>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Create Persona
        </button>

        {/* Feature cards */}
        <div className="mt-14 grid grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              className="p-4 rounded-2xl bg-secondary/40 backdrop-blur-sm border border-border/30 hover:border-primary/20 transition-colors"
            >
              <f.icon className={`w-5 h-5 ${f.color} mb-2.5 mx-auto`} />
              <div className="text-sm font-medium text-foreground/90">{f.label}</div>
              <div className="text-[11px] text-muted-foreground/50 mt-1">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
