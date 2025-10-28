'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useContextStore } from '@/stores/contextStore';
import {
  groupIdeasByProjectAndContext,
  ProjectGroup,
  ContextGroup
} from '../lib/groupIdeasByProjectAndContext';
import {
  ChevronDown,
  Sparkles,
  Package,
  FolderOpen,
  Circle,
  Eye,
  Zap,
  Calendar
} from 'lucide-react';

interface TotalViewDashboardProps {
  ideas: DbIdea[];
  isFiltered: boolean;
}

export default function TotalViewDashboard({ ideas, isFiltered }: TotalViewDashboardProps) {
  const { projects } = useProjectConfigStore();
  const { contexts } = useContextStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [constellationMode, setConstellationMode] = useState(false);
  const [focusedProject, setFocusedProject] = useState<string | null>(null);

  // Group ideas by project and context
  const groupedData = useMemo(() => {
    return groupIdeasByProjectAndContext(ideas, projects, contexts);
  }, [ideas, projects, contexts]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleConstellationMode = () => {
    setConstellationMode(!constellationMode);
    if (!constellationMode) {
      // Auto-expand all projects in constellation mode
      const allProjectIds = new Set(groupedData.projects.map(p => p.projectId));
      setExpandedProjects(allProjectIds);
    }
  };

  const enterFocusMode = (projectId: string) => {
    setFocusedProject(projectId);
  };

  const exitFocusMode = () => {
    setFocusedProject(null);
  };

  if (ideas.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Package className="w-16 h-16 text-gray-600 mb-4" />
        <p className="text-gray-400 text-lg">
          {isFiltered ? 'No ideas match your filters' : 'No implemented ideas yet'}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {isFiltered ? 'Try adjusting your filters' : 'Start implementing ideas to see them here'}
        </p>
      </motion.div>
    );
  }

  // Focus mode - show single project in detail
  if (focusedProject) {
    const project = groupedData.projects.find(p => p.projectId === focusedProject);
    if (project) {
      return (
        <FocusedProjectView
          project={project}
          onExit={exitFocusMode}
        />
      );
    }
  }

  // Constellation mode
  if (constellationMode) {
    return (
      <ConstellationView
        groupedData={groupedData}
        onToggleMode={toggleConstellationMode}
        onFocusProject={enterFocusMode}
      />
    );
  }

  // Standard dashboard view
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between">
        <motion.div
          className="flex items-center gap-3"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-amber-500/30 rounded-lg border border-yellow-500/40">
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-yellow-400">
              {groupedData.totalIdeas} Ideas Implemented
            </h2>
            <p className="text-sm text-gray-400">
              Across {groupedData.projects.length} {groupedData.projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
        </motion.div>

        {/* Constellation mode toggle */}
        <motion.button
          onClick={toggleConstellationMode}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20
                     border border-purple-500/40 rounded-lg text-purple-300 hover:bg-purple-500/30
                     transition-all group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Circle className="w-4 h-4 group-hover:animate-pulse" />
          <span className="text-sm font-semibold">Constellation View</span>
        </motion.button>
      </div>

      {/* Project sections */}
      <AnimatePresence mode="popLayout">
        {groupedData.projects.map((project, index) => (
          <ProjectSection
            key={project.projectId}
            project={project}
            index={index}
            isExpanded={expandedProjects.has(project.projectId)}
            onToggle={() => toggleProject(project.projectId)}
            onFocus={() => enterFocusMode(project.projectId)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// Project Section Component
interface ProjectSectionProps {
  project: ProjectGroup;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onFocus: () => void;
}

function ProjectSection({ project, index, isExpanded, onToggle, onFocus }: ProjectSectionProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-gray-800/20 border border-gray-700/40 rounded-xl overflow-hidden backdrop-blur-sm"
    >
      {/* Project Header */}
      <motion.div
        className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10
                   border-b border-gray-700/40 px-6 py-4 cursor-pointer hover:bg-yellow-500/15
                   transition-colors"
        onClick={onToggle}
        whileHover={{ backgroundColor: 'rgba(234, 179, 8, 0.15)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-yellow-400" />
            </motion.div>
            <FolderOpen className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-yellow-300">{project.projectName}</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-semibold">
              {project.totalIdeas} {project.totalIdeas === 1 ? 'idea' : 'ideas'}
            </span>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onFocus();
              }}
              className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/40
                         text-purple-300 hover:bg-purple-500/30 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Eye className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Context Groups */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {project.contexts.map((context, ctxIndex) => (
                <ContextSection
                  key={context.contextId || 'uncategorized'}
                  context={context}
                  index={ctxIndex}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Context Section Component
interface ContextSectionProps {
  context: ContextGroup;
  index: number;
}

function ContextSection({ context, index }: ContextSectionProps) {
  const contextColor = context.contextColor || '#6B7280';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-gray-800/40 border border-gray-700/40 rounded-lg overflow-hidden"
      style={{
        borderColor: `${contextColor}40`,
      }}
    >
      {/* Context Header */}
      <div
        className="px-4 py-3 border-b border-gray-700/40"
        style={{
          background: `linear-gradient(to right, ${contextColor}15, ${contextColor}05)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: contextColor }}
            />
            <h4 className="text-sm font-semibold text-gray-200">{context.contextName}</h4>
          </div>
          <span className="text-sm text-gray-400">
            {context.count} {context.count === 1 ? 'idea' : 'ideas'}
          </span>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {context.ideas.map((idea, ideaIndex) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            index={ideaIndex}
            accentColor={contextColor}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Idea Card Component
interface IdeaCardProps {
  idea: DbIdea;
  index: number;
  accentColor: string;
}

function IdeaCard({ idea, index, accentColor }: IdeaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className="bg-gray-800/60 border border-gray-700/40 rounded-lg p-4
                 hover:border-opacity-80 hover:bg-gray-800/80 transition-all
                 cursor-pointer group"
      style={{
        borderColor: `${accentColor}40`,
      }}
      whileHover={{
        y: -4,
        boxShadow: `0 8px 16px ${accentColor}20`
      }}
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="px-2 py-1 rounded text-sm font-semibold"
          style={{
            backgroundColor: `${accentColor}20`,
            color: accentColor,
          }}
        >
          {idea.category}
        </span>
        <Sparkles
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: accentColor }}
        />
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-gray-200 mb-2 line-clamp-2">
        {idea.title}
      </h4>

      {/* Description */}
      {idea.description && (
        <p className="text-sm text-gray-400 line-clamp-3 mb-3">
          {idea.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {idea.effort && idea.impact && (
            <>
              E:{idea.effort} • I:{idea.impact}
            </>
          )}
        </span>
        {idea.implemented_at && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className="font-mono">
              {new Date(idea.implemented_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Constellation View Component
interface ConstellationViewProps {
  groupedData: ReturnType<typeof groupIdeasByProjectAndContext>;
  onToggleMode: () => void;
  onFocusProject: (projectId: string) => void;
}

function ConstellationView({ groupedData, onToggleMode, onFocusProject }: ConstellationViewProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  return (
    <motion.div
      className="relative min-h-[600px] bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20
                 rounded-xl border border-purple-500/30 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Background particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/40"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Circle className="w-5 h-5 text-purple-400" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Constellation View
              </h2>
              <p className="text-sm text-gray-400">
                Interactive project universe
              </p>
            </div>
          </div>
          <motion.button
            onClick={onToggleMode}
            className="px-4 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg
                       text-gray-300 hover:bg-gray-800/80 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Standard View
          </motion.button>
        </div>
      </div>

      {/* Constellation Grid */}
      <div className="relative z-10 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groupedData.projects.map((project, index) => (
          <motion.div
            key={project.projectId}
            className="relative"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.1,
              type: 'spring',
              stiffness: 200,
              damping: 15
            }}
            onMouseEnter={() => setHoveredProject(project.projectId)}
            onMouseLeave={() => setHoveredProject(null)}
          >
            {/* Project Node */}
            <motion.div
              className="relative bg-gradient-to-br from-purple-500/20 to-blue-500/20
                         border-2 border-purple-500/40 rounded-xl p-6 cursor-pointer
                         backdrop-blur-sm"
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)',
                borderColor: 'rgba(168, 85, 247, 0.8)'
              }}
              onClick={() => onFocusProject(project.projectId)}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30
                           rounded-xl blur-xl -z-10"
                animate={{
                  opacity: hoveredProject === project.projectId ? 0.8 : 0.3,
                  scale: hoveredProject === project.projectId ? 1.2 : 1,
                }}
              />

              <div className="text-center space-y-3">
                <motion.div
                  className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-blue-400
                             rounded-full flex items-center justify-center"
                  animate={{
                    boxShadow: hoveredProject === project.projectId
                      ? '0 0 20px rgba(168, 85, 247, 0.6)'
                      : '0 0 0px rgba(168, 85, 247, 0)'
                  }}
                >
                  <FolderOpen className="w-8 h-8 text-white" />
                </motion.div>

                <h3 className="text-lg font-bold text-purple-300">
                  {project.projectName}
                </h3>

                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-2xl font-bold text-yellow-400">
                    {project.totalIdeas}
                  </span>
                </div>

                {/* Context orbs */}
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {project.contexts.slice(0, 5).map((context, ctxIndex) => (
                    <motion.div
                      key={context.contextId || ctxIndex}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                      style={{
                        backgroundColor: `${context.contextColor || '#6B7280'}40`,
                        borderColor: context.contextColor || '#6B7280',
                      }}
                      animate={{
                        y: hoveredProject === project.projectId
                          ? [0, -10, 0]
                          : 0,
                      }}
                      transition={{
                        duration: 1,
                        delay: ctxIndex * 0.1,
                        repeat: hoveredProject === project.projectId ? Infinity : 0,
                      }}
                    >
                      <span className="text-sm font-semibold text-white">
                        {context.count}
                      </span>
                    </motion.div>
                  ))}
                  {project.contexts.length > 5 && (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-500
                                    bg-gray-700/40 flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-300">
                        +{project.contexts.length - 5}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Focused Project View Component
interface FocusedProjectViewProps {
  project: ProjectGroup;
  onExit: () => void;
}

function FocusedProjectView({ project, onExit }: FocusedProjectViewProps) {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/20 to-blue-500/20
                      border border-purple-500/40 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 bg-gradient-to-br from-purple-400 to-blue-400 rounded-xl"
            animate={{
              boxShadow: [
                '0 0 20px rgba(168, 85, 247, 0.5)',
                '0 0 40px rgba(168, 85, 247, 0.8)',
                '0 0 20px rgba(168, 85, 247, 0.5)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <FolderOpen className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-purple-300">{project.projectName}</h2>
            <p className="text-sm text-gray-400">
              {project.totalIdeas} ideas • {project.contexts.length} contexts
            </p>
          </div>
        </div>
        <motion.button
          onClick={onExit}
          className="px-4 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg
                     text-gray-300 hover:bg-gray-800/80 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Exit Focus
        </motion.button>
      </div>

      {/* Contexts */}
      <div className="space-y-4">
        {project.contexts.map((context, index) => (
          <ContextSection
            key={context.contextId || 'uncategorized'}
            context={context}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
}
