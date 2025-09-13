'use client';

import React from 'react';
import { CourseCard } from '../CourseCard';
import type { Course } from '@/types/learn.types';

export interface ExploreTabProps {
  courses: Course[];
  isLoading?: boolean;
  onCourseSelect: (course: Course) => void;
  searchQuery?: string;
  selectedCategory?: string;
  selectedLevel?: string;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({
  courses,
  isLoading = false,
  onCourseSelect,
  searchQuery = '',
  selectedCategory = 'all',
  selectedLevel = 'all'
}) => {
  const filteredCourses = courses.filter(course => {
    const matchesSearch = !searchQuery || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
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
          <p className="text-lg font-medium">Курсы не найдены</p>
          <p className="text-sm mt-2">Попробуйте изменить фильтры или поисковый запрос</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredCourses.map(course => (
        <CourseCard
          {...{
            key: course.id,
            course: course,
            onClick: () => onCourseSelect(course)
          } as any}
        />
      ))}
    </div>
  );
};

export default ExploreTab;
