'use client';

import { motion } from 'framer-motion';
import { Award, Loader2 } from 'lucide-react';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface ProfileBadgesProps {
  compact?: boolean;
}

export default function ProfileBadges({ compact = false }: ProfileBadgesProps) {
  const { userBadges = [], currentUser, isLoadingUser } = useMarketplaceStore();

  // Ensure userBadges is always an array (handles persisted undefined state)
  const badges = userBadges ?? [];

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Badges</span>
          <span className="text-purple-400">{badges.length}</span>
        </div>

        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, 4).map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.1 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.badge_color?.replace('text-', 'bg-').replace('-400', '-500/20') || 'bg-purple-500/20'} border border-white/10`}
                title={`${badge.badge_name}: ${badge.badge_description}`}
              >
                <span className="text-lg">{badge.badge_icon}</span>
              </motion.div>
            ))}
            {badges.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs text-gray-500">
                +{badges.length - 4}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-600">Earn badges by contributing</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
          <div className="text-center">
            <p className="text-lg font-bold text-purple-400">{currentUser.total_patterns}</p>
            <p className="text-[10px] text-gray-500">Patterns</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-pink-400">{currentUser.total_downloads}</p>
            <p className="text-[10px] text-gray-500">Downloads</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/30 border border-white/5 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-medium text-white">Your Badges</h3>
      </div>

      {badges.length > 0 ? (
        <div className="space-y-4">
          {/* Badge Grid */}
          <div className="grid grid-cols-4 gap-3">
            {badges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.05 }}
                className="group relative"
              >
                <div
                  className={`aspect-square rounded-xl flex items-center justify-center ${badge.badge_color?.replace('text-', 'bg-').replace('-400', '-500/20') || 'bg-purple-500/20'} border border-white/10 transition-all group-hover:border-white/20`}
                >
                  <span className="text-2xl">{badge.badge_icon}</span>
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-white/10 rounded-lg text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[150px]">
                  <p className={`text-sm font-medium ${badge.badge_color || 'text-white'}`}>
                    {badge.badge_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{badge.badge_description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Earned date for most recent */}
          {badges[0] && (
            <p className="text-xs text-gray-500 text-center">
              Latest: {badges[0].badge_name} earned{' '}
              {new Date(badges[0].earned_at).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6 text-gray-600" />
          </div>
          <p className="text-sm text-gray-400 mb-2">No badges yet</p>
          <p className="text-xs text-gray-600">
            Contribute patterns and help the community to earn badges!
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
        <div className="text-center">
          <p className="text-xl font-bold text-purple-400">{currentUser.reputation_score}</p>
          <p className="text-xs text-gray-500">Reputation</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-cyan-400">{currentUser.total_patterns}</p>
          <p className="text-xs text-gray-500">Patterns</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-pink-400">{currentUser.total_downloads}</p>
          <p className="text-xs text-gray-500">Downloads</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-yellow-400">{currentUser.total_likes}</p>
          <p className="text-xs text-gray-500">Likes</p>
        </div>
      </div>
    </div>
  );
}
