'use client'

/**
 * Course Creation Page - Создание курсов
 * /learn/create
 * Solana SuperApp Learn-to-Earn System
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Plus,
  Upload,
  BookOpen,
  Video,
  Brain,
  Award,
  Clock,
  Users,
  Target,
  Save,
  Eye,
  X,
  // DragDropContext,
  // Droppable, 
  // Draggable  // @ts-ignore - не из lucide-react
} from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { SimpleCard } from '@/components/ui/simple-card'
import { SimpleButton } from '@/components/ui/simple-button'
import { Badge } from '@/components/ui/badge'
import { useCreateCourse } from '@/hooks/useLearn'
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth'
import { hapticFeedback } from '@/components/telegram/TelegramProvider'

interface LessonDraft {
  id: string
  title: string
  description: string
  type: 'video' | 'text' | 'interactive'
  duration: number
  content?: string
  videoUrl?: string
  xpReward: number
  tokenReward: number
  order: number
  hasQuiz: boolean
  quiz?: QuizDraft
}

interface QuizDraft {
  title: string
  description: string
  timeLimit?: number
  passingScore: number
  maxAttempts?: number
  questions: QuestionDraft[]
}

interface QuestionDraft {
  id: string
  type: 'multiple_choice' | 'true_false' | 'text'
  question: string
  options?: string[]
  correctAnswer: any
  explanation?: string
  points: number
  order: number
}

export default function CreateCoursePage() {
  const router = useRouter()
  const { user, isAuthenticated } = useCompatibleAuth()
  const createCourse = useCreateCourse()

  // Course form state
  const [step, setStep] = useState(1) // 1: Basic Info, 2: Lessons, 3: Review
  const [isCreating, setIsCreating] = useState(false)

  // Basic course info
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    category: 'blockchain',
    level: 'beginner',
    coverImage: '',
    totalRewardTokens: 100,
    certificateAvailable: true
  })

  // Lessons
  const [lessons, setLessons] = useState<LessonDraft[]>([])
  const [editingLesson, setEditingLesson] = useState<LessonDraft | null>(null)
  const [showLessonModal, setShowLessonModal] = useState(false)

  // Current lesson being edited
  const [lessonForm, setLessonForm] = useState<Partial<LessonDraft>>({
    title: '',
    description: '',
    type: 'video',
    duration: 10,
    xpReward: 50,
    tokenReward: 5,
    hasQuiz: false
  })

  // Quiz editing
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizForm, setQuizForm] = useState<Partial<QuizDraft>>({
    title: '',
    description: '',
    passingScore: 70,
    questions: []
  })

  const categories = [
    { value: 'blockchain', label: 'Блокчейн', icon: '' },
    { value: 'defi', label: 'DeFi', icon: '' },
    { value: 'nft', label: 'NFT', icon: '' },
    { value: 'development', label: 'Разработка', icon: '' },
    { value: 'other', label: 'Другое', icon: '' }
  ]

  const levels = [
    { value: 'beginner', label: 'Начинающий', color: 'green' },
    { value: 'intermediate', label: 'Средний', color: 'yellow' },
    { value: 'advanced', label: 'Продвинутый', color: 'red' }
  ]

  const handleBack = () => {
    hapticFeedback.impact('light')
    router.push('/learn')
  }

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1)
      hapticFeedback.impact('medium')
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1)
      hapticFeedback.impact('light')
    }
  }

  const generateId = () => Math.random().toString(36).substring(2, 11)

  // Lesson management
  const handleAddLesson = () => {
    setEditingLesson(null)
    setLessonForm({
      title: '',
      description: '',
      type: 'video',
      duration: 10,
      xpReward: 50,
      tokenReward: 5,
      hasQuiz: false
    })
    setShowLessonModal(true)
    hapticFeedback.impact('light')
  }

  const handleEditLesson = (lesson: LessonDraft) => {
    setEditingLesson(lesson)
    setLessonForm(lesson)
    setShowLessonModal(true)
    hapticFeedback.impact('light')
  }

  const handleSaveLesson = () => {
    if (!lessonForm.title || !lessonForm.description) return

    const lesson: LessonDraft = {
      id: editingLesson?.id || generateId(),
      title: lessonForm.title!,
      description: lessonForm.description!,
      type: lessonForm.type!,
      duration: lessonForm.duration!,
      content: lessonForm.content,
      videoUrl: lessonForm.videoUrl,
      xpReward: lessonForm.xpReward!,
      tokenReward: lessonForm.tokenReward!,
      order: editingLesson?.order || lessons.length + 1,
      hasQuiz: lessonForm.hasQuiz!,
      quiz: lessonForm.quiz
    }

    if (editingLesson) {
      setLessons(lessons.map(l => l.id === editingLesson.id ? lesson : l))
    } else {
      setLessons([...lessons, lesson])
    }

    setShowLessonModal(false)
    hapticFeedback.impact('medium')
  }

  const handleDeleteLesson = (id: string) => {
    setLessons(lessons.filter(l => l.id !== id))
    hapticFeedback.impact('heavy')
  }

  // Quiz management
  const handleCreateQuiz = () => {
    setQuizForm({
      title: `Квиз: ${lessonForm.title}`,
      description: 'Проверьте свои знания',
      passingScore: 70,
      questions: []
    })
    setShowQuizModal(true)
  }

  const handleAddQuestion = () => {
    const question: QuestionDraft = {
      id: generateId(),
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      points: 1,
      order: (quizForm.questions?.length || 0) + 1
    }

    setQuizForm({
      ...quizForm,
      questions: [...(quizForm.questions || []), question]
    })
  }

  const handleSaveQuiz = () => {
    setLessonForm({
      ...lessonForm,
      hasQuiz: true,
      quiz: quizForm as QuizDraft
    })
    setShowQuizModal(false)
    hapticFeedback.impact('medium')
  }

  // Course creation
  const handleCreateCourse = async () => {
    if (!courseData.title || !courseData.description || lessons.length === 0) return

    setIsCreating(true)
    hapticFeedback.impact('heavy')

    try {
      const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.duration, 0)
      
      const result = await createCourse.mutateAsync({
        ...courseData,
        duration: totalDuration,
        lessons: lessons, // Передаем уроки в API
        createdBy: user?.id || ''
      })

      if (result.courseId) {
        // Here you would typically create lessons via API
        router.push(`/learn/courses/${result.courseId}`)
      }
    } catch (error) {
      console.error('Error creating course:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.duration, 0)
  const totalRewards = lessons.reduce((sum, lesson) => sum + lesson.tokenReward, 0)

  return (
        <PageLayout {...({
          title: "Создание курса",
          showBackButton: true,
          onBack: handleBack,
          className: "bg-gray-900"
        } as any)}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20">
        
        {/* Progress Steps */}
        <div className="px-4 py-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= stepNumber 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNumber ? 'bg-yellow-500' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">
              {step === 1 && 'Основная информация'}
              {step === 2 && 'Уроки и контент'}
              {step === 3 && 'Проверка и публикация'}
            </h2>
            <p className="text-gray-400 text-sm">
              {step === 1 && 'Заполните базовую информацию о курсе'}
              {step === 2 && 'Добавьте уроки, видео и квизы'}
              {step === 3 && 'Проверьте данные и опубликуйте курс'}
            </p>
          </div>
        </div>

        <div className="p-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <SimpleCard className="p-6 bg-white/5 border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Основная информация</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Название курса *
                    </label>
                    <input
                      type="text"
                      value={courseData.title}
                      onChange={(e) => setCourseData({...courseData, title: e.target.value})}
                      placeholder="Введите название курса"
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Описание *
                    </label>
                    <textarea
                      value={courseData.description}
                      onChange={(e) => setCourseData({...courseData, description: e.target.value})}
                      placeholder="Подробное описание курса"
                      rows={4}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500/50 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Краткое описание
                    </label>
                    <input
                      type="text"
                      value={courseData.shortDescription}
                      onChange={(e) => setCourseData({...courseData, shortDescription: e.target.value})}
                      placeholder="Краткое описание для карточки курса"
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Категория
                      </label>
                      <select
                        value={courseData.category}
                        onChange={(e) => setCourseData({...courseData, category: e.target.value})}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value} className="bg-gray-800 text-white">
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Уровень
                      </label>
                      <select
                        value={courseData.level}
                        onChange={(e) => setCourseData({...courseData, level: e.target.value})}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                      >
                        {levels.map(level => (
                          <option key={level.value} value={level.value} className="bg-gray-800 text-white">
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Общая награда (TNG токенов)
                    </label>
                    <input
                      type="number"
                      value={courseData.totalRewardTokens}
                      onChange={(e) => setCourseData({...courseData, totalRewardTokens: Number(e.target.value)})}
                      min="0"
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              </SimpleCard>

              <div className="flex justify-end">
                <SimpleButton
                  onClick={handleNextStep}
                  disabled={!courseData.title || !courseData.description}
                  className="bg-gray-700 hover:bg-gray-600 border-gray-600"
                >
                  Далее →
                </SimpleButton>
              </div>
            </motion.div>
          )}

          {/* Step 2: Lessons */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Уроки курса</h3>
                <SimpleButton
                  onClick={handleAddLesson}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить урок
                </SimpleButton>
              </div>

              {lessons.length === 0 ? (
                <SimpleCard className="p-8 bg-white/5 border-white/10 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-white mb-2">Пока нет уроков</h4>
                  <p className="text-gray-400 mb-4">Добавьте первый урок для начала</p>
                  <SimpleButton onClick={handleAddLesson}>
                    Создать урок
                  </SimpleButton>
                </SimpleCard>
              ) : (
                <div className="space-y-4">
                  {lessons.map((lesson, index) => (
                    <SimpleCard key={lesson.id} className="p-4 bg-white/5 border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-gray-600/30 rounded-lg p-2">
                            {lesson.type === 'video' ? (
                              <Video className="w-5 h-5 text-gray-300" />
                            ) : lesson.type === 'text' ? (
                              <BookOpen className="w-5 h-5 text-gray-300" />
                            ) : (
                              <Brain className="w-5 h-5 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{lesson.title}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <span>{lesson.duration} мин</span>
                              <span>{lesson.tokenReward} TNG</span>
                              {lesson.hasQuiz && <Badge >Квиз</Badge>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <SimpleButton
                            onClick={() => handleEditLesson(lesson)}
                            {...({ variant: "outline", size: "sm" } as any)}
                          >
                            Редактировать
                          </SimpleButton>
                          <SimpleButton
                            onClick={() => handleDeleteLesson(lesson.id)}
                            size="sm"
                            className="text-red-400 border-red-400 hover:bg-red-500/20"
                          >
                            <X className="w-4 h-4" />
                          </SimpleButton>
                        </div>
                      </div>
                    </SimpleCard>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <SimpleButton onClick={handlePrevStep} >
                  ← Назад
                </SimpleButton>
                <SimpleButton
                  onClick={handleNextStep}
                  disabled={lessons.length === 0}
                  className="bg-gray-700 hover:bg-gray-600 border-gray-600"
                >
                  Далее →
                </SimpleButton>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-semibold text-white">Проверка курса</h3>

              {/* Course Summary */}
              <SimpleCard className="p-6 bg-white/5 border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">{courseData.title}</h4>
                <p className="text-gray-300 mb-4">{courseData.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{lessons.length}</div>
                    <div className="text-sm text-gray-400">Уроков</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{totalDuration}</div>
                    <div className="text-sm text-gray-400">Минут</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{totalRewards}</div>
                    <div className="text-sm text-gray-400">TNG награды</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {lessons.filter(l => l.hasQuiz).length}
                    </div>
                    <div className="text-sm text-gray-400">Квизов</div>
                  </div>
                </div>
              </SimpleCard>

              <div className="flex justify-between">
                <SimpleButton onClick={handlePrevStep} >
                  ← Назад
                </SimpleButton>
                
                <SimpleButton
                  onClick={handleCreateCourse}
                  disabled={isCreating}
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                >
                  {isCreating ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Создание...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Создать курс</span>
                    </div>
                  )}
                </SimpleButton>
              </div>
            </motion.div>
          )}
        </div>

        {/* Lesson Modal */}
        {showLessonModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pb-20 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-xl border border-gray-700/50 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl my-4"
            >
              <div className="max-h-[85vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {editingLesson ? 'Редактировать урок' : 'Создать урок'}
                  </h3>
                  <button
                    onClick={() => setShowLessonModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Название урока
                    </label>
                    <input
                      type="text"
                      value={lessonForm.title || ''}
                      onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Описание
                    </label>
                    <textarea
                      value={lessonForm.description || ''}
                      onChange={(e) => setLessonForm({...lessonForm, description: e.target.value})}
                      rows={3}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Тип урока
                      </label>
                      <select
                        value={lessonForm.type || 'video'}
                        onChange={(e) => setLessonForm({...lessonForm, type: e.target.value as any})}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                      >
                        <option value="video" className="bg-gray-800 text-white">Видео</option>
                        <option value="text" className="bg-gray-800 text-white">Текст</option>
                        <option value="interactive" className="bg-gray-800 text-white">Интерактивный</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Длительность (мин)
                      </label>
                      <input
                        type="number"
                        value={lessonForm.duration || 10}
                        onChange={(e) => setLessonForm({...lessonForm, duration: Number(e.target.value)})}
                        min="1"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  {lessonForm.type === 'video' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        URL видео
                      </label>
                      <input
                        type="url"
                        value={lessonForm.videoUrl || ''}
                        onChange={(e) => setLessonForm({...lessonForm, videoUrl: e.target.value})}
                        placeholder="https://..."
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        XP награда
                      </label>
                      <input
                        type="number"
                        value={lessonForm.xpReward || 50}
                        onChange={(e) => setLessonForm({...lessonForm, xpReward: Number(e.target.value)})}
                        min="0"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        TNG награда
                      </label>
                      <input
                        type="number"
                        value={lessonForm.tokenReward || 5}
                        onChange={(e) => setLessonForm({...lessonForm, tokenReward: Number(e.target.value)})}
                        min="0"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="hasQuiz"
                      checked={lessonForm.hasQuiz || false}
                      onChange={(e) => setLessonForm({...lessonForm, hasQuiz: e.target.checked})}
                      className="w-4 h-4 text-yellow-500 bg-white/5 border-white/10 rounded focus:ring-yellow-500/50"
                    />
                    <label htmlFor="hasQuiz" className="text-sm text-gray-300">
                      Добавить квиз к уроку
                    </label>
                    {lessonForm.hasQuiz && (
                      <SimpleButton
                        onClick={handleCreateQuiz}
                        size="sm"
                        className="bg-gray-600 hover:bg-gray-500 border-gray-500"
                      >
                        Настроить квиз
                      </SimpleButton>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <SimpleButton
                    onClick={() => setShowLessonModal(false)}
                  >
                    Отмена
                  </SimpleButton>
                  <SimpleButton
                    onClick={handleSaveLesson}
                    disabled={!lessonForm.title || !lessonForm.description}
                    className="bg-gray-700 hover:bg-gray-600 border-gray-600"
                  >
                    Сохранить
                  </SimpleButton>
                </div>
              </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quiz Modal */}
        {showQuizModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pb-20 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-xl border border-gray-700/50 w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl my-4"
            >
              <div className="max-h-[85vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Настройка квиза
                    </h3>
                    <button
                      onClick={() => setShowQuizModal(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Название квиза
                      </label>
                      <input
                        type="text"
                        value={quizForm.title || ''}
                        onChange={(e) => setQuizForm({...quizForm, title: e.target.value})}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Описание
                      </label>
                      <textarea
                        value={quizForm.description || ''}
                        onChange={(e) => setQuizForm({...quizForm, description: e.target.value})}
                        rows={2}
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Проходной балл (%)
                        </label>
                        <input
                          type="number"
                          value={quizForm.passingScore || 70}
                          onChange={(e) => setQuizForm({...quizForm, passingScore: Number(e.target.value)})}
                          min="0"
                          max="100"
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Ограничение времени (мин)
                        </label>
                        <input
                          type="number"
                          value={quizForm.timeLimit || ''}
                          onChange={(e) => setQuizForm({...quizForm, timeLimit: Number(e.target.value) || undefined})}
                          min="1"
                          placeholder="Без ограничений"
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-yellow-500/50 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-white">Вопросы</h4>
                        <SimpleButton
                          onClick={handleAddQuestion}
                          size="sm"
                          className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Добавить вопрос
                        </SimpleButton>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {quizForm.questions?.map((question, index) => (
                          <div key={question.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-300">
                                Вопрос {index + 1}
                              </span>
                              <button
                                onClick={() => {
                                  const updated = quizForm.questions?.filter(q => q.id !== question.id) || []
                                  setQuizForm({...quizForm, questions: updated})
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={question.question}
                              onChange={(e) => {
                                const updated = quizForm.questions?.map(q => 
                                  q.id === question.id ? {...q, question: e.target.value} : q
                                ) || []
                                setQuizForm({...quizForm, questions: updated})
                              }}
                              placeholder="Введите вопрос..."
                              className="w-full p-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:border-yellow-500/50 focus:outline-none mb-2"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              {question.options.map((option, optIndex) => (
                                <input
                                  key={optIndex}
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...question.options]
                                    newOptions[optIndex] = e.target.value
                                    const updated = quizForm.questions?.map(q => 
                                      q.id === question.id ? {...q, options: newOptions} : q
                                    ) || []
                                    setQuizForm({...quizForm, questions: updated})
                                  }}
                                  placeholder={`Вариант ${optIndex + 1}`}
                                  className="w-full p-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:border-yellow-500/50 focus:outline-none"
                                />
                              ))}
                            </div>

                            <div className="mt-2">
                              <select
                                value={question.correctAnswer}
                                onChange={(e) => {
                                  const updated = quizForm.questions?.map(q => 
                                    q.id === question.id ? {...q, correctAnswer: e.target.value} : q
                                  ) || []
                                  setQuizForm({...quizForm, questions: updated})
                                }}
                                className="w-full p-2 bg-white/5 border border-white/10 rounded text-white text-sm focus:border-yellow-500/50 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                              >
                                <option value="" className="bg-gray-800 text-white">Выберите правильный ответ</option>
                                {question.options.map((option, idx) => (
                                  <option key={idx} value={option} className="bg-gray-800 text-white">
                                    {option || `Вариант ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}

                        {(!quizForm.questions || quizForm.questions.length === 0) && (
                          <div className="text-center py-8 text-gray-400">
                            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Добавьте вопросы для квиза</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                      <SimpleButton
                        onClick={() => setShowQuizModal(false)}
                      >
                        Отмена
                      </SimpleButton>
                      <SimpleButton
                        onClick={handleSaveQuiz}
                        disabled={!quizForm.title || !quizForm.questions?.length}
                        className="bg-gray-700 hover:bg-gray-600 border-gray-600"
                      >
                        Сохранить квиз
                      </SimpleButton>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
