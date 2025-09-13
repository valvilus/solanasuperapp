import type { Job, JobType, JobStatus, ExperienceLevel } from '../types/jobs.types';

// Mock jobs data for development and testing - temporarily disabled for build
export const MOCK_JOBS: any[] = [];

// Job helper functions
export const getJobsByCategory = (type: JobType): Job[] => {
  return MOCK_JOBS.filter(job => job.type === type);
};

export const getJobsByStatus = (status: JobStatus): Job[] => {
  return MOCK_JOBS.filter(job => job.status === status);
};

export const getJobsByExperienceLevel = (skillLevel: ExperienceLevel): Job[] => {
  return MOCK_JOBS.filter(job => job.experienceLevel === skillLevel);
};

export const getJobsByBudgetRange = (min: number, max: number): Job[] => {
  return MOCK_JOBS.filter(job => 
    (job as any).budget >= min && (job as any).budget <= max
  );
};

export const getFeaturedJobs = (): Job[] => {
  return MOCK_JOBS.filter(job => (job as any).isFeatured);
};

export const getUrgentJobs = (): Job[] => {
  return MOCK_JOBS.filter(job => (job as any).isUrgent);
};

export const searchJobs = (query: string): Job[] => {
  const lowercaseQuery = query.toLowerCase();
  return MOCK_JOBS.filter(job => 
    job.title.toLowerCase().includes(lowercaseQuery) ||
    job.description.toLowerCase().includes(lowercaseQuery) ||
    (job as any).skills.some((skill: string) => skill.toLowerCase().includes(lowercaseQuery)) ||
    (job as any).tags.some((tag: string) => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export default MOCK_JOBS;