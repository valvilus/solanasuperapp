import type { 
  UserProgress, 
  LearningStats, 
  Certificate, 
  DailyChallenge,
  Achievement
} from '@/types/learn.types';

export class UserService {
  private static baseUrl = '/api/learn/user';

  /**
   * Получить прогресс пользователя
   */
  static async getUserProgress(userId: string): Promise<UserProgress[]> {
    try {
      const response = await fetch(`${this.baseUrl}/progress?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user progress');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching user progress:', error);
      return [];
    }
  }

  /**
   * Получить статистику обучения пользователя
   */
  static async getLearningStats(userId: string): Promise<LearningStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch learning stats');
      }
      const data = await response.json();
      return data.data || {
        totalXP: 0,
        totalTokens: 0,
        totalCoursesCompleted: 0,
        totalLessonsCompleted: 0,
        totalQuizzesCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalTimeSpent: 0,
        averageQuizScore: 0,
        // weeklyGoal: 0, // removed - field doesn't exist
        weeklyProgress: [],
        // level: 1, // removed - field doesn't exist
        // nextLevelXp: 1000, // removed - field doesn't exist
      };
    } catch (error) {
      console.error('Error fetching learning stats:', error);
      return {
        totalXP: 0,
        totalTokens: 0,
        totalCoursesCompleted: 0,
        totalCoursesEnrolled: 0,
        totalLessonsCompleted: 0,
        totalQuizzesCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalTimeSpent: 0,
        totalXpEarned: 0,
        totalTokensEarned: 0,
        averageQuizScore: 0,
        averageCourseCompletion: 0,
        categoryRanks: {
          NFT: 1,
          DEVELOPMENT: 1,
          BLOCKCHAIN: 1,
          DEFI: 1,
          TRADING: 1,
          SECURITY: 1
        },
        // weeklyGoal: 0, // removed - field doesn't exist
        weeklyProgress: [],
        // level: 1, // removed - field doesn't exist
        // nextLevelXp: 1000, // removed - field doesn't exist
      };
    }
  }

  /**
   * Получить сертификаты пользователя
   */
  static async getUserCertificates(userId: string): Promise<Certificate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/certificates?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user certificates');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching user certificates:', error);
      return [];
    }
  }

  /**
   * Получить достижения пользователя
   */
  static async getAchievements(userId: string): Promise<Achievement[]> {
    try {
      const response = await fetch(`${this.baseUrl}/achievements?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user achievements');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }
  }

  /**
   * Получить ежедневные вызовы пользователя
   */
  static async getDailyChallenges(userId: string): Promise<DailyChallenge[]> {
    try {
      const response = await fetch(`${this.baseUrl}/challenges?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch daily challenges');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching daily challenges:', error);
      return [];
    }
  }

  /**
   * Обновить еженедельную цель
   */
  static async updateWeeklyGoal(userId: string, goal: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/weekly-goal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, goal }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating weekly goal:', error);
      return false;
    }
  }

  /**
   * Отметить выполнение ежедневного вызова
   */
  static async completeDailyChallenge(userId: string, challengeId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/challenges/${challengeId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error completing daily challenge:', error);
      return false;
    }
  }

  /**
   * Получить прогресс курса
   */
  static async getCourseProgress(userId: string, courseId: string): Promise<UserProgress | null> {
    try {
      const response = await fetch(`${this.baseUrl}/progress/${courseId}?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch course progress');
      }
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      console.error('Error fetching course progress:', error);
      return null;
    }
  }

  /**
   * Обновить прогресс курса
   */
  static async updateCourseProgress(
    userId: string, 
    courseId: string, 
    progress: Partial<UserProgress>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/progress/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ...progress }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating course progress:', error);
      return false;
    }
  }

  /**
   * Получить рейтинг пользователей
   */
  static async getLeaderboard(timeframe: 'week' | 'month' | 'all' = 'week', limit = 100) {
    try {
      const response = await fetch(`${this.baseUrl}/leaderboard?timeframe=${timeframe}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Экспорт данных пользователя
   */
  static async exportUserData(userId: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/export?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to export user data');
      }
      return await response.blob();
    } catch (error) {
      console.error('Error exporting user data:', error);
      return null;
    }
  }
}

export default UserService;

// Additional methods
export class ExtendedUserService extends UserService {
  static async getUserProfile(userId: string) {
    try {
      const response = await fetch(`/api/learn/user/profile?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  static async exportProgress(userId: string) {
    try {
      const response = await fetch(`/api/learn/user/export?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to export progress');
      }
      return await response.json();
    } catch (error) {
      console.error('Error exporting progress:', error);
      return null;
    }
  }
}

// Alias export for compatibility
export { UserService as LearnUserService };