'use client'

/**
 * Lesson Page - Страница урока с видеоплеером
 * /learn/courses/[courseId]/lessons/[lessonId]
 * Solana SuperApp Learn-to-Earn System
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Play, 
  Pause,
  CheckCircle, 
  Clock,
  Award,
  BookOpen,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  SkipForward,
  FileText,
  Brain
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { useLesson, useCourse } from '@/hooks/useLearn'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { formatDuration } from '@/lib/learn/utils'

// Format viewing time to 2 decimal places
const formatViewingTime = (seconds: number): string => {
  const minutes = seconds / 60
  return `${minutes.toFixed(2)} мин`
}
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useCompatibleAuth()
  
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string

  // Use individual hooks directly
  const { lesson, loading: lessonLoading, error: lessonError, completeLesson } = useLesson(lessonId)
  const { course, loading: courseLoading, error: courseError } = useCourse(courseId)

  // Debug lesson data for MVP
  useEffect(() => {
    if (lesson) {
      console.log(' Lesson loaded:', {
        id: lesson.id,
        title: lesson.title,
        hasQuiz: !!lesson.quiz,
        quiz: lesson.quiz
      })
    }
  }, [lesson])

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)
  
  // Lesson state
  const [watchTime, setWatchTime] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [isSkipped, setIsSkipped] = useState(false) // For MVP skip functionality

  // Video ref
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)

  // Start lesson tracking
  useEffect(() => {
    if (lesson && !hasStarted) {
      setHasStarted(true)
      // Could track lesson start via API
    }
  }, [lesson, hasStarted])

  // Watch time tracking
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setWatchTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  // Controls auto-hide functionality
  const resetControlsTimeout = () => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
    }
    setShowControls(true)
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000) // Hide controls after 3 seconds
    setControlsTimeout(timeout)
  }

  // Show controls when mouse moves or video is clicked
  const handleVideoInteraction = () => {
    resetControlsTimeout()
  }

  // Hide controls timeout on play
  useEffect(() => {
    if (isPlaying) {
      resetControlsTimeout()
    } else {
      setShowControls(true)
      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }
    }
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }
    }
  }, [isPlaying])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isInFullscreen)
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      // Exit fullscreen on Escape key
      if (e.key === 'Escape' && videoRef && videoRef.style.position === 'fixed') {
        // Exit CSS fallback fullscreen
        videoRef.style.position = ''
        videoRef.style.top = ''
        videoRef.style.left = ''
        videoRef.style.width = ''
        videoRef.style.height = ''
        videoRef.style.zIndex = ''
        videoRef.style.backgroundColor = ''
        setIsFullscreen(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [videoRef])

  // Video event handlers
  const handlePlay = () => {
    if (videoRef) {
      videoRef.play()
      setIsPlaying(true)
      try {
        hapticFeedback.impact('light')
      } catch (error) {
        // Haptic feedback not available
      }
    }
  }

  const handlePause = () => {
    if (videoRef) {
      videoRef.pause()
      setIsPlaying(false)
      try {
        hapticFeedback.impact('light')
      } catch (error) {
        // Haptic feedback not available
      }
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef) {
      setCurrentTime(videoRef.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef) {
      setDuration(videoRef.duration)
    }
  }

  const handleSeek = (time: number) => {
    if (videoRef) {
      videoRef.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef) {
      videoRef.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef) {
      const newMuted = !isMuted
      videoRef.muted = newMuted
      setIsMuted(newMuted)
      try {
        hapticFeedback.impact('light')
      } catch (error) {
        // Haptic feedback not available
      }
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef) {
      videoRef.playbackRate = rate
      setPlaybackRate(rate)
      try {
        hapticFeedback.impact('light')
      } catch (error) {
        // Haptic feedback not available
      }
    }
  }

  const toggleFullscreen = async () => {
    if (!videoRef) return
    
    try {
      hapticFeedback.impact('medium')
    } catch (error) {
      // Haptic feedback not available
    }
    
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).mozFullScreenElement) {
        // Enter fullscreen
        let fullscreenPromise: Promise<void> | undefined

        if (videoRef.requestFullscreen) {
          fullscreenPromise = videoRef.requestFullscreen()
        } else if ((videoRef as any).webkitRequestFullscreen) {
          fullscreenPromise = (videoRef as any).webkitRequestFullscreen()
        } else if ((videoRef as any).webkitEnterFullscreen) {
          // iOS Safari mobile
          fullscreenPromise = (videoRef as any).webkitEnterFullscreen()
        } else if ((videoRef as any).mozRequestFullScreen) {
          fullscreenPromise = (videoRef as any).mozRequestFullScreen()
        } else if ((videoRef as any).msRequestFullscreen) {
          fullscreenPromise = (videoRef as any).msRequestFullscreen()
        } else {
          // Fallback: try to maximize video using CSS
          console.warn('Native fullscreen not supported, using CSS fallback')
          videoRef.style.position = 'fixed'
          videoRef.style.top = '0'
          videoRef.style.left = '0'
          videoRef.style.width = '100vw'
          videoRef.style.height = '100vh'
          videoRef.style.zIndex = '9999'
          videoRef.style.backgroundColor = 'black'
          setIsFullscreen(true)
          return
        }

        if (fullscreenPromise) {
          await fullscreenPromise
          setIsFullscreen(true)
        }
      } else {
        // Exit fullscreen
        if (videoRef.style.position === 'fixed') {
          // Exit CSS fallback fullscreen
          videoRef.style.position = ''
          videoRef.style.top = ''
          videoRef.style.left = ''
          videoRef.style.width = ''
          videoRef.style.height = ''
          videoRef.style.zIndex = ''
          videoRef.style.backgroundColor = ''
          setIsFullscreen(false)
        } else {
          // Exit native fullscreen
          if (document.exitFullscreen) {
            await document.exitFullscreen()
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen()
          } else if ((document as any).webkitCancelFullScreen) {
            await (document as any).webkitCancelFullScreen()
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen()
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen()
          }
          setIsFullscreen(false)
        }
      }
    } catch (error) {
      console.warn('Fullscreen operation failed, this is normal on some devices/browsers:', error)
      // Don't show error to user, as fullscreen restrictions are common
    }
  }

  // Complete lesson
  const handleCompleteLesson = async () => {
    if (!lesson || isCompleting) return

    setIsCompleting(true)
    try {
      hapticFeedback.impact('medium')
    } catch (error) {
      // Haptic feedback not available
    }

    try {
      const result = await completeLesson(watchTime)
      console.log(' Lesson completion result:', result)
      console.log(' Lesson quiz data:', lesson.quiz)
      console.log(' Lesson has quiz?', !!lesson.quiz)

      // Navigate to next lesson or quiz
      if (lesson.quiz) {
        console.log(' Navigating to quiz...')
        router.push(`/learn/courses/${courseId}/lessons/${lessonId}/quiz`)
      } else {
        console.log(' No quiz found, returning to course...')
        // Check if there's a next lesson
        router.push(`/learn/courses/${courseId}`)
      }
    } catch (error) {
      console.error('Error completing lesson:', error)
      // Still try to navigate even if completion failed (for MVP)
      if (lesson.quiz) {
        console.log(' Completion failed but quiz exists, navigating to quiz anyway...')
        router.push(`/learn/courses/${courseId}/lessons/${lessonId}/quiz`)
      } else {
        router.push(`/learn/courses/${courseId}`)
      }
    } finally {
      setIsCompleting(false)
    }
  }

  const handleBack = () => {
    try {
      hapticFeedback.impact('light')
    } catch (error) {
      // Haptic feedback not available
    }
    router.push(`/learn/courses/${courseId}`)
  }

  // Skip lesson for MVP
  const handleSkipLesson = () => {
    try {
      hapticFeedback.impact('medium')
    } catch (error) {
      // Haptic feedback not available
    }
    
    setIsSkipped(true)
    // Set watch time to lesson duration to simulate completion
    setWatchTime(lesson?.duration ? lesson.duration * 60 : 300) // Default 5 minutes if no duration
    
    // Show notification
    console.log(' Урок пропущен для MVP демо')
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const watchProgress = lesson ? (watchTime / (lesson.duration * 60)) * 100 : 0
  
  // Quiz validation logic
  const hasQuiz = !!lesson?.quiz
  const isQuizPassed = lesson?.quiz?.isPassed || false
  const quizRequired = hasQuiz && !isQuizPassed
  
  // Can complete only if: (watched enough OR skipped) AND (no quiz OR quiz passed)
  const canComplete = (watchProgress >= 80 || lesson?.isCompleted || isSkipped) && (!hasQuiz || isQuizPassed)

  if (lessonLoading) {
    return (
      <PageLayout title="Загрузка..." showBackButton onBack={handleBack}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      </PageLayout>
    )
  }

  if (!lesson) {
    return (
      <PageLayout title="Ошибка" showBackButton onBack={handleBack}>
        <SimpleCard className="p-6 text-center">
          <p className="text-gray-400 mb-4">Урок не найден</p>
          <SimpleButton onClick={handleBack}>Вернуться к курсу</SimpleButton>
        </SimpleCard>
      </PageLayout>
    )
  }

  return (
    <PageLayout 
      title=""
      showBackButton 
      onBack={handleBack}
    >
      <div className="space-y-5">
      
      {/* Quiz Info Card */}
      {lesson.quiz && (
        <SimpleCard className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-white">Квиз по уроку</span>
            </div>
            {lesson.quiz.isPassed ? (
              <div className="flex items-center space-x-1 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">Пройден</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-orange-400">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Требует прохождения</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex justify-between">
              <span>Требуемый результат:</span>
              <span className="text-purple-400">{lesson.quiz.passingScore}%</span>
            </div>
            {lesson.quiz.bestScore > 0 && (
              <div className="flex justify-between">
                <span>Лучший результат:</span>
                <span className={lesson.quiz.isPassed ? 'text-green-400' : 'text-red-400'}>
                  {lesson.quiz.bestScore}%
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Попыток использовано:</span>
              <span className="text-gray-400">{lesson.quiz.attemptsUsed}/{lesson.quiz.maxAttempts}</span>
            </div>
            {lesson.quiz.questions && (
              <div className="flex justify-between">
                <span>Вопросов:</span>
                <span className="text-gray-400">{lesson.quiz.questions.length}</span>
              </div>
            )}
          </div>
          
          {!lesson.quiz.isPassed && lesson.quiz.availableAttempts > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <span className="text-xs text-yellow-400">
                 Завершение урока станет доступно после успешного прохождения квиза
              </span>
            </div>
          )}
        </SimpleCard>
      )}
      
      {/* Video Player Section */}
      <div className="relative bg-black">
        {lesson.videoUrl ? (
          <div className="aspect-video relative">
              <video
                ref={setVideoRef}
                src={lesson.videoUrl}
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onMouseMove={handleVideoInteraction}
                onClick={handleVideoInteraction}
                poster={lesson.coverImage}
              />
              
              {/* Video Controls Overlay */}
              <div 
                className={`absolute inset-0 bg-black/0 transition-all duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onMouseMove={handleVideoInteraction}
              >
                {/* Play/Pause Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={isPlaying ? handlePause : handlePlay}
                    className="bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </motion.button>
                </div>

                {/* Bottom Controls */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-all duration-300 ${
                  showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                }`}>
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div 
                      className="bg-white/20 rounded-full h-1 mb-2 cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const percentage = x / rect.width
                        const newTime = percentage * duration
                        handleSeek(newTime)
                        handleVideoInteraction()
                      }}
                    >
                      <div 
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full h-1 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/80">
                      <span>{formatViewingTime(currentTime)}</span>
                      <span>{formatViewingTime(duration)}</span>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={toggleMute}
                        className="text-white/80 hover:text-white transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      
                      <select
                        value={playbackRate}
                        onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                        className="bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1"
                      >
                        <option value={0.5}>0.5x</option>
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2}>2x</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="text-white/80 hover:text-white transition-colors"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={toggleFullscreen}
                        className="text-white/80 hover:text-white transition-colors"
                      >
                        <Maximize className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Fallback for lessons without video
            <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Текстовый урок</h3>
                <p className="text-gray-300">Изучите материал ниже</p>
              </div>
            </div>
          )}
      </div>

      {/* Lesson Content */}
      <div className="px-4 py-6 space-y-6">
        
        {/* Lesson Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                Урок {lesson.order}
              </Badge>
              {lesson.isCompleted && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Завершен
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{lesson.duration} мин</span>
              </div>
              <div className="flex items-center space-x-1">
                <Award className="w-4 h-4" />
                <span>{lesson.tokenReward} TNG</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{lesson.title}</h1>
          <p className="text-gray-300">{lesson.description}</p>
        </div>

        {/* Progress Card */}
        <SimpleCard className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">Прогресс просмотра</span>
            <span className="text-sm text-yellow-400">{Math.round(watchProgress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <div 
              className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
            <span>Просмотрено: {formatViewingTime(watchTime)}</span>
            <span>Всего: {lesson.duration} мин</span>
          </div>
          
          {/* MVP Skip Button */}
          {!isSkipped && !lesson?.isCompleted && watchProgress < 80 && (
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  <span>MVP: Пропустить для демо</span>
                </div>
                <SimpleButton
                  onClick={handleSkipLesson}
                  className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1.5"
                >
                  Пропустить урок
                </SimpleButton>
              </div>
            </div>
          )}
          
          {/* MVP Direct Quiz Access */}
          {lesson && (
            <div className="border-t border-white/10 pt-3 mt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  <span>MVP: Прямой доступ к квизу</span>
                </div>
                <SimpleButton
                  onClick={() => {
                    console.log(' Force navigation to quiz')
                    router.push(`/learn/courses/${courseId}/lessons/${lessonId}/quiz`)
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5"
                >
                  Открыть квиз
                </SimpleButton>
              </div>
            </div>
          )}
          
          {/* Skipped indicator */}
          {isSkipped && (
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-center text-xs text-orange-400">
                <span> Урок пропущен (MVP режим)</span>
              </div>
            </div>
          )}
        </SimpleCard>

        {/* Lesson Content */}
        {lesson.content && (
          <SimpleCard className="p-6 bg-white/5 border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Материалы урока
            </h3>
            <div 
              className="prose prose-invert max-w-none text-gray-300"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          </SimpleCard>
        )}

        {/* Transcript */}
        {showTranscript && lesson.transcript && (
          <SimpleCard className="p-6 bg-white/5 border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Транскрипт</h3>
            <div className="text-gray-300 text-sm leading-relaxed">
              {lesson.transcript}
            </div>
          </SimpleCard>
        )}

        {/* Complete Lesson Button */}
        <div className="sticky bottom-4 z-10">
          <SimpleCard className="p-4 bg-white/10 backdrop-blur-md border-white/20">
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  {canComplete ? (
                    isSkipped ? (
                      <span className="text-orange-400"> Урок пропущен - готово к завершению</span>
                    ) : (
                      <span className="text-green-400"> Готово к завершению</span>
                    )
                  ) : quizRequired ? (
                    <span className="text-red-400">
                       Необходимо пройти квиз с результатом {lesson.quiz?.passingScore}%+
                      {lesson.quiz?.bestScore > 0 && ` (текущий: ${lesson.quiz.bestScore}%)`}
                    </span>
                  ) : (
                    <span>Досмотрите до 80% для завершения</span>
                  )}
                </div>
              
              <SimpleButton
                onClick={handleCompleteLesson}
                disabled={!canComplete || isCompleting}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                {isCompleting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Завершение...</span>
                  </div>
                ) : lesson?.quiz ? (
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4" />
                    <span>Пройти квиз</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Завершить урок</span>
                  </div>
                )}
              </SimpleButton>
            </div>
          </SimpleCard>
        </div>
      </div>
    </div>
    </PageLayout>
  )
}