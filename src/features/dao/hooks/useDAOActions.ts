'use client'

import { DAOTabType, Proposal, VoteType, CreateProposalForm } from '../types/dao.types'
import { DAOService } from '../services/dao.service'

export function useDAOActions(
  setActiveTab: (tab: DAOTabType) => void,
  setSelectedProposal: (proposal: Proposal | null) => void,
  setIsLoading: (loading: boolean) => void,
  showSuccessNotification: (message: string) => void,
  showErrorNotification: (message: string) => void,
  openVoteModal: (proposal: Proposal) => void
) {

  // Навигация по табам
  const handleTabChange = (tab: DAOTabType) => {
    setActiveTab(tab)
  }

  // Быстрые действия
  const handleQuickAction = async (actionId: string) => {
    try {
      switch (actionId) {
        case 'create-proposal':
          // Переключиться на создание предложения или открыть модал
          showSuccessNotification('Функция создания предложения будет доступна скоро')
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
          // Открыть аналитику или перейти к соответствующему разделу
          showSuccessNotification('Аналитика DAO')
          break
        
        default:
          console.log(`Unknown action: ${actionId}`)
      }
    } catch (error) {
      console.error('Quick action error:', error)
      showErrorNotification('Произошла ошибка при выполнении действия')
    }
  }

  // Клик по предложению
  const handleProposalClick = (proposal: Proposal) => {
    setSelectedProposal(proposal)
  }

  // Голосование за предложение
  const handleVoteFor = async (proposal: Proposal) => {
    openVoteModal(proposal)
  }

  // Голосование против предложения
  const handleVoteAgainst = async (proposal: Proposal) => {
    openVoteModal(proposal)
  }

  // Воздержаться от голосования
  const handleVoteAbstain = async (proposal: Proposal) => {
    openVoteModal(proposal)
  }

  // Создание предложения
  const handleCreateProposal = async (form: CreateProposalForm) => {
    setIsLoading(true)
    try {
      await DAOService.createProposal(fetch, form)
      showSuccessNotification(`Предложение "${form.title}" успешно создано`)
      setActiveTab('proposals') // Вернуться к списку предложений
    } catch (error) {
      console.error('Create proposal error:', error)
      showErrorNotification('Ошибка при создании предложения. Попробуйте еще раз.')
    } finally {
      setIsLoading(false)
    }
  }

  // Делегирование голосов
  const handleDelegateVotes = async (delegateTo: string, amount: number) => {
    setIsLoading(true)
    try {
      await DAOService.delegateVotes(delegateTo, amount)
      showSuccessNotification(`Делегировано ${amount} TNG пользователю ${delegateTo}`)
    } catch (error) {
      console.error('Delegate error:', error)
      showErrorNotification('Ошибка при делегировании. Попробуйте еще раз.')
    } finally {
      setIsLoading(false)
    }
  }

  // Подача предложения в казну
  const handleTreasuryAction = async (action: string, amount: number, target: string) => {
    setIsLoading(true)
    try {
      await DAOService.executeTreasuryAction(action, amount, target)
      showSuccessNotification(`Операция с казной выполнена: ${action}`)
    } catch (error) {
      console.error('Treasury action error:', error)
      showErrorNotification('Ошибка при выполнении операции с казной')
    } finally {
      setIsLoading(false)
    }
  }

  // Открытие модала голосования
  const handleOpenVoteModal = (proposal: Proposal) => {
    openVoteModal(proposal)
  }

  // Поделиться предложением
  const handleShareProposal = (proposal: Proposal) => {
    if (navigator.share) {
      navigator.share({
        title: proposal.title,
        text: proposal.description,
        url: window.location.href + `?proposal=${proposal.id}`
      })
    } else {
      // Fallback: копировать ссылку
      navigator.clipboard.writeText(window.location.href + `?proposal=${proposal.id}`)
      showSuccessNotification('Ссылка на предложение скопирована')
    }
  }

  // Открытие дискуссии
  const handleOpenDiscussion = (proposal: Proposal) => {
    if (proposal.discussionUrl) {
      window.open(proposal.discussionUrl, '_blank')
    } else {
      showErrorNotification('Ссылка на дискуссию недоступна')
    }
  }

  return {
    handleTabChange,
    handleQuickAction,
    handleProposalClick,
    handleVoteFor,
    handleVoteAgainst,
    handleVoteAbstain,
    handleCreateProposal,
    handleDelegateVotes,
    handleTreasuryAction,
    handleOpenVoteModal,
    handleShareProposal,
    handleOpenDiscussion
  }
}

