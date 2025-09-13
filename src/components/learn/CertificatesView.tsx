'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { Certificate } from '@/types/learn.types';

export interface CertificatesViewProps {
  certificates: Certificate[];
  isLoading?: boolean;
  onCertificateSelect?: (certificate: Certificate) => void;
  onDownload?: (certificate: Certificate) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  certificates,
  isLoading = false,
  onCertificateSelect,
  onDownload
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">Сертификаты не найдены</p>
          <p className="text-sm mt-2">Завершите курсы, чтобы получить сертификаты</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {certificates.map((certificate, index) => (
        <motion.div
          key={certificate.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onCertificateSelect?.(certificate)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {certificate.courseName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Выдан {new Date(certificate.issueDate).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className="ml-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Сертификат
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Студент:</span>
                <span className="font-medium text-gray-900 dark:text-white">{certificate.studentName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Оценка:</span>
                <span className="font-medium text-gray-900 dark:text-white">{certificate.grade}%</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCertificateSelect?.(certificate);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Просмотр
              </button>
              {onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(certificate);
                  }}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Скачать
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CertificatesView;
