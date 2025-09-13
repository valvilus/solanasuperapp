'use client'

import { useState, useCallback, useEffect } from 'react'
import { useOptimizedNFT } from './useOptimizedNFT'
import { useAuth } from '@/contexts/AuthContext'
import type { NftItem, EnhancedPortfolioSummary } from '@/features/nft/types'

interface NFTDataState {
  myNfts: NftItem[]
  marketplaceNfts: NftItem[]
  portfolioSummary: EnhancedPortfolioSummary | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

const initialState: NFTDataState = {
  myNfts: [],
  marketplaceNfts: [],
  portfolioSummary: null,
  isLoading: false,
  error: null,
  lastUpdated: null
}

/**
 * Централизованный хук для управления данными NFT
 * Использует оптимизированную авторизацию и кеширование
 */
export function useNFTData() {
  const [state, setState] = useState<NFTDataState>(initialState)
  const { isAuthenticated } = useAuth()
  const { getUserNfts, getPortfolioSummary, getMarketplaceNfts } = useOptimizedNFT()

  // Загружает все данные NFT
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, myNfts: [], portfolioSummary: null }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const [userNfts, portfolio, marketplace] = await Promise.all([
        getUserNfts(),
        getPortfolioSummary(),
        getMarketplaceNfts()
      ])

      setState(prev => ({
        ...prev,
        myNfts: userNfts,
        portfolioSummary: portfolio,
        marketplaceNfts: marketplace,
        isLoading: false,
        lastUpdated: new Date()
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки данных NFT'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
      throw error
    }
  }, [isAuthenticated, getUserNfts, getPortfolioSummary, getMarketplaceNfts])

  // Загружает только пользовательские NFT
  const loadUserNfts = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const [userNfts, portfolio] = await Promise.all([
        getUserNfts(),
        getPortfolioSummary()
      ])

      setState(prev => ({
        ...prev,
        myNfts: userNfts,
        portfolioSummary: portfolio,
        lastUpdated: new Date()
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки NFT'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [isAuthenticated, getUserNfts, getPortfolioSummary])

  // Загружает только маркетплейс
  const loadMarketplace = useCallback(async () => {
    try {
      const marketplace = await getMarketplaceNfts()
      setState(prev => ({
        ...prev,
        marketplaceNfts: marketplace,
        lastUpdated: new Date()
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки маркетплейса'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [getMarketplaceNfts])

  // Очищает ошибки
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Обновляет конкретный NFT в состоянии
  const updateNft = useCallback((updatedNft: NftItem) => {
    setState(prev => ({
      ...prev,
      myNfts: prev.myNfts.map(nft => 
        nft.id === updatedNft.id ? updatedNft : nft
      ),
      marketplaceNfts: prev.marketplaceNfts.map(nft => 
        nft.id === updatedNft.id ? updatedNft : nft
      )
    }))
  }, [])

  // Добавляет новый NFT
  const addNft = useCallback((newNft: NftItem) => {
    setState(prev => ({
      ...prev,
      myNfts: [newNft, ...prev.myNfts]
    }))
  }, [])

  // Удаляет NFT (после продажи/перевода)
  const removeNft = useCallback((nftId: string) => {
    setState(prev => ({
      ...prev,
      myNfts: prev.myNfts.filter(nft => nft.id !== nftId),
      marketplaceNfts: prev.marketplaceNfts.filter(nft => nft.id !== nftId)
    }))
  }, [])

  // Автоматическая загрузка при авторизации
  useEffect(() => {
    if (isAuthenticated && state.myNfts.length === 0 && !state.isLoading) {
      loadAllData().catch(console.error)
    }
  }, [isAuthenticated, state.myNfts.length, state.isLoading, loadAllData])

  return {
    // Состояние
    ...state,
    
    // Методы загрузки
    loadAllData,
    loadUserNfts,
    loadMarketplace,
    
    // Методы управления состоянием
    updateNft,
    addNft,
    removeNft,
    clearError,
    
    // Вычисляемые значения
    totalNfts: state.myNfts.length,
    hasNfts: state.myNfts.length > 0,
    totalMarketplace: state.marketplaceNfts.length,
    isDataStale: state.lastUpdated ? (Date.now() - state.lastUpdated.getTime()) > 5 * 60 * 1000 : true // 5 минут
  }
}

/**
 * Упрощенная версия хука для компонентов, которым нужны только основные данные
 */
export function useNFTBasicData() {
  const { myNfts, portfolioSummary, isLoading, error, loadUserNfts } = useNFTData()
  
  return {
    nfts: myNfts,
    portfolio: portfolioSummary,
    isLoading,
    error,
    refresh: loadUserNfts
  }
}
