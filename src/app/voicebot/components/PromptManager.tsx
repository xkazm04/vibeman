'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Save, RefreshCw, AlertCircle, CheckCircle, Edit3, Eye } from 'lucide-react';

type PromptType = 'analysis' | 'response';

export default function PromptManager() {
  const [activeTab, setActiveTab] = useState<PromptType>('analysis');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Analysis prompt sections
  const [analysisTask, setAnalysisTask] = useState<string>('');
  const [analysisTaskOriginal, setAnalysisTaskOriginal] = useState<string>('');

  // Response prompt sections
  const [responseInstructions, setResponseInstructions] = useState<string>('');
  const [responseGuidelines, setResponseGuidelines] = useState<string>('');
  const [responseInstructionsOriginal, setResponseInstructionsOriginal] = useState<string>('');
  const [responseGuidelinesOriginal, setResponseGuidelinesOriginal] = useState<string>('');

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      // Load analysis task
      const analysisResponse = await fetch('/api/disk/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'data/prompts/analysis-task.txt' })
      });
      const analysisData = await analysisResponse.json();
      if (analysisData.success) {
        setAnalysisTask(analysisData.content);
        setAnalysisTaskOriginal(analysisData.content);
      }

      // Load response instructions
      const instructionsResponse = await fetch('/api/disk/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'data/prompts/response-instructions.txt' })
      });
      const instructionsData = await instructionsResponse.json();
      if (instructionsData.success) {
        setResponseInstructions(instructionsData.content);
        setResponseInstructionsOriginal(instructionsData.content);
      }

      // Load response guidelines
      const guidelinesResponse = await fetch('/api/disk/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: 'data/prompts/response-guidelines.txt' })
      });
      const guidelinesData = await guidelinesResponse.json();
      if (guidelinesData.success) {
        setResponseGuidelines(guidelinesData.content);
        setResponseGuidelinesOriginal(guidelinesData.content);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setErrorMessage('Failed to load prompt files');
      setSaveStatus('error');
    }
  };

  const savePrompts = async () => {
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      // Save analysis task
      if (analysisTask !== analysisTaskOriginal) {
        const analysisResponse = await fetch('/api/disk/save-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderPath: 'data/prompts',
            fileName: 'analysis-task.txt',
            content: analysisTask
          })
        });
        const analysisData = await analysisResponse.json();
        if (!analysisData.success) throw new Error('Failed to save analysis task');
      }

      // Save response instructions
      if (responseInstructions !== responseInstructionsOriginal) {
        const instructionsResponse = await fetch('/api/disk/save-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderPath: 'data/prompts',
            fileName: 'response-instructions.txt',
            content: responseInstructions
          })
        });
        const instructionsData = await instructionsResponse.json();
        if (!instructionsData.success) throw new Error('Failed to save response instructions');
      }

      // Save response guidelines
      if (responseGuidelines !== responseGuidelinesOriginal) {
        const guidelinesResponse = await fetch('/api/disk/save-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderPath: 'data/prompts',
            fileName: 'response-guidelines.txt',
            content: responseGuidelines
          })
        });
        const guidelinesData = await guidelinesResponse.json();
        if (!guidelinesData.success) throw new Error('Failed to save response guidelines');
      }

      // Update originals
      setAnalysisTaskOriginal(analysisTask);
      setResponseInstructionsOriginal(responseInstructions);
      setResponseGuidelinesOriginal(responseGuidelines);

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setIsEditing(false);
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save prompts');
      setSaveStatus('error');
    }
  };

  const resetPrompts = () => {
    setAnalysisTask(analysisTaskOriginal);
    setResponseInstructions(responseInstructionsOriginal);
    setResponseGuidelines(responseGuidelinesOriginal);
    setIsEditing(false);
    setSaveStatus('idle');
    setErrorMessage('');
  };

  const hasChanges = 
    analysisTask !== analysisTaskOriginal ||
    responseInstructions !== responseInstructionsOriginal ||
    responseGuidelines !== responseGuidelinesOriginal;

  const formatContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Check if line is numbered list item
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        return (
          <div key={idx} className="flex items-start space-x-3 mb-2">
            <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-full flex items-center justify-center text-cyan-400 text-sm font-bold">
              {numberedMatch[1]}
            </span>
            <span className="text-cyan-100/90">{numberedMatch[2]}</span>
          </div>
        );
      }

      // Check if line is bullet point
      const bulletMatch = line.match(/^-\s+(.+)$/);
      if (bulletMatch) {
        return (
          <div key={idx} className="flex items-start space-x-3 mb-2 ml-4">
            <span className="flex-shrink-0 w-2 h-2 mt-2 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full" />
            <span className="text-cyan-100/80">{bulletMatch[1]}</span>
          </div>
        );
      }

      // Regular line
      if (line.trim()) {
        return <p key={idx} className="text-cyan-100/90 mb-2">{line}</p>;
      }
      return <div key={idx} className="h-2" />;
    });
  };

  return (
    <div className="mt-8 bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 backdrop-blur-xl rounded-3xl border-2 border-cyan-500/20 overflow-hidden shadow-2xl shadow-slate-500/10">
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-r from-slate-600/20 via-blue-600/10 to-cyan-600/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent font-mono uppercase tracking-wider">
              Prompt Configuration
            </h2>
            <p className="text-cyan-300/60 text-sm font-mono mt-1">
              Manage AI decision-making workflows
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Edit/View Toggle */}
            <motion.button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                isEditing
                  ? 'bg-gradient-to-r from-yellow-600/40 to-orange-600/40 border border-yellow-500/50 text-yellow-300'
                  : 'bg-gradient-to-r from-slate-600/40 to-gray-600/40 border border-slate-500/50 text-slate-300'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isEditing ? (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Editing</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Viewing</span>
                </>
              )}
            </motion.button>

            {/* Reset Button */}
            {hasChanges && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={resetPrompts}
                className="px-4 py-2 bg-gradient-to-r from-gray-600/40 to-slate-600/40 border border-gray-500/50 rounded-lg text-gray-300 font-mono text-sm font-medium hover:from-gray-500/40 hover:to-slate-500/40 transition-all duration-300 flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset</span>
              </motion.button>
            )}

            {/* Save Button */}
            {isEditing && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={savePrompts}
                disabled={!hasChanges || saveStatus === 'saving'}
                className={`px-4 py-2 rounded-lg font-mono text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                  saveStatus === 'success'
                    ? 'bg-gradient-to-r from-green-600/40 to-emerald-600/40 border border-green-500/50 text-green-300'
                    : saveStatus === 'error'
                    ? 'bg-gradient-to-r from-red-600/40 to-rose-600/40 border border-red-500/50 text-red-300'
                    : hasChanges
                    ? 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border border-cyan-500/50 text-cyan-300 hover:from-cyan-500/40 hover:to-blue-500/40'
                    : 'bg-gradient-to-r from-slate-600/20 to-gray-600/20 border border-slate-500/30 text-slate-500 cursor-not-allowed'
                }`}
                whileHover={hasChanges ? { scale: 1.05 } : {}}
                whileTap={hasChanges ? { scale: 0.95 } : {}}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Saved</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Error</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm font-mono flex items-center space-x-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyan-500/20 bg-black/20">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 px-6 py-4 font-mono text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
            activeTab === 'analysis'
              ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border-b-2 border-cyan-400 text-cyan-300'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Analysis Prompt</span>
          {activeTab === 'analysis' && (
            <motion.div
              layoutId="activePromptTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('response')}
          className={`flex-1 px-6 py-4 font-mono text-sm font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
            activeTab === 'response'
              ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border-b-2 border-cyan-400 text-cyan-300'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Response Prompt</span>
          {activeTab === 'response' && (
            <motion.div
              layoutId="activePromptTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'analysis' ? (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-4 bg-black/30 rounded-xl border border-cyan-500/20">
              <h3 className="text-sm font-bold text-cyan-400 mb-3 font-mono uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Analysis Task Instructions</span>
              </h3>
              
              {isEditing ? (
                <textarea
                  value={analysisTask}
                  onChange={(e) => setAnalysisTask(e.target.value)}
                  className="w-full h-64 bg-gray-900/50 border border-cyan-500/30 rounded-lg p-4 text-cyan-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  placeholder="Enter analysis task instructions..."
                />
              ) : (
                <div className="text-sm font-mono leading-relaxed">
                  {formatContent(analysisTask)}
                </div>
              )}
            </div>

            <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <p className="text-sm text-cyan-300/70 font-mono leading-relaxed">
                <span className="font-bold text-cyan-400">Usage:</span> This section defines the core analysis workflow. 
                The LLM uses these instructions to determine user intent, select appropriate tools, and decide if confirmation is needed.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Instructions Section */}
            <div className="p-4 bg-black/30 rounded-xl border border-cyan-500/20">
              <h3 className="text-sm font-bold text-cyan-400 mb-3 font-mono uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Response Instructions</span>
              </h3>
              
              {isEditing ? (
                <textarea
                  value={responseInstructions}
                  onChange={(e) => setResponseInstructions(e.target.value)}
                  className="w-full h-48 bg-gray-900/50 border border-cyan-500/30 rounded-lg p-4 text-cyan-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  placeholder="Enter response instructions..."
                />
              ) : (
                <div className="text-sm font-mono leading-relaxed">
                  {formatContent(responseInstructions)}
                </div>
              )}
            </div>

            {/* Guidelines Section */}
            <div className="p-4 bg-black/30 rounded-xl border border-cyan-500/20">
              <h3 className="text-sm font-bold text-cyan-400 mb-3 font-mono uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Response Guidelines</span>
              </h3>
              
              {isEditing ? (
                <textarea
                  value={responseGuidelines}
                  onChange={(e) => setResponseGuidelines(e.target.value)}
                  className="w-full h-48 bg-gray-900/50 border border-cyan-500/30 rounded-lg p-4 text-cyan-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  placeholder="Enter response guidelines..."
                />
              ) : (
                <div className="text-sm font-mono leading-relaxed">
                  {formatContent(responseGuidelines)}
                </div>
              )}
            </div>

            <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <p className="text-sm text-cyan-300/70 font-mono leading-relaxed">
                <span className="font-bold text-cyan-400">Usage:</span> These sections guide the LLM in formatting responses. 
                Instructions define what to do, while Guidelines specify how to present information to users.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
