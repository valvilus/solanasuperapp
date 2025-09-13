'use client'

import { useState, useEffect } from 'react'
import { LearnUserService } from '../services/user.service'
import { LearningStats, DailyChallenge, Achievement } from '../types'
import { useAuth } from '../../../contexts/AuthContext'

interface UserData {
  profile: any | null
  learningStats: LearningStats | null
  dailyChallenges: DailyChallenge[]
  achievements: Achievement[]
  isLoading: boolean
  error: string | null
}

export function useUserData() {
  const { apiCall, isAuthenticated } = useAuth()
  const [data, setData] = useState<UserData>({
    profile: null,
    learningStats: null,
    dailyChallenges: [],
    achievements: [],
    isLoading: true,
    error: null
  })

  const loadUserData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }))

      if (!isAuthenticated) {
        setData(prev => ({ ...prev, isLoading: false, error: null }))
        return
      }

      // Загружаем все данные параллельно используя apiCall
      const [profileRes, challengesRes, achievementsRes, progressRes] = await Promise.all([
        apiCall('/api/learn/user/profile'),
        apiCall('/api/learn/user/challenges'),
        apiCall('/api/learn/user/achievements'),
        apiCall('/api/learn/user/progress-stats?weeks=12&months=6')
      ])

      const profile = profileRes.ok ? (await profileRes.json()).data : null
      const challengesData = challengesRes.ok ? await challengesRes.json() : { challenges: [] }
      const achievementsData = achievementsRes.ok ? await achievementsRes.json() : { achievements: [] }
      const progressStatsData = progressRes.ok ? (await progressRes.json()).data : null

      if (profile) {
        // Конвертируем данные профиля в LearningStats
        // Получаем реальные рейтинги по категориям
        const categoryRanksRes = await apiCall('/api/learn/user/category-ranks')
        const categoryRanksData = categoryRanksRes.ok ? await categoryRanksRes.json() : null

        // Используем данные из progressStats API если они есть, иначе из профиля
        const learningStats: LearningStats = progressStatsData ? {
          totalCoursesEnrolled: progressStatsData.totalCoursesEnrolled,
          totalCoursesCompleted: progressStatsData.totalCoursesCompleted,
          totalLessonsCompleted: progressStatsData.totalLessonsCompleted,
          totalQuizzesCompleted: progressStatsData.totalQuizzesCompleted,
          totalTimeSpent: progressStatsData.totalTimeSpent,
          totalXpEarned: progressStatsData.totalXpEarned,
          totalTokensEarned: progressStatsData.totalTokensEarned,
          weeklyProgress: progressStatsData.weeklyProgress || [],
          monthlyProgress: progressStatsData.monthlyProgress || [],
          averageQuizScore: progressStatsData.averageQuizScore,
          averageCourseCompletion: progressStatsData.averageCourseCompletion,
          currentStreak: progressStatsData.currentStreak,
          longestStreak: progressStatsData.longestStreak,
          categoryRanks: progressStatsData.categoryRanks || categoryRanksData?.categoryRanks || {
            blockchain: 0,
            defi: 0,
            nft: 0,
            trading: 0,
            development: 0,
            security: 0
          }
        } : {
          // Fallback к данным профиля если progressStats недоступны
          totalCoursesEnrolled: profile?.stats?.totalCoursesEnrolled || 0,
          totalCoursesCompleted: profile?.stats?.totalCoursesCompleted || 0,
          totalLessonsCompleted: profile?.stats?.totalLessonsCompleted || 0,
          totalQuizzesCompleted: profile?.stats?.totalQuizzesCompleted || 0,
          totalTimeSpent: Math.round((profile?.stats?.totalLessonsCompleted || 0) * 30),
          totalXpEarned: profile?.stats?.totalXP || 0,
          totalTokensEarned: profile?.stats?.tokensEarned || 0,
          weeklyProgress: [],
          monthlyProgress: [],
          averageQuizScore: profile?.stats?.averageScore || 0,
          averageCourseCompletion: profile?.stats?.completionRate || 0,
          currentStreak: profile?.stats?.currentStreak || 0,
          longestStreak: profile?.stats?.currentStreak || 0,
          categoryRanks: categoryRanksData?.categoryRanks || {
            blockchain: 0,
            defi: 0,
            nft: 0,
            trading: 0,
            development: 0,
            security: 0
          }
        }

        // Конвертируем челленджи
        const dailyChallenges = challengesData.challenges.map((challenge: any) => ({
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          type: challenge.type as any,
          target: challenge.targetValue,
          currentProgress: challenge.currentProgress,
          reward: {
            xp: challenge.reward.xp,
            tokens: challenge.reward.tokens
          },
          expiresAt: challenge.expiresAt,
          isCompleted: challenge.isCompleted
        }))

        // Конвертируем достижения
        const achievements: Achievement[] = achievementsData.achievements.map((achievement: any) => ({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category as any,
          isUnlocked: achievement.isUnlocked,
          unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : undefined,
          requirement: achievement.requirement,
          reward: achievement.reward,
          progress: achievement.progress
        }))

        setData({
          profile,
          learningStats,
          dailyChallenges,
          achievements,
          isLoading: false,
          error: null
        })
      } else {
        // Fallback к пустым данным если нет профиля
        setData({
          profile: null,
          learningStats: null,
          dailyChallenges: [],
          achievements: [],
          isLoading: false,
          error: null
        })
      }

    } catch (error) {
      console.error('Error loading user data:', error)
      
      // Fallback к пустым данным при ошибке
      setData({
        profile: null,
        learningStats: null,
        dailyChallenges: [],
        achievements: [],
        isLoading: false,
        error: 'Failed to load user data'
      })
    }
  }

  const completeChallenge = async (challengeId: string) => {
    try {
      const response = await apiCall('/api/learn/user/challenges', {
        method: 'POST',
        body: JSON.stringify({ challengeId })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          // Обновляем локальные данные
          setData(prev => ({
            ...prev,
            dailyChallenges: prev.dailyChallenges.map(challenge =>
              challenge.id === challengeId 
                ? { ...challenge, isCompleted: true, currentProgress: challenge.target }
                : challenge
            )
          }))
          
          return result
        } else {
          throw new Error(result.error)
        }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error completing challenge:', error)
      return { success: false, error: 'Failed to complete challenge' }
    }
  }

  const refreshData = () => {
    loadUserData()
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData()
    }
  }, [isAuthenticated])
  
  // Заглушка для DailyChallenge[] если нужно
  const dailyChallenges: any[] = []

  return {
    ...data,
    completeChallenge,
    refreshData
  }
}
