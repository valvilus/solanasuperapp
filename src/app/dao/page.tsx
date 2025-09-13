'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PageLayout } from '@/components/layout/PageLayout'
import { Scene3DBackground } from '@/components/3d/WalletCard3D'
import ClientOnly from '@/components/common/ClientOnly'
import { useBottomNavigation } from '@/components/navigation/BottomTabBar'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
// DAO Components
import {
  DAOHeader,
  ProposalCard,
  DAOTabs,
  DAOStatsSection,
  QuickActionsDAO,
  NotificationToastDAO,
  CreateProposalModalMinimal as CreateProposalModal,
  VoteModalMinimal as VoteModal,
  ProposalDetailsModal,
  TreasurySection,
  MembersSection,
  AnalyticsSection,
  MainDAOPageSkeleton
} from '@/components/dao'

// Business Logic & Data
import {
  useDAOState,
  useDAOFiltering,
  useDAOActions
} from '@/features/dao'

// Import useDAO hook that follows working module patterns
import { useDAO } from '@/hooks/useDAO'
import { useWallet } from '@/hooks/useWallet'

export default function DAOPage() {
  const { navigateTo } = useBottomNavigation()
  
  // ИСПРАВЛЕНО: Добавляем обработку URL параметров
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)
  
  useEffect(() => {
    // Проверяем URL параметры при загрузке
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setSearchParams(params)
      
      // Если есть параметр tab, устанавливаем активную вкладку
      const tabParam = params.get('tab')
      if (tabParam === 'proposals') {
        setActiveTab('proposals')
      }
    }
  }, [])
  
  // Wallet connection check
  const { custodial, external } = useWallet()
  
  // Определяем есть ли активный кошелек для DAO
  const hasActiveWallet = (custodial.address && custodial.isActive) || (external.isConnected && external.address)
  
  // DAO Data Hook (following working module patterns)
  const {
    data,
    isLoading: isDAOLoading,
    error: daoError,
    refreshData,
    createProposal,
    vote,
    isCreatingProposal,
    isVoting
  } = useDAO()

  // State Management
  const {
    state,
    setActiveTab,
    setSelectedProposal,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    openVoteModal,
    closeVoteModal,
    openProposalDetails,
    closeProposalDetails,
    setShowCreateModal,
    setShowVoteModal
    // setShowDetailsModal // removed - no longer exported
    // notification, // Not exported from useDAOState
    // setNotification
  } = useDAOState()

  // Optimized loading state - single source of truth
  const [filteredProposals, setFilteredProposals] = useState(data?.proposals || [])
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Data Processing - получаем правильные данные в зависимости от вкладки
  useEffect(() => {
    if (data?.proposals) {
      setFilteredProposals(data.proposals)
    }
  }, [data?.proposals])

  // Optimized filter proposals - no loading state, instant filtering
  useEffect(() => {
    if (data?.proposals) {
      const filtered = data.proposals.filter(proposal => {
        // Apply filters client-side instantly
        if (state.filterStatus !== 'all' && proposal.status !== state.filterStatus.toUpperCase()) return false
        if (state.filterType !== 'all' && proposal.type !== state.filterType.toUpperCase()) return false
        if (state.searchQuery && !proposal.title.toLowerCase().includes(state.searchQuery.toLowerCase())) return false
        return true
      })
      
      // Sort proposals
      const sorted = [...filtered].sort((a, b) => {
        const field = state.sortBy === 'created' ? 'createdAt' : state.sortBy
        const aVal = a[field as keyof typeof a]
        const bVal = b[field as keyof typeof b]
        
        if (state.sortOrder === 'desc') {
          return aVal < bVal ? 1 : -1
        } else {
          return aVal > bVal ? 1 : -1
        }
      })
      
      setFilteredProposals(sorted)
    }
  }, [state.filterStatus, state.filterType, state.searchQuery, state.sortBy, state.sortOrder, data?.proposals])

  // Actions
  const { 
    handleQuickAction, 
    handleVoteFor, 
    handleVoteAgainst,
    handleShareProposal,
    handleOpenDiscussion
  } = useDAOActions(
    setActiveTab,
    setSelectedProposal,
    () => {}, // setIsLoading - управляется через useDAO
    showSuccessNotification,
    showErrorNotification,
    openVoteModal
  )

  // Custom proposal click handler to open details modal
  const handleProposalClick = (proposal: any) => {
    openProposalDetails(proposal)
    hapticFeedback.impact('light')
  }

  // Handle proposal creation
  const handleCreateProposal = async (form: any) => {
    try {
      console.log(' handleCreateProposal called with:', form)
      console.log(' createProposal function:', typeof createProposal)
      
      // DAO смарт-контракт требует хотя бы один action
      // ProposalAction это union type с определенными вариантами
      const actions = form.actions && form.actions.length > 0 
        ? form.actions 
        : [{ 
            // Используем updateStakingApy как dummy action (безопасный, не меняет ничего критичного)
            updateStakingApy: {
              newApy: 850 // 8.5% APY - разумное значение для dummy
            }
          }]
      
      console.log(' DEBUG: Actions being sent:', JSON.stringify(actions, null, 2))
      await createProposal(form.title, form.description, actions)
      
      console.log(' Proposal created successfully, closing modal')
      setShowCreateModal(false)
      showSuccessNotification(`Предложение "${form.title}" успешно создано`)
    } catch (error: any) {
      console.error(' Error in handleCreateProposal:', error)
      showErrorNotification(error.message || 'Ошибка при создании предложения')
    }
  }

  // Handle voting
  const handleVote = async (proposalId: string, voteChoice: string, comment?: string) => {
    try {
      await vote(proposalId, voteChoice as 'For' | 'Against' | 'Abstain')
      closeVoteModal()
      showSuccessNotification('Ваш голос успешно учтен')
    } catch (error: any) {
      showErrorNotification(error.message || 'Ошибка при голосовании')
    }
  }

  // Enhanced quick action handler with modal integration
  const handleQuickActionEnhanced = async (actionId: string) => {
    try {
      switch (actionId) {
        case 'create-proposal':
          setShowCreateModal(true)
          hapticFeedback.impact('medium')
          break
        
        case 'treasury':
          setActiveTab('treasury')
          showSuccessNotification('Открыта казна DAO')
          break
        
        case 'members':
          setActiveTab('members')
          showSuccessNotification('Открыт список участников')
          break
        
        case 'analytics':
          setActiveTab('analytics' as any)
          showSuccessNotification('Открыта аналитика DAO')
          break
        
        default:
          await handleQuickAction(actionId)
      }
    } catch (error: any) {
      showErrorNotification(error.message || 'Произошла ошибка при выполнении действия')
    }
  }

  const LoadingFallback = () => <MainDAOPageSkeleton />

  const renderTabContent = () => {
    if (isDAOLoading || !data) {
      return null // Skeleton уже показывается на уровне всей страницы
    }

    if (daoError) {
      return (
        <div className="text-center p-8">
          <p className="text-red-400 mb-4">Ошибка загрузки данных DAO:</p>
          <p className="text-gray-400 mb-4">{daoError}</p>
          <button 
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Повторить
          </button>
        </div>
      )
    }

    switch (state.activeTab) {
      case 'proposals':
        return (
          <div className="space-y-4">
            {filteredProposals.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal as any}
                onVoteFor={(e) => {
                  e?.stopPropagation?.()
                  openVoteModal(proposal as any)
                }}
                onVoteAgainst={(e) => {
                  e?.stopPropagation?.()
                  openVoteModal(proposal as any)
                }}
                onVoteAbstain={(e) => {
                  e?.stopPropagation?.()
                  openVoteModal(proposal as any)
                }}
                onClick={() => handleProposalClick(proposal as any)}
                onShare={() => handleShareProposal(proposal as any)}
                onOpenDiscussion={() => handleOpenDiscussion(proposal as any)}
                isLoading={false}
              />
            ))}
            
            {filteredProposals.length === 0 && (
              <div className="text-center p-8 text-gray-400">
                <p className="mb-2">Предложения не найдены</p>
                <p className="text-sm">Попробуйте изменить фильтры или создать новое предложение</p>
              </div>
            )}
          </div>
        )

      case 'treasury':
        return (
            <TreasurySection
              treasuryAddress={data.treasury?.treasuryAddress || ''}
              totalValueUSD={data.treasury?.totalValueUSD || 0}
              monthlyIncome={data.treasury?.monthlyIncome || 0}
              monthlyExpenses={data.treasury?.monthlyExpenses || 0}
              growthRate={data.treasury?.growthRate || 0}
              assets={data.treasury?.assets || []}
              recentTransactions={data.treasury?.recentTransactions || []}
            />
        )

      case 'members':
        return (
          <MembersSection
            members={data.members.members}
            totalCount={data.members.totalCount}
            hasMore={data.members.hasMore}
            stats={data.members.stats}
          />
        )

      case 'analytics':
        return (
          <AnalyticsSection
            isLoading={isDAOLoading}
          />
        )

      case 'history':
        const completedProposals = filteredProposals.filter(p => 
          ['executed', 'rejected', 'passed'].includes(p.status)
        )
        
        return (
          <div className="space-y-4">
            {completedProposals.map(proposal => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal as any}
                onVoteFor={() => {}}
                onVoteAgainst={() => {}}
                onVoteAbstain={() => {}}
                onClick={() => handleProposalClick(proposal as any)}
                onShare={() => handleShareProposal(proposal as any)}
                onOpenDiscussion={() => handleOpenDiscussion(proposal as any)}
                showHistoryMode
              />
            ))}
            
            {completedProposals.length === 0 && (
              <div className="text-center p-8 text-gray-400">
                <p>История предложений пуста</p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Show skeleton while loading
  if (isDAOLoading || !data) {
    return (
      <ClientOnly fallback={<LoadingFallback />}>
        <LoadingFallback />
      </ClientOnly>
    )
  }

  return (
    <ClientOnly fallback={<LoadingFallback />}>
      <PageLayout className="pb-20">
        <Scene3DBackground />
        
        <div className="relative z-10 min-h-screen">
          {/* Wallet Status Info */}
          {!hasActiveWallet && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <h3 className="text-blue-400 font-semibold">Нужны TNG токены для участия</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Для создания предложений и голосования нужны TNG токены в вашем кошельке. 
                Получите TNG через Swap или Staking.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateTo('/defi/swap')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                >
                  Получить TNG
                </button>
                <button
                  onClick={() => navigateTo('/defi/staking')}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200"
                >
                  Стейкинг
                </button>
              </div>
            </div>
          )}

          {/* Active Wallet Info */}
          {hasActiveWallet && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <h3 className="text-green-400 font-semibold">
                  {custodial.address && custodial.isActive ? 'Custodial кошелек активен' : 'Внешний кошелек подключен'}
                </h3>
              </div>
              <p className="text-gray-300 text-sm">
                Вы можете создавать предложения и голосовать в DAO используя ваши TNG токены.
              </p>
            </div>
          )}

          {/* Header */}
          <DAOHeader 
            title="DAO Голосования"
            subtitle="Управление сообществом"
            activeProposalsCount={data?.stats.overview.activeProposals || 0}
            totalMembers={data?.stats.overview.totalMembers || 0}
          />

          {/* Stats */}
          {data?.stats?.overview && (
            <DAOStatsSection 
              stats={data.stats.overview}
            />
          )}

          {/* Quick Actions */}
          <QuickActionsDAO onAction={handleQuickActionEnhanced} />

          {/* Tabs */}
          <DAOTabs 
            activeTab={state.activeTab} 
            onChange={setActiveTab} 
          />

          {/* Content */}
          <div className="px-4 pb-8">
            {renderTabContent()}
          </div>

          {/* Modals */}
          <AnimatePresence>
            {state.showCreateModal && (
              <CreateProposalModal
                isOpen={state.showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateProposal}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {state.showVoteModal && state.selectedProposal && (
              <VoteModal
                proposal={state.selectedProposal}
                isOpen={state.showVoteModal}
                onClose={closeVoteModal}
                onVoteSuccess={refreshData}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {state.showDetailsModal && state.selectedProposal && (
              <ProposalDetailsModal
                proposal={state.selectedProposal}
                isOpen={state.showDetailsModal}
                onClose={closeProposalDetails}
                onVote={() => {
                  closeProposalDetails()
                  openVoteModal(state.selectedProposal!)
                }}
                onShare={() => handleShareProposal(state.selectedProposal!)}
              />
            )}
          </AnimatePresence>

          {/* Notifications - Disabled until notification state is available */}
          {/* <AnimatePresence>
            {notification && (
              <NotificationToastDAO
                notification={notification}
                onClose={() => setNotification(null)}
              />
            )}
          </AnimatePresence> */}
        </div>
      </PageLayout>
    </ClientOnly>
  )
}