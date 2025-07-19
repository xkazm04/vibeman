import { DevelopmentRequirement } from '@/types/development';
import React, { useState } from 'react';

interface RequirementCreatorProps {
  onRequirementCreated: (requirement: DevelopmentRequirement) => void;
  monitoredProjects: string[];
}

export const CursorReqCreator: React.FC<RequirementCreatorProps> = ({
  onRequirementCreated,
  monitoredProjects
}) => {
  const [formData, setFormData] = useState({
    projectPath: '',
    title: 'Test - Hello World',
    description: 'Create a simple React component that displays Hello World',
    priority: 'medium' as const,
    files: '/src/page.tsx',
    estimatedComplexity: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Generate preview of task name
  const generateTaskNamePreview = (title: string) => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${month}${day}`;
    
    const shortTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    return `req-${datePrefix}-${shortTitle}.json`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const filesArray = formData.files
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const response = await fetch('/api/requirements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          files: filesArray
        })
      });

      const result = await response.json();

      if (result.success) {
        setSubmitResult({ success: true, message: 'Requirement submitted to Claude Code!' });
        onRequirementCreated(result.requirement);
        
        // Reset form
        setFormData({
          projectPath: '',
          title: 'Test - Hello World',
          description: 'Create a simple React component that displays Hello World',
          priority: 'medium' as const,
          files: '/src/page.tsx',
          estimatedComplexity: 0
        });
      } else {
        setSubmitResult({ success: false, message: result.message || 'Failed to submit requirement' });
      }
    } catch (error) {
      console.error('Error submitting requirement:', error);
      setSubmitResult({ success: false, message: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityColors = {
    low: 'from-green-500 to-emerald-500',
    medium: 'from-yellow-500 to-orange-500',
    high: 'from-red-500 to-pink-500'
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Create Development Requirement</h2>
        </div>
        <p className="text-gray-400">Define your next development task with precision and clarity</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Target Project
          </label>
          <div className="relative">
            <select
              value={formData.projectPath}
              onChange={(e) => setFormData({ ...formData, projectPath: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 appearance-none"
              required
            >
              <option value="" className="bg-gray-800">Select a project...</option>
              {monitoredProjects.map((path) => (
                <option key={path} value={path} className="bg-gray-800">
                  {path.split('/').pop()} ({path})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Requirement Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
            placeholder="e.g., Add user authentication system"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            💾 Task will be saved as: <code className="bg-gray-700 px-1 rounded text-blue-300">{generateTaskNamePreview(formData.title)}</code>
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Detailed Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={6}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 resize-none"
            placeholder="Describe the requirement in detail. Include specific functionality, user stories, technical requirements, etc."
            required
          />
        </div>

        {/* Priority and Complexity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Priority Level
            </label>
            <div className="relative">
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 appearance-none"
              >
                <option value="low" className="bg-gray-800">🟢 Low Priority</option>
                <option value="medium" className="bg-gray-800">🟡 Medium Priority</option>
                <option value="high" className="bg-gray-800">🔴 High Priority</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Complexity Score ({formData.estimatedComplexity}/10)
            </label>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.estimatedComplexity}
                onChange={(e) => setFormData({ ...formData, estimatedComplexity: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Simple</span>
                <span>Complex</span>
              </div>
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Relevant Files
          </label>
          <textarea
            value={formData.files}
            onChange={(e) => setFormData({ ...formData, files: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 resize-none font-mono text-sm"
            placeholder="src/components/Auth.tsx&#10;src/pages/login.tsx&#10;src/lib/auth.ts"
          />
          <p className="text-sm text-gray-500">
            💡 List files that should be created or modified (one per line). Leave empty if unsure.
          </p>
        </div>

        {/* Submit Result */}
        {submitResult && (
          <div className={`p-4 rounded-xl border ${
            submitResult.success 
              ? 'bg-green-500/10 border-green-500/30 text-green-300' 
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          } backdrop-blur-sm`}>
            <div className="flex items-center gap-2">
              {submitResult.success ? (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {submitResult.message}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-6 py-4 rounded-xl font-medium transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
            isSubmitting
              ? 'bg-gray-600 text-gray-300'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/25'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Submitting to Claude...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Submit Requirement
            </div>
          )}
        </button>
      </form>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #3b82f6);
          cursor: pointer;
          border: 2px solid #374151;
          box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8b5cf6, #3b82f6);
          cursor: pointer;
          border: 2px solid #374151;
          box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
        }
      `}</style>
    </div>
  );
};