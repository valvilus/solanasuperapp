'use client'

import { useState, useCallback } from 'react'
// import { MintStep, DEFAULT_MINT_STEPS } from '@/components/nft/NFTMintProgressModal' // exports not available

interface MintStep {
  id: string
  title: string
  status: 'pending' | 'active' | 'completed' | 'error'
}

const DEFAULT_MINT_STEPS: MintStep[] = [
  { id: '1', title: 'Preparing', status: 'pending' },
  { id: '2', title: 'Minting', status: 'pending' },
  { id: '3', title: 'Complete', status: 'pending' }
]

export interface MintProgressState {
  isOpen: boolean
  steps: MintStep[]
  currentStep: number
  overallProgress: number
  isCompleted: boolean
  error?: string
  mintedNFT?: {
    name: string
    mintAddress: string
    imageUri?: string
    explorerUrl: string
  }
}

export function useNFTMintProgress() {
  const [state, setState] = useState<MintProgressState>({
    isOpen: false,
    steps: [...DEFAULT_MINT_STEPS],
    currentStep: -1,
    overallProgress: 0,
    isCompleted: false
  })

  const startMinting = useCallback(() => {
    setState({
      isOpen: true,
      steps: [...DEFAULT_MINT_STEPS],
      currentStep: -1,
      overallProgress: 0,
      isCompleted: false,
      error: undefined,
      mintedNFT: undefined
    })
  }, [])

  const updateStep = useCallback((stepId: string, status: MintStep['status'], progress?: number) => {
    setState(prev => {
      const newSteps = prev.steps.map(step => 
        step.id === stepId 
          ? { ...step, status, progress }
          : step
      )

      const currentStepIndex = newSteps.findIndex(step => step.status === 'active')
      const completedSteps = newSteps.filter(step => step.status === 'completed').length
      const overallProgress = (completedSteps / newSteps.length) * 100

      return {
        ...prev,
        steps: newSteps,
        currentStep: currentStepIndex,
        overallProgress
      }
    })
  }, [])

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
      isCompleted: false
    }))
  }, [])

  const setSuccess = useCallback((mintedNFT: MintProgressState['mintedNFT']) => {
    setState(prev => ({
      ...prev,
      isCompleted: true,
      overallProgress: 100,
      mintedNFT,
      error: undefined
    }))
  }, [])

  const reset = useCallback(() => {
    setState({
      isOpen: false,
      steps: [...DEFAULT_MINT_STEPS],
      currentStep: -1,
      overallProgress: 0,
      isCompleted: false,
      error: undefined,
      mintedNFT: undefined
    })
  }, [])

  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false
    }))
  }, [])

  return {
    ...state,
    startMinting,
    updateStep,
    setError,
    setSuccess,
    reset,
    close
  }
}
