'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface NFTMintStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  signature?: string;
  error?: string;
}

export interface NFTMintProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: NFTMintStep[];
  currentStep: number;
  isCompleted: boolean;
  error?: string;
  onRetry?: () => void;
  onViewNFT?: () => void;
  mintedNFT?: {
    id: string;
    name: string;
    image: string;
    mint: string;
  };
}

export const NFTMintProgressModal: React.FC<NFTMintProgressModalProps> = ({
  isOpen,
  onClose,
  steps,
  currentStep,
  isCompleted,
  error,
  onRetry,
  onViewNFT,
  mintedNFT
}) => {
  const getStepIcon = (step: NFTMintStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (step.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else if (step.status === 'in_progress') {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    } else {
      return (
        <div className={`w-5 h-5 rounded-full border-2 ${
          index <= currentStep ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
        }`}>
          {index < currentStep && (
            <CheckCircle className="w-5 h-5 text-white -m-[2px]" />
          )}
        </div>
      );
    }
  };

  const getStepStatus = (step: NFTMintStep, index: number) => {
    if (step.status === 'completed') return 'Завершено';
    if (step.status === 'error') return 'Ошибка';
    if (step.status === 'in_progress') return 'Выполняется...';
    if (index <= currentStep) return 'В очереди';
    return 'Ожидание';
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
              className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {isCompleted ? 'NFT Successfully Minted!' : 'Minting NFT...'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Success State */}
                {isCompleted && mintedNFT && (
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-lg overflow-hidden">
                      <img 
                        src={mintedNFT.image} 
                        alt={mintedNFT.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {mintedNFT.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                      Mint: {mintedNFT.mint}
                    </p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      <span className="font-medium text-red-700 dark:text-red-300">
                        Minting Failed
                      </span>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Steps */}
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start space-x-3 p-3 rounded-lg ${
                        step.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' :
                        step.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                        step.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-900/20' :
                        'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getStepIcon(step, index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {step.title}
                          </p>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            step.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            step.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            step.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                          }`}>
                            {getStepStatus(step, index)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {step.description}
                        </p>
                        {step.error && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            {step.error}
                          </p>
                        )}
                        {step.signature && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                            Signature: {step.signature}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Progress Bar */}
                {!isCompleted && !error && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Progress
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {Math.round((currentStep / steps.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div 
                        className="bg-blue-600 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                <div className="flex space-x-3">
                  {isCompleted && onViewNFT && (
                    <button
                      onClick={onViewNFT}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      View NFT
                    </button>
                  )}
                  {error && onRetry && (
                    <button
                      onClick={onRetry}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className={`${isCompleted || error ? 'flex-1' : 'w-full'} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                  >
                    {isCompleted ? 'Close' : 'Cancel'}
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

export default NFTMintProgressModal;
