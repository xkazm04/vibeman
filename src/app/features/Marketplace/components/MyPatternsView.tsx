'use client';

import { useEffect } from 'react';
import { Plus, FileCode, Loader2, Edit, Trash2, Send, Eye } from 'lucide-react';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import PatternCard from './PatternCard';

export default function MyPatternsView() {
  const {
    myPatterns,
    isLoadingPatterns,
    fetchMyPatterns,
    setCurrentView,
    publishPattern,
    deletePattern,
    isPublishing,
  } = useMarketplaceStore();

  useEffect(() => {
    fetchMyPatterns();
  }, [fetchMyPatterns]);

  const handlePublish = async (patternId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await publishPattern(patternId);
  };

  const handleDelete = async (patternId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this pattern?')) {
      await deletePattern(patternId);
    }
  };

  const drafts = myPatterns.filter((p) => p.status === 'draft');
  const published = myPatterns.filter((p) => p.status !== 'draft');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">My Patterns</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage your contributed refactoring patterns
          </p>
        </div>

        <button
          onClick={() => setCurrentView('create')}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors flex items-center gap-2"
          data-testid="my-patterns-create-btn"
        >
          <Plus className="w-4 h-4" />
          Create Pattern
        </button>
      </div>

      {/* Loading State */}
      {isLoadingPatterns && myPatterns.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-gray-400">Loading your patterns...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingPatterns && myPatterns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileCode className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No patterns yet</h3>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            Share your refactoring knowledge with the community. Create your first pattern to help other developers improve their code.
          </p>
          <button
            onClick={() => setCurrentView('create')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
            data-testid="empty-create-pattern-btn"
          >
            <Plus className="w-5 h-5" />
            Create Your First Pattern
          </button>
        </div>
      )}

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Edit className="w-4 h-4 text-yellow-400" />
            <h3 className="text-lg font-medium text-white">Drafts</h3>
            <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-400 rounded-full">
              {drafts.length}
            </span>
          </div>

          <div className="space-y-3">
            {drafts.map((pattern) => (
              <div
                key={pattern.id}
                className="bg-black/30 border border-yellow-500/20 rounded-xl p-4 hover:bg-black/40 transition-colors"
                data-testid={`draft-pattern-${pattern.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <h4 className="text-white font-medium truncate">{pattern.title}</h4>
                    <p className="text-sm text-gray-500 truncate">{pattern.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handlePublish(pattern.id, e)}
                      disabled={isPublishing}
                      className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                      data-testid={`publish-pattern-${pattern.id}`}
                    >
                      <Send className="w-3 h-3" />
                      Publish
                    </button>

                    <button
                      onClick={(e) => handleDelete(pattern.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      data-testid={`delete-pattern-${pattern.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Published Section */}
      {published.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-green-400" />
            <h3 className="text-lg font-medium text-white">Published</h3>
            <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded-full">
              {published.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {published.map((pattern) => (
              <div key={pattern.id} className="relative group">
                <PatternCard pattern={pattern} showAuthor={false} />

                {/* Delete button overlay */}
                <button
                  onClick={(e) => handleDelete(pattern.id, e)}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  data-testid={`delete-published-${pattern.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
