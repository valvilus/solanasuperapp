'use client'

import { useCallback } from 'react'
import { MyNFT } from '../types'
import { LOAD_MORE_COUNT } from '../data'

export function useNFTPagination(
  filteredNFTs: MyNFT[],
  displayedNFTs: number,
  hasMoreNFTs: boolean,
  isLoadingMore: boolean,
  setDisplayedNFTs: (count: number) => void,
  setHasMoreNFTs: (hasMore: boolean) => void,
  setIsLoadingMore: (loading: boolean) => void,
  onLoadComplete?: () => void
) {
  const loadMoreNFTs = useCallback(async () => {
    if (isLoadingMore || !hasMoreNFTs) return
    
    setIsLoadingMore(true)
    
    try {
      // Симуляция загрузки с сервера
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const totalAvailable = filteredNFTs.length
      const newDisplayCount = Math.min(displayedNFTs + LOAD_MORE_COUNT, totalAvailable)
      
      setDisplayedNFTs(newDisplayCount)
      
      // Проверяем есть ли еще NFT для загрузки
      if (newDisplayCount >= totalAvailable) {
        setHasMoreNFTs(false)
      }

      onLoadComplete?.()
    } catch (error) {
      console.error('Error loading more NFTs:', error)
      throw error
    } finally {
      setIsLoadingMore(false)
    }
  }, [
    isLoadingMore,
    hasMoreNFTs,
    filteredNFTs.length,
    displayedNFTs,
    setDisplayedNFTs,
    setHasMoreNFTs,
    setIsLoadingMore,
    onLoadComplete
  ])

  const canLoadMore = hasMoreNFTs && displayedNFTs < filteredNFTs.length
  const endOfResults = !hasMoreNFTs && displayedNFTs >= filteredNFTs.length

  return {
    loadMoreNFTs,
    canLoadMore,
    endOfResults
  }
}
