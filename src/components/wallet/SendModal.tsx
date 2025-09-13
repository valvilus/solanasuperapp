/**
 * Send Modal Component - Transfer SOL/TNG to addresses or Telegram users
 * Solana SuperApp - Wallet Page
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'
import { useLedgerOperations } from '@/hooks/useLedgerOperations'
import { useOnchainOperations } from '@/hooks/useOnchainOperations'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Send, 
  User, 
  Wallet,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  QrCode,
  Search
} from 'lucide-react'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'
import { QRScanner } from '@/components/wallet/QRScanner'
import { TokenLogo } from '@/components/wallet/TokenLogos'
import { formatTokenBalance } from '@/lib/formatters'
import { TransferSuccessAnimation } from '@/components/wallet/TransferSuccessAnimation'

interface SendModalProps {
  isOpen: boolean
  onClose: () => void
  onRefreshBalances?: () => Promise<void>
  prefillData?: {
    address?: string
    amount?: string
    token?: 'SOL' | 'TNG'
  }
}

interface UserSearchResult {
  id: string
  username: string
  firstName: string
  lastName?: string
  photoUrl?: string
  isPremium: boolean
  walletAddress?: string
  isRegistered: boolean
  registeredAt?: string
}

export function SendModal({ isOpen, onClose, onRefreshBalances, prefillData }: SendModalProps) {
  const { activeWallet } = useWallet()
  const { getSOLBalance } = useLedgerOperations()
  const { getTNGBalance: getOnchainTNGBalance, transferSOLOnchain, transferTNGOnchain } = useOnchainOperations()
  const { apiCall } = useCompatibleAuth()
  
  // Form state
  const [selectedToken, setSelectedToken] = useState<'SOL' | 'TNG'>('SOL')
  const [amount, setAmount] = useState('')
  const [recipientType, setRecipientType] = useState<'address' | 'username'>('address')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [memo, setMemo] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [balances, setBalances] = useState({ sol: 0, tng: 0 })
  const [showQRScanner, setShowQRScanner] = useState(false)

  // Load balances on mount
  React.useEffect(() => {
    const loadBalances = async () => {
      try {
        const [sol, tng] = await Promise.all([
          getSOLBalance(),
          getOnchainTNGBalance()
        ])
        setBalances({ sol, tng })
      } catch (error) {
        console.error('Error loading balances:', error)
      }
    }

    if (isOpen) {
      loadBalances()
    }
  }, [isOpen]) // Убрали функции из зависимостей

  // Prefill data from QR scan and clear when modal closes
  React.useEffect(() => {
    if (isOpen && prefillData) {
      if (prefillData.address) {
        setRecipientAddress(prefillData.address)
        setRecipientType('address')
      }
      if (prefillData.amount) {
        setAmount(prefillData.amount)
      }
      if (prefillData.token) {
        setSelectedToken(prefillData.token)
      }
    } else if (!isOpen) {
      // Очищаем поля при закрытии модала
      setRecipientAddress('')
      setAmount('')
      setSelectedToken('SOL')
      setRecipientType('address')
      setSelectedUser(null)
      setSearchQuery('')
      setMemo('')
      setError(null)
    }
  }, [isOpen, prefillData])

  // Search users with debounce and robust error handling
  React.useEffect(() => {
    const cleanQuery = searchQuery.trim().replace(/^@+/, '')
    
    if (recipientType !== 'username' || !cleanQuery || cleanQuery.length < 2) {
      setSearchResults([])
      return
    }

    const searchUsers = async () => {
      setIsSearching(true)
      setError(null) // Clear any previous errors
      
      try {
        console.log(' Searching for users:', cleanQuery)
        console.log(' Using apiCall method from unified AuthContext')
        const response = await apiCall(`/api/users/search?q=${encodeURIComponent(cleanQuery)}`)
        
        console.log(' Search response status:', response.status)
        console.log(' Search response headers:', Object.fromEntries(response.headers.entries()))
        
        if (response.ok) {
          // Check if response is actually JSON
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            console.error(' Response is not JSON, content-type:', contentType)
            setError('Сервер вернул некорректный ответ')
            setSearchResults([])
            return
          }

          try {
            const data = await response.json()
            console.log(' Search results:', data)
            
            if (data.success) {
              setSearchResults(data.users || [])
            } else {
              console.error(' Search API returned success=false:', data.error)
              setError(data.error || 'Ошибка поиска пользователей')
              setSearchResults([])
            }
          } catch (jsonError) {
            console.error(' Failed to parse JSON response:', jsonError)
            // Try to read response as text for debugging
            try {
              const responseText = await response.text()
              console.error(' Response text:', responseText.substring(0, 200))
              setError('Сервер вернул некорректные данные')
            } catch (textError) {
              console.error(' Could not read response as text:', textError)
              setError('Ошибка связи с сервером')
            }
            setSearchResults([])
          }
        } else if (response.status === 401) {
          console.error(' Authentication failed (401) - token may be expired')
          setError('Ошибка авторизации. Попробуйте перезайти в приложение.')
          setSearchResults([])
        } else if (response.status === 403) {
          console.error(' Access forbidden (403) - insufficient permissions')
          setError('Недостаточно прав для поиска пользователей')
          setSearchResults([])
        } else {
          console.error(' User search failed with status:', response.status)
          // Try to get error message from response
          try {
            const errorData = await response.json()
            setError(errorData.error || `Ошибка поиска (${response.status})`)
          } catch {
            setError(`Ошибка сервера (${response.status})`)
          }
          setSearchResults([])
        }
      } catch (error) {
        console.error(' Network error during user search:', error)
        if (error instanceof TypeError && error.message.includes('fetch')) {
          setError('Ошибка соединения с сервером')
        } else {
          setError('Произошла ошибка при поиске пользователей')
        }
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, recipientType, apiCall])

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setAmount('')
      setRecipientAddress('')
      setSelectedUser(null)
      setSearchQuery('')
      setSearchResults([])
      setMemo('')
      setIsAnonymous(false)
      setError(null)
      setSuccess(false)
      setShowConfirmation(false)
      setIsLoading(false)
    }
  }, [isOpen])

  const handleClose = () => {
    hapticFeedback.impact('light')
    onClose()
  }

  const handleConfirmationComplete = () => {
    setShowConfirmation(false)
    onClose()
  }

  const handleConfirmationCancel = () => {
    setShowConfirmation(false)
  }

  // Helper to get recipient display name
  const getRecipientDisplayName = () => {
    if (selectedUser) {
      return selectedUser.username
    }
    if (recipientAddress) {
      // Сокращаем длинный адрес для отображения
      return `${recipientAddress.slice(0, 4)}...${recipientAddress.slice(-4)}`
    }
    return 'Получатель'
  }

  const handleTokenSelect = (token: 'SOL' | 'TNG') => {
    hapticFeedback.selection()
    setSelectedToken(token)
    setAmount('') // Clear amount when switching tokens
  }

  const handleRecipientTypeChange = (type: 'address' | 'username') => {
    hapticFeedback.selection()
    setRecipientType(type)
    setRecipientAddress('')
    setSelectedUser(null)
    setSearchQuery('')
    setSearchResults([])
    setError(null) // Clear any search-related errors
  }

  const handleUserSelect = (user: UserSearchResult) => {
    hapticFeedback.impact('light')
    setSelectedUser(user)
    setSearchQuery(user.username)
    setSearchResults([]) // Hide results after selection
  }

  const handleQRScan = (address: string) => {
    hapticFeedback.impact('light')
    setRecipientAddress(address)
    setShowQRScanner(false)
    setError(null) // Clear any existing errors
    console.log(' QR address scanned:', address)
  }

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Введите корректную сумму')
      return false
    }

    const balance = selectedToken === 'SOL' ? balances.sol : balances.tng
    if (parseFloat(amount) > balance) {
      setError('Недостаточно средств')
      return false
    }

    // Специальная проверка для TNG on-chain переводов
    if (selectedToken === 'TNG' && balance <= 0) {
      setError('У вас нет TNG токенов. Получите их через Фосет сначала.')
      return false
    }

    if (recipientType === 'address' && !recipientAddress.trim()) {
      setError('Введите адрес получателя')
      return false
    }

    if (recipientType === 'username' && !selectedUser) {
      setError('Выберите получателя')
      return false
    }

    return true
  }

  const handleSend = () => {
    if (!validateForm()) return
    
    // Показываем страницу подтверждения вместо прямой отправки
    setShowConfirmation(true)
    hapticFeedback.impact('medium')
  }

  // Функция фактической отправки on-chain (вызывается из страницы подтверждения)
  const handleConfirmTransfer = async () => {
    try {
      console.log(' Starting on-chain transfer...', {
        recipientType,
        selectedUser,
        recipientAddress,
        selectedToken,
        amount
      })

      let targetAddress = ''
      
      if (recipientType === 'username' && selectedUser) {
        if (!selectedUser.isRegistered) {
          // Создаем отложенный перевод для незарегистрированных пользователей
          console.log(' Creating pending transfer for unregistered user')
          
          const response = await apiCall('/api/transfers/pending', {
            method: 'POST',
            body: JSON.stringify({
              recipientUsername: selectedUser.username,
              token: selectedToken,
              amount: parseFloat(amount),
              memo: memo || undefined,
              isAnonymous: isAnonymous
            })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Ошибка создания отложенного перевода')
          }

          const data = await response.json()
          
          if (data.success) {
            hapticFeedback.notification('success')
            console.log(' Pending transfer created:', data.transfer)
            return
          } else {
            throw new Error(data.message || 'Неизвестная ошибка')
          }
        } else {
          // Для зарегистрированных пользователей используем их wallet address
          if (!selectedUser.walletAddress) {
            throw new Error('У пользователя нет кошелька')
          }
          targetAddress = selectedUser.walletAddress
        }
      } else {
        // Прямой перевод по адресу
        targetAddress = recipientAddress
      }

      // Выполняем on-chain перевод
      console.log(' Executing on-chain transfer to:', targetAddress)
      
      let result
      if (selectedToken === 'SOL') {
        result = await transferSOLOnchain(
          targetAddress,
          parseFloat(amount),
          memo || 'Перевод SOL через SuperApp',
          'medium' // priority
        )
      } else {
        result = await transferTNGOnchain(
          targetAddress,
          parseFloat(amount),
          memo || 'Перевод TNG через SuperApp',
          'medium' // priority
        )
      }

      console.log(' On-chain transfer completed:', result)
      hapticFeedback.notification('success')

      // Возвращаем результат с информацией о транзакции
      return {
        success: true,
        signature: result.signature,
        explorerUrl: result.explorerUrl
      }

    } catch (error) {
      console.error(' On-chain transfer failed:', error)
      hapticFeedback.notification('error')
      throw error // Пробрасываем ошибку в компонент подтверждения
    }
  }

  // Helper to get user avatar
  const getUserAvatar = (user: UserSearchResult) => {
    if (user.photoUrl) return user.photoUrl
    return null
  }



  const maxAmount = selectedToken === 'SOL' ? balances.sol : balances.tng

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={handleClose}
        >
          {/* Safe Area Container with proper padding */}
          <div className="w-full h-full max-w-lg flex flex-col justify-center p-4 pb-safe">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-h-[calc(100vh-8rem)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            <SimpleCard className="flex-1 overflow-y-auto p-6 border border-white/10 bg-black/90 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Отправить</h2>
                  <p className="text-sm text-gray-400">Перевод криптовалюты</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-6">
                {/* Всегда показываем форму, пока не откроется подтверждение */}
                {/* Token Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Выберите токен
                    </label>
                    <div className="flex gap-2">
                      {(['SOL', 'TNG'] as const).map((token) => (
                        <motion.button
                          key={token}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleTokenSelect(token)}
                          className={`flex-1 p-3 rounded-lg border transition-all ${
                            selectedToken === token
                              ? 'border-solana-purple bg-solana-purple/20 text-white'
                              : 'border-white/10 hover:border-white/20 text-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <TokenLogo 
                              token={token} 
                              size="sm" 
                              className={token === 'SOL' ? 'text-[#00FFA3]' : 'text-solana-green'}
                            />
                            <span className="font-medium">{token}</span>
                          </div>
                          <p className="text-xs mt-1">
                            {formatTokenBalance(token === 'SOL' ? balances.sol : balances.tng, token, 'visual')} доступно
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Сумма
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`0.00 ${selectedToken}`}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setAmount(maxAmount.toString())}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-solana-purple hover:text-solana-green"
                      >
                        МАКС
                      </motion.button>
                    </div>
                  </div>

                  {/* Recipient Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Получатель
                    </label>
                    <div className="flex gap-2 mb-4">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRecipientTypeChange('address')}
                        className={`flex-1 p-3 rounded-lg border transition-all ${
                          recipientType === 'address'
                            ? 'border-solana-green bg-solana-green/20 text-white'
                            : 'border-white/10 hover:border-white/20 text-gray-400'
                        }`}
                      >
                        <Wallet className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-sm">Адрес</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRecipientTypeChange('username')}
                        className={`flex-1 p-3 rounded-lg border transition-all ${
                          recipientType === 'username'
                            ? 'border-solana-green bg-solana-green/20 text-white'
                            : 'border-white/10 hover:border-white/20 text-gray-400'
                        }`}
                      >
                        <User className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-sm">@Username</span>
                      </motion.button>
                    </div>

                    {recipientType === 'address' ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                          placeholder="Введите адрес Solana..."
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-green font-mono text-sm"
                        />
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowQRScanner(true)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/10 hover:bg-white/20"
                          title="Сканировать QR код"
                        >
                          <QrCode className="w-4 h-4 text-gray-400" />
                        </motion.button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск по username..."
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-green"
                          />
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {isSearching ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                              <span className="text-gray-400 text-sm">Поиск...</span>
                            </div>
                          ) : searchResults.length > 0 ? (
                            searchResults.map((user) => (
                              <motion.button
                                key={user.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleUserSelect(user)}
                                className={`w-full p-3 rounded-lg border text-left transition-all ${
                                  selectedUser?.id === user.id
                                    ? 'border-solana-green bg-solana-green/20'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    {getUserAvatar(user) ? (
                                      <img 
                                        src={getUserAvatar(user)!} 
                                        alt={user.firstName}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solana-purple/30 to-solana-green/30 flex items-center justify-center">
                                        <User className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                    {user.isPremium && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                                        <span className="text-xs"></span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-white text-sm">@{user.username}</p>
                                      {!user.isRegistered && (
                                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs px-1 py-0">
                                          Не зарегистрирован
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-gray-400 text-xs">
                                      {user.firstName} {user.lastName}
                                    </p>
                                    {!user.isRegistered && (
                                      <p className="text-orange-400 text-xs mt-1">
                                        Перевод будет выполнен при регистрации
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </motion.button>
                            ))
                          ) : searchQuery.trim().replace(/^@+/, '').length >= 2 ? (
                            <div className="text-center py-4 text-gray-400 text-sm">
                              Пользователи не найдены
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Anonymous Transfer Checkbox */}
                  <div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setIsAnonymous(!isAnonymous)
                        hapticFeedback.selection()
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isAnonymous 
                          ? 'bg-solana-purple border-solana-purple' 
                          : 'border-white/30'
                      }`}>
                        {isAnonymous && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 bg-white rounded-sm"
                          />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white text-sm font-medium">Отправить анонимно</p>
                        <p className="text-gray-400 text-xs">
                          В истории транзакций будет показано "Неизвестно"
                        </p>
                      </div>
                    </motion.button>
                  </div>

                  {/* Memo (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Комментарий (необязательно)
                    </label>
                    <input
                      type="text"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="Добавить комментарий..."
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </motion.div>
                  )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <SimpleButton
                    onClick={handleClose}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Отмена
                  </SimpleButton>
                  <SimpleButton
                    onClick={handleSend}
                    className="flex-1"
                    disabled={isLoading}
                    gradient={true}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Отправить
                  </SimpleButton>
                </div>
              </div>
            </SimpleCard>
            </motion.div>

            {/* QR Scanner Modal */}
            <QRScanner
              isOpen={showQRScanner}
              onClose={() => setShowQRScanner(false)}
              onScan={handleQRScan}
            />
          </div>

          {/* Enhanced Transfer Confirmation Page - Always properly positioned */}
          <TransferSuccessAnimation
            isVisible={showConfirmation}
            onComplete={handleConfirmationComplete}
            onCancel={handleConfirmationCancel}
            amount={amount}
            token={selectedToken}
            recipient={getRecipientDisplayName()}
            recipientAddress={recipientType === 'address' ? recipientAddress : selectedUser?.walletAddress}
            memo={memo}
            isAnonymous={isAnonymous}
            onConfirm={handleConfirmTransfer}
            onRefreshBalances={onRefreshBalances}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
