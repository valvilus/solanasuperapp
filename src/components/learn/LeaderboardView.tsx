'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface LeaderboardEntry {
  id: string;
  userName: string;
  avatar?: string;
  score: number;
  rank: number;
  totalXP: number;
  coursesCompleted: number;
  streak: number;
}

export interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  isLoading?: boolean;
  timeframe?: 'week' | 'month' | 'all';
  onTimeframeChange?: (timeframe: 'week' | 'month' | 'all') => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  currentUserId,
  isLoading = false,
  timeframe = 'week',
  onTimeframeChange
}) => {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-orange-600';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank.toString();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 h-16 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      {onTimeframeChange && (
        <div className="flex space-x-2">
          {['week', 'month', 'all'].map((period) => (
            <button
              key={period}
              onClick={() => onTimeframeChange(period as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeframe === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Все время'}
            </button>
          ))}
        </div>
      )}

      {/* Top 3 */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {entries.slice(0, 3).map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`text-center p-4 rounded-lg ${
                entry.id === currentUserId 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className={`text-4xl mb-2 ${getRankColor(entry.rank)}`}>
                {getRankIcon(entry.rank)}
              </div>
              <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                {entry.avatar ? (
                  <img src={entry.avatar} alt={entry.userName} className="w-full h-full rounded-full" />
                ) : (
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {entry.userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {entry.userName}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {entry.totalXP.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">XP</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Rest of the leaderboard */}
      <div className="space-y-2">
        {entries.slice(3).map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: (index + 3) * 0.05 }}
            className={`flex items-center p-4 rounded-lg transition-colors ${
              entry.id === currentUserId 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className={`w-8 text-center font-bold ${getRankColor(entry.rank)}`}>
              {entry.rank}
            </div>
            
            <div className="w-10 h-10 mx-4 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              {entry.avatar ? (
                <img src={entry.avatar} alt={entry.userName} className="w-full h-full rounded-full" />
              ) : (
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  {entry.userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{entry.userName}</p>
              <div className="flex space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>🏆 {entry.coursesCompleted} курсов</span>
                <span>🔥 {entry.streak} дней</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {entry.totalXP.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">XP</p>
            </div>
          </motion.div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">Рейтинг пуст</p>
            <p className="text-sm mt-2">Начните изучать курсы, чтобы попасть в рейтинг</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardView;
