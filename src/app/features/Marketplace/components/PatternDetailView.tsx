'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Download,
  Heart,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  User,
  Award,
  GitBranch,
  FileCode,
  ExternalLink,
  Loader2,
  Send,
} from 'lucide-react';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import type { DbRefactoringPatternWithAuthor, PatternCategory } from '@/app/db/models/marketplace.types';

const categoryColors: Record<PatternCategory, { bg: string; text: string; border: string }> = {
  migration: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  cleanup: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  security: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  performance: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  architecture: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  testing: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  accessibility: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  modernization: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'best-practices': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
};

export default function PatternDetailView() {
  const {
    selectedPatternId,
    patterns,
    setCurrentView,
    toggleFavorite,
    isFavorite,
    ratePattern,
  } = useMarketplaceStore();

  const [pattern, setPattern] = useState<DbRefactoringPatternWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadPattern = async () => {
      if (!selectedPatternId) {
        setCurrentView('browse');
        return;
      }

      // First check if it's in the current patterns list
      const found = patterns.find((p) => p.id === selectedPatternId);
      if (found) {
        setPattern(found);
        setLoading(false);
        return;
      }

      // Otherwise fetch from API
      try {
        const response = await fetch(`/api/marketplace/patterns/${selectedPatternId}`);
        if (response.ok) {
          const data = await response.json();
          setPattern(data.pattern);
        }
      } catch (error) {
        console.error('Error loading pattern:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPattern();
  }, [selectedPatternId, patterns, setCurrentView]);

  const handleBack = () => {
    setCurrentView('browse');
  };

  const handleCopyPattern = async () => {
    if (!pattern) return;

    const exportData = {
      name: pattern.name,
      title: pattern.title,
      description: pattern.description,
      problem_statement: pattern.problem_statement,
      solution_approach: pattern.solution_approach,
      category: pattern.category,
      scope: pattern.scope,
      detection_rules: pattern.detection_rules,
      transformation_rules: pattern.transformation_rules,
      example_before: pattern.example_before,
      example_after: pattern.example_after,
    };

    await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitRating = async () => {
    if (!pattern || userRating === 0) return;

    setSubmittingRating(true);
    const success = await ratePattern(pattern.id, userRating, userReview || undefined);
    if (success) {
      setUserRating(0);
      setUserReview('');
    }
    setSubmittingRating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Pattern not found</p>
        <button
          onClick={handleBack}
          className="mt-4 text-purple-400 hover:text-purple-300"
        >
          Go back to browse
        </button>
      </div>
    );
  }

  const categoryStyle = categoryColors[pattern.category] || categoryColors.cleanup;
  const isFav = isFavorite(pattern.id);

  // Parse JSON fields
  const tags: string[] = (() => {
    try {
      return JSON.parse(pattern.tags || '[]');
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        data-testid="pattern-detail-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Browse
      </button>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border} border`}>
                  {pattern.category}
                </span>
                <span className="px-2 py-1 text-xs text-gray-500 bg-white/5 rounded-lg">
                  v{pattern.version}
                </span>
                {pattern.status === 'featured' && (
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-400 rounded-lg">
                    Featured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(pattern.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isFav
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-white/5 text-gray-400 hover:text-pink-400'
                  }`}
                  data-testid="pattern-detail-favorite"
                >
                  <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={handleCopyPattern}
                  className="p-2 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors"
                  data-testid="pattern-detail-copy"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">{pattern.title}</h1>
            <p className="text-gray-400">{pattern.description}</p>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 text-xs font-medium text-gray-400 bg-white/5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Problem & Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/30 border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-medium text-orange-400">Problem Statement</h3>
              </div>
              <p className="text-sm text-gray-300">{pattern.problem_statement}</p>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-medium text-green-400">Solution Approach</h3>
              </div>
              <p className="text-sm text-gray-300">{pattern.solution_approach}</p>
            </div>
          </div>

          {/* Code Examples */}
          {(pattern.example_before || pattern.example_after) && (
            <div className="bg-black/30 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                Code Examples
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pattern.example_before && (
                  <div>
                    <p className="text-xs text-red-400 mb-2">Before</p>
                    <pre className="bg-black/50 p-4 rounded-lg text-xs text-gray-300 overflow-x-auto font-mono">
                      {pattern.example_before}
                    </pre>
                  </div>
                )}
                {pattern.example_after && (
                  <div>
                    <p className="text-xs text-green-400 mb-2">After</p>
                    <pre className="bg-black/50 p-4 rounded-lg text-xs text-gray-300 overflow-x-auto font-mono">
                      {pattern.example_after}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rate This Pattern */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-5">
            <h3 className="text-sm font-medium text-white mb-4">Rate This Pattern</h3>

            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setUserRating(rating)}
                  className="p-1 transition-transform hover:scale-110"
                  data-testid={`rating-star-${rating}`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      rating <= userRating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-600 hover:text-yellow-400/50'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={userReview}
              onChange={(e) => setUserReview(e.target.value)}
              placeholder="Share your experience with this pattern (optional)"
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-600 resize-none outline-none focus:border-purple-500/50"
              rows={3}
              data-testid="pattern-review-input"
            />

            <div className="flex justify-end mt-3">
              <button
                onClick={handleSubmitRating}
                disabled={userRating === 0 || submittingRating}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                data-testid="submit-rating-btn"
              >
                {submittingRating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Rating
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* Stats Card */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-white">Statistics</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Rating</span>
                </div>
                <span className="text-white font-medium">
                  {pattern.rating_average.toFixed(1)} ({pattern.rating_count})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Downloads</span>
                </div>
                <span className="text-white font-medium">{pattern.download_count}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm">Success Rate</span>
                </div>
                <span className="text-white font-medium">
                  {pattern.success_rate ? `${pattern.success_rate.toFixed(0)}%` : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <GitBranch className="w-4 h-4" />
                  <span className="text-sm">Applied</span>
                </div>
                <span className="text-white font-medium">{pattern.apply_count} times</span>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-white">Details</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Scope</span>
                <span className="text-white capitalize">{pattern.scope}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Effort</span>
                <div className="flex items-center gap-1">
                  {pattern.estimated_effort === 'low' && <Zap className="w-4 h-4 text-green-400" />}
                  {pattern.estimated_effort === 'medium' && <Clock className="w-4 h-4 text-yellow-400" />}
                  {pattern.estimated_effort === 'high' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  <span className="text-white capitalize">{pattern.estimated_effort}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Risk Level</span>
                <span className={`capitalize ${
                  pattern.risk_level === 'low' ? 'text-green-400' :
                  pattern.risk_level === 'medium' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {pattern.risk_level}
                </span>
              </div>

              {pattern.language && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Language</span>
                  <span className="text-white">{pattern.language}</span>
                </div>
              )}

              {pattern.framework && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Framework</span>
                  <span className="text-white">{pattern.framework}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Auto-fix</span>
                <span className={pattern.automated ? 'text-green-400' : 'text-gray-500'}>
                  {pattern.automated ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Requires Review</span>
                <span className={pattern.requires_review ? 'text-yellow-400' : 'text-green-400'}>
                  {pattern.requires_review ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Author Card */}
          {pattern.author_display_name && (
            <div className="bg-black/30 border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-3">Author</h3>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{pattern.author_display_name}</p>
                  <p className="text-xs text-purple-400 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {pattern.author_reputation_score} reputation
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Apply Pattern Button */}
          <button
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
            data-testid="apply-pattern-btn"
          >
            <Download className="w-5 h-5" />
            Apply to Project
          </button>
        </div>
      </div>
    </div>
  );
}
