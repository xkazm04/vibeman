'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  RefreshCw,
  Download,
  BookOpen,
  Database,
  Code,
  Layout,
  Sparkles,
  ChevronRight,
  Clock
} from 'lucide-react';
import { DbDocumentation } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import DocsContent from '@/app/features/Docs/components/DocsContent';
import DocsGenerateButton from '@/app/features/Docs/components/DocsGenerateButton';
import DocsSectionCard from '@/app/features/Docs/components/DocsSectionCard';

const sectionIcons = {
  overview: BookOpen,
  architecture: Layout,
  api: Code,
  database: Database,
  components: FileText,
  custom: FileText
};

const sectionColors = {
  overview: 'from-blue-500 to-cyan-500',
  architecture: 'from-purple-500 to-pink-500',
  api: 'from-green-500 to-emerald-500',
  database: 'from-orange-500 to-red-500',
  components: 'from-indigo-500 to-purple-500',
  custom: 'from-gray-500 to-slate-500'
};

export default function DocsPage() {
  const [docs, setDocs] = useState<DbDocumentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSection, setSelectedSection] = useState<DbDocumentation | null>(null);

  const { projects, initializeProjects } = useProjectConfigStore();
  const { activeProject, setActiveProject } = useActiveProjectStore();

  useEffect(() => {
    initializeProjects();
  }, []);

  useEffect(() => {
    if (activeProject?.id) {
      loadDocs();
    }
  }, [activeProject?.id]);

  const loadDocs = async () => {
    if (!activeProject?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/docs?projectId=${activeProject.id}`);
      if (response.ok) {
        const data = await response.json();
        setDocs(data.docs || []);
      }
    } catch (error) {
      console.error('Error loading documentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!activeProject) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/docs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectName: activeProject.name
        })
      });

      if (response.ok) {
        await loadDocs();
      }
    } catch (error) {
      console.error('Error generating documentation:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (doc: DbDocumentation) => {
    if (!activeProject) return;

    try {
      const response = await fetch('/api/docs/generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: doc.id,
          projectId: activeProject.id,
          projectPath: activeProject.path,
          projectName: activeProject.name
        })
      });

      if (response.ok) {
        await loadDocs();
      }
    } catch (error) {
      console.error('Error regenerating documentation:', error);
    }
  };

  const handleExportMarkdown = () => {
    if (docs.length === 0) return;

    const markdown = docs.map(doc => {
      return `# ${doc.title}\n\n${doc.content}\n\n---\n\n`;
    }).join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject?.name || 'project'}-docs.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Project Selected</h2>
          <p className="text-slate-400">Please select a project to view documentation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              Documentation Hub
            </h1>
            <p className="text-slate-400">
              Auto-generated project documentation for {activeProject.name}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExportMarkdown}
              disabled={docs.length === 0}
              className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export MD
            </button>

            <DocsGenerateButton
              onGenerate={handleGenerate}
              generating={generating}
              hasExistingDocs={docs.length > 0}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{docs.length}</div>
                <div className="text-sm text-slate-400">Sections</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {docs.filter(d => d.auto_generated).length}
                </div>
                <div className="text-sm text-slate-400">Auto-Generated</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Clock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {docs.filter(d => d.last_sync_at).length}
                </div>
                <div className="text-sm text-slate-400">Synced</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <RefreshCw className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {docs.length > 0 ? new Date(Math.max(...docs.map(d => new Date(d.updated_at).getTime()))).toLocaleDateString() : '-'}
                </div>
                <div className="text-sm text-slate-400">Last Updated</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading documentation...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Documentation Yet</h3>
            <p className="text-slate-400 mb-6">
              Generate comprehensive documentation using AI to analyze your project
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar - Section List */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-3">
                <h2 className="text-lg font-semibold text-white mb-4">Sections</h2>
                {docs.map((doc, index) => {
                  const Icon = sectionIcons[doc.section_type];
                  const colorClass = sectionColors[doc.section_type];

                  return (
                    <motion.button
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedSection(doc)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedSection?.id === doc.id
                          ? `bg-gradient-to-br ${colorClass} border-transparent text-white`
                          : 'bg-slate-800/30 border-slate-700 text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <div className="flex-1">
                          <div className="font-medium">{doc.title}</div>
                          <div className={`text-xs ${selectedSection?.id === doc.id ? 'text-white/70' : 'text-slate-500'}`}>
                            {new Date(doc.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedSection?.id === doc.id ? 'rotate-90' : ''}`} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {selectedSection ? (
                  <DocsContent
                    key={selectedSection.id}
                    doc={selectedSection}
                    onRegenerate={handleRegenerate}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-slate-800/30 border border-slate-700 rounded-xl p-12 text-center"
                  >
                    <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Select a Section
                    </h3>
                    <p className="text-slate-400">
                      Choose a documentation section from the sidebar to view its content
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
