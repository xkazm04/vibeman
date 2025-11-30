'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Search, Plus, Heart, Folder, User, Award } from 'lucide-react';
import { useMarketplaceStore, MarketplaceView } from '@/stores/marketplaceStore';
import BrowseView from './components/BrowseView';
import PatternDetailView from './components/PatternDetailView';
import CreatePatternView from './components/CreatePatternView';
import MyPatternsView from './components/MyPatternsView';
import FavoritesView from './components/FavoritesView';
import ProfileBadges from './components/ProfileBadges';

export default function MarketplaceLayout() {
  const {
    isModalOpen,
    currentView,
    closeModal,
    setCurrentView,
    fetchCurrentUser,
    fetchUserBadges,
    fetchPatterns,
    fetchFeaturedPatterns,
    fetchFavoritePatterns,
    currentUser,
  } = useMarketplaceStore();

  useEffect(() => {
    if (isModalOpen) {
      fetchCurrentUser();
      fetchUserBadges();
      fetchPatterns();
      fetchFeaturedPatterns();
      fetchFavoritePatterns();
    }
  }, [isModalOpen, fetchCurrentUser, fetchUserBadges, fetchPatterns, fetchFeaturedPatterns, fetchFavoritePatterns]);

  const handleClose = () => closeModal();

  const navItems: { view: MarketplaceView; icon: React.ReactNode; label: string }[] = [
    { view: 'browse', icon: <Search className="w-4 h-4" />, label: 'Browse' },
    { view: 'my-patterns', icon: <User className="w-4 h-4" />, label: 'My Patterns' },
    { view: 'favorites', icon: <Heart className="w-4 h-4" />, label: 'Favorites' },
    { view: 'create', icon: <Plus className="w-4 h-4" />, label: 'Create' },
  ];

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-7xl h-[90vh] bg-gray-900/90 backdrop-blur-xl border border-purple-500/20 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col relative"
          >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5 pointer-events-none" />

            {/* Animated Grid Pattern */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-purple-500/10 bg-purple-950/20 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10">
                  <Store className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Pattern Marketplace</h1>
                  <p className="text-xs text-purple-400/60 font-mono">COMMUNITY REFACTORING PATTERNS</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* User Profile Summary */}
                {currentUser && (
                  <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-black/20 rounded-xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {currentUser.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-white font-medium">{currentUser.display_name}</p>
                      <p className="text-xs text-purple-400 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {currentUser.reputation_score} rep
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="group relative p-2 hover:bg-white/5 rounded-full transition-colors"
                  data-testid="close-marketplace-modal"
                >
                  <X className="w-6 h-6 text-purple-400/60 group-hover:text-purple-400 transition-colors" />
                  <span className="sr-only">Close Marketplace</span>
                </button>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden relative z-10">
              {/* Sidebar Navigation */}
              <div className="w-56 border-r border-purple-500/10 bg-black/20 backdrop-blur-sm p-4 hidden lg:flex flex-col">
                <nav className="space-y-1 flex-1">
                  {navItems.map((item) => (
                    <button
                      key={item.view}
                      onClick={() => setCurrentView(item.view)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        currentView === item.view ||
                        (currentView === 'detail' && item.view === 'browse')
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      data-testid={`marketplace-nav-${item.view}`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </nav>

                {/* Profile Badges Preview */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <ProfileBadges compact />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 relative scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentView}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="max-w-6xl mx-auto"
                  >
                    {currentView === 'browse' && <BrowseView />}
                    {currentView === 'detail' && <PatternDetailView />}
                    {currentView === 'create' && <CreatePatternView />}
                    {currentView === 'my-patterns' && <MyPatternsView />}
                    {currentView === 'favorites' && <FavoritesView />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
