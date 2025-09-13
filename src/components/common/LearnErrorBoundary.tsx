'use client'

import React, { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { SimpleCard } from '@/components/ui/simple-card'
import { Button } from '@/components/ui/button'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
  retryCount: number
}

export class LearnErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Learn Error Boundary caught an error:', error)
    console.error('Error Info:', errorInfo)
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack
    })

    // Отправляем ошибку в аналитику (если есть)
    if (typeof window !== 'undefined') {
      // Можно добавить отправку в Sentry, LogRocket и т.д.
      console.error('Error boundary triggered:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount
      })
    }
  }

  handleRetry = () => {
    hapticFeedback.impact('light')
    
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  handleGoHome = () => {
    hapticFeedback.impact('medium')
    if (typeof window !== 'undefined') {
      window.location.href = '/learn'
    }
  }

  render() {
    if (this.state.hasError) {
      // Пользовательский fallback
      if (this.props.fallback) {
        return this.props.fallback
      }

      const canRetry = this.state.retryCount < this.maxRetries
      const isNetworkError = this.state.error?.message.includes('fetch') || 
                           this.state.error?.message.includes('network') ||
                           this.state.error?.message.includes('Failed to load')

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <SimpleCard className="w-full max-w-md">
            <div className="text-center space-y-6">
              {/* Иконка ошибки */}
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>

              {/* Заголовок */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isNetworkError ? 'Проблема с подключением' : 'Что-то пошло не так'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {isNetworkError 
                    ? 'Проверьте подключение к интернету и попробуйте снова'
                    : 'Произошла неожиданная ошибка в системе обучения'
                  }
                </p>
              </div>

              {/* Детали ошибки в dev режиме */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Подробности ошибки (dev)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
                    {this.state.error.message}
                    {this.state.error.stack && (
                      <div className="mt-2 text-gray-500">
                        {this.state.error.stack}
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Счетчик попыток */}
              {this.state.retryCount > 0 && (
                <div className="text-sm text-gray-500">
                  Попытка {this.state.retryCount} из {this.maxRetries}
                </div>
              )}

              {/* Кнопки действий */}
              <div className="space-y-3">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full flex items-center justify-center gap-2"
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Попробовать снова
                  </Button>
                )}

                <Button
                  onClick={this.handleGoHome}
                  variant={canRetry ? "outline" : "default"}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Вернуться на главную
                </Button>
              </div>

              {/* Дополнительная информация */}
              {!canRetry && (
                <div className="text-sm text-gray-500">
                  Если проблема повторяется, обратитесь в поддержку
                </div>
              )}
            </div>
          </SimpleCard>
        </div>
      )
    }

    return this.props.children
  }
}

// Хук для использования error boundary в функциональных компонентах
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    // Можно добавить логику для программного вызова error boundary
    throw error
  }
}

// HOC для оборачивания компонентов
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <LearnErrorBoundary fallback={fallback}>
      <Component {...props} />
    </LearnErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

