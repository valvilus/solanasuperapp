'use client'

import { useCallback } from 'react'
import { MyNFT, MarketplaceNFT, TabType } from '../types'
import { NFTService } from '../services/nft.service'
import { RealNFTService } from '../services/real-nft.service'
import { notificationService } from '../services/notification.service'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { useAuth } from '@/contexts/AuthContext'

export function useNFTActions(
  setActiveTab: (tab: TabType) => void,
  setSelectedNFT: (nft: MyNFT | MarketplaceNFT | null) => void,
  setIsLoading: (loading: boolean) => void
) {
  const { user } = useAuth()
  
  const handleQuickAction = useCallback((actionId: string) => {
    hapticFeedback.impact('medium')
    
    switch(actionId) {
      case 'create':
        setActiveTab('CREATE')
        notificationService.info('Переход в раздел создания NFT')
        break
      case 'marketplace':
        setActiveTab('MARKETPLACE')
        notificationService.info('Загрузка маркетплейса NFT...')
        break
      case 'collections':
        setActiveTab('COLLECTIONS')
        notificationService.info('Просмотр коллекций NFT')
        break
      case 'scan':
        notificationService.info('Сканер QR кодов: демо режим')
        // Симуляция QR сканера
        setTimeout(async () => {
          try {
            const result = await NFTService.scanQR('')
            notificationService.success('Успешно' as any)
          } catch (error) {
            notificationService.error('Ошибка сканирования QR кода')
          }
        }, 1500)
        break
      case 'settings':
        notificationService.info('Настройки NFT')
        break
      default:
        console.log(`Action: ${actionId}`)
    }
  }, [setActiveTab])

  const handleNFTClick = useCallback((nft: MyNFT | MarketplaceNFT) => {
    hapticFeedback.impact('light')
    setSelectedNFT(nft)
  }, [setSelectedNFT])

  const handleBuyNFT = useCallback(async (nftId: string) => {
    hapticFeedback.impact('medium')
    notificationService.info('Покупка NFT...')
    
    try {
      await RealNFTService.buyNFT(nftId, 1000 as any) // maxPrice as placeholder
      notificationService.success('NFT успешно куплен!' as any)
      
      // Обновляем состояние после покупки
      window.location.reload() // Простое обновление, можно улучшить
    } catch (error) {
      console.error(' Buy NFT failed:', error)
      notificationService.error(error instanceof Error ? error.message : 'Ошибка при покупке NFT')
    }
  }, [])

  const handleUseNFT = useCallback(async (nft: MyNFT) => {
    hapticFeedback.impact('medium')
    
    try {
      if (nft.type === 'TICKET' || nft.type === 'COUPON') {
        notificationService.info(`Активация ${nft.type === 'TICKET' ? 'билета' : 'купона'}...`)
        await NFTService.useNFT(nft.id, user?.id || '')
        notificationService.success(`${nft.type === 'TICKET' ? 'Билет' : 'Купон'} активирован!` as any)
        setSelectedNFT(null)
      }
    } catch (error) {
      notificationService.error('Ошибка при использовании NFT')
    }
  }, [setSelectedNFT])

  const handleCreateNFT = useCallback(async (type: string) => {
    hapticFeedback.impact('medium')
    notificationService.info(`Создание NFT ${type}...`)
    
    try {
      await NFTService.createNFT(type)
      notificationService.success(`NFT ${type} создан!`)
        setActiveTab('MY_NFTS' as any)
      
      // Обновляем данные после создания
      window.location.reload() // Простое обновление, можно улучшить
    } catch (error) {
      console.error(' Create NFT failed:', error)
      notificationService.error(error instanceof Error ? error.message : 'Ошибка при создании NFT')
    }
  }, [setActiveTab])

  return {
    handleQuickAction,
    handleNFTClick,
    handleBuyNFT,
    handleUseNFT,
    handleCreateNFT
  }
}
