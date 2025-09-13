'use client';

import React from 'react';
import { CourseCard } from '../CourseCard';
import type { Course, UserProgress } from '@/types/learn.types';

export interface MyCoursesTabProps {
  courses: Course[];
  userProgress: UserProgress[];
  isLoading?: boolean;
  onCourseSelect: (course: Course) => void;
  filter?: 'all' | 'in-progress' | 'completed';
}

export const MyCoursesTab: React.FC<MyCoursesTabProps> = ({
  courses,
  userProgress,
  isLoading = false,
  onCourseSelect,
  filter = 'all'
}) => {
  const getProgressForCourse = (courseId: string) => {
    return userProgress.find(p => p.courseId === courseId);
  };

  const filteredCourses = courses.filter(course => {
    const progress = getProgressForCourse(course.id);
    
    switch (filter) {
      case 'in-progress':
        return progress && progress.progress > 0 && progress.progress < 100;
      case 'completed':
        return progress && progress.progress === 100;
      default:
        return progress; // Показываем только курсы с прогрессом
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 h-48 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredCourses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">
            {filter === 'completed' ? 'Нет завершенных курсов' :
             filter === 'in-progress' ? 'Нет курсов в процессе' :
             'Вы еще не начали изучать курсы'}
          </p>
          <p className="text-sm mt-2">
            {filter === 'all' 
              ? 'Перейдите на вкладку "Исследовать", чтобы начать обучение'
              : 'Начните изучение новых курсов или продолжите текущие'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredCourses.map(course => {
        const progress = getProgressForCourse(course.id);
        return (
          <CourseCard
            {...{
              key: course.id,
              course: course,
              progress: progress,
              onClick: () => onCourseSelect(course)
            } as any}
          />
        );
      })}
    </div>
  );
};

export default MyCoursesTab;
