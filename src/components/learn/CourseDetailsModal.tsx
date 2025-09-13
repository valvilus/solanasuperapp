'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Users, Star, BookOpen, Award } from 'lucide-react';
import type { Course, Lesson } from '@/types/learn.types';

export interface CourseDetailsModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onEnroll?: (course: Course) => void;
  onStartLearning?: (course: Course) => void;
  isEnrolled?: boolean;
  progress?: number;
  lessons?: Lesson[];
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  course,
  isOpen,
  onClose,
  onEnroll,
  onStartLearning,
  isEnrolled = false,
  progress = 0,
  lessons = []
}) => {
  if (!course) return null;

  const handleEnroll = () => {
    onEnroll?.(course);
  };

  const handleStartLearning = () => {
    onStartLearning?.(course);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onClose}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-xl"
            >
              {/* Header */}
              <div className="relative">
                <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                    <p className="text-lg opacity-90">{course.shortDescription}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-12rem)]">
                <div className="p-6">
                  {/* Progress bar for enrolled users */}
                  {isEnrolled && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Прогресс курса
                        </span>
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Course stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Длительность</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{course.duration}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Users className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Студенты</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{course.studentsCount || 0}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Star className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Рейтинг</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{course.rating || '4.8'}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <BookOpen className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Уроки</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{lessons.length}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Описание курса
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* What you'll learn */}
                  {course.objectives && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Что вы изучите
                      </h3>
                      <ul className="space-y-2">
                        {course.objectives.map((objective, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-500 mr-2 mt-1">✓</span>
                            <span className="text-gray-600 dark:text-gray-400">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Course curriculum */}
                  {lessons.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Программа курса
                      </h3>
                      <div className="space-y-2">
                        {lessons.map((lesson, index) => (
                          <div key={lesson.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-sm text-gray-500 dark:text-gray-400 mr-3">
                              {index + 1}.
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{lesson.title}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{lesson.duration}</p>
                            </div>
                            {lesson.isCompleted && (
                              <span className="text-green-500">✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rewards */}
                  {course.rewards && course.rewards.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Награды за завершение
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {course.rewards.map((reward, index) => (
                          <div key={index} className="flex items-center px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-full text-sm">
                            <Award className="w-4 h-4 mr-1" />
                            {reward.type === 'XP' as any && `${reward.amount} XP`}
                            {reward.type === 'TOKENS' as any && `${reward.amount} токенов`}
                            {reward.type === 'CERTIFICATE' && 'Сертификат'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                <div className="flex space-x-4">
                  {!isEnrolled ? (
                    <button
                      onClick={handleEnroll}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Записаться на курс
                    </button>
                  ) : (
                    <button
                      onClick={handleStartLearning}
                      className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      {progress > 0 ? 'Продолжить обучение' : 'Начать обучение'}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CourseDetailsModal;
