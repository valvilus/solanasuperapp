/**
 * Валидация для Learn API endpoints
 * Solana SuperApp Learn-to-Earn System
 */

// Базовые валидаторы
export const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value)
}

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean'
}

export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value)
}

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !isArray(value)
}

// Валидация ID
export const validateId = (id: unknown): { valid: boolean; error?: string; value?: string } => {
  if (!isString(id)) {
    return { valid: false, error: 'ID должен быть строкой' }
  }
  
  if (id.trim() === '') {
    return { valid: false, error: 'ID не может быть пустым' }
  }
  
  if (id.length > 100) {
    return { valid: false, error: 'ID слишком длинный (максимум 100 символов)' }
  }
  
  // Проверяем на допустимые символы
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { valid: false, error: 'ID может содержать только буквы, цифры, дефисы и подчеркивания' }
  }
  
  return { valid: true, value: id.trim() }
}

// Валидация временных параметров
export const validateTimeSpent = (timeSpent: unknown): { valid: boolean; error?: string; value?: number } => {
  if (timeSpent === undefined || timeSpent === null) {
    return { valid: true, value: 0 }
  }
  
  if (!isNumber(timeSpent)) {
    return { valid: false, error: 'Время должно быть числом' }
  }
  
  if (timeSpent < 0) {
    return { valid: false, error: 'Время не может быть отрицательным' }
  }
  
  if (timeSpent > 86400) { // 24 часа в секундах
    return { valid: false, error: 'Время не может превышать 24 часа' }
  }
  
  return { valid: true, value: Math.floor(timeSpent) }
}

// Валидация ответов квиза
export const validateQuizAnswers = (answers: unknown): { valid: boolean; error?: string; value?: any[] } => {
  if (!isArray(answers)) {
    return { valid: false, error: 'Ответы должны быть массивом' }
  }
  
  if (answers.length === 0) {
    return { valid: false, error: 'Массив ответов не может быть пустым' }
  }
  
  if (answers.length > 100) {
    return { valid: false, error: 'Слишком много ответов (максимум 100)' }
  }
  
  // Проверяем каждый ответ
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i]
    
    if (!isObject(answer)) {
      return { valid: false, error: `Ответ ${i + 1} должен быть объектом` }
    }
    
    // Проверяем обязательные поля
    if (!isString(answer.questionId) || answer.questionId.trim() === '') {
      return { valid: false, error: `Ответ ${i + 1}: questionId обязателен` }
    }
    
    if (answer.answer === undefined || answer.answer === null) {
      return { valid: false, error: `Ответ ${i + 1}: answer обязателен` }
    }
    
    // Проверяем timeSpent если есть
    if (answer.timeSpent !== undefined) {
      const timeValidation = validateTimeSpent(answer.timeSpent)
      if (!timeValidation.valid) {
        return { valid: false, error: `Ответ ${i + 1}: ${timeValidation.error}` }
      }
    }
  }
  
  return { valid: true, value: answers }
}

// Валидация параметров поиска
export const validateSearchParams = (params: unknown): { valid: boolean; error?: string; value?: Record<string, string> } => {
  if (!isObject(params)) {
    return { valid: false, error: 'Параметры поиска должны быть объектом' }
  }
  
  const result: Record<string, string> = {}
  
  // Проверяем категорию
  if (params.category !== undefined) {
    if (!isString(params.category)) {
      return { valid: false, error: 'Категория должна быть строкой' }
    }
    
    const validCategories = ['all', 'blockchain', 'defi', 'nft', 'trading', 'development', 'security']
    if (!validCategories.includes(params.category)) {
      return { valid: false, error: 'Недопустимая категория' }
    }
    
    result.category = params.category
  }
  
  // Проверяем уровень
  if (params.level !== undefined) {
    if (!isString(params.level)) {
      return { valid: false, error: 'Уровень должен быть строкой' }
    }
    
    const validLevels = ['all', 'beginner', 'intermediate', 'advanced']
    if (!validLevels.includes(params.level)) {
      return { valid: false, error: 'Недопустимый уровень' }
    }
    
    result.level = params.level
  }
  
  // Проверяем поисковый запрос
  if (params.search !== undefined) {
    if (!isString(params.search)) {
      return { valid: false, error: 'Поисковый запрос должен быть строкой' }
    }
    
    if (params.search.length > 200) {
      return { valid: false, error: 'Поисковый запрос слишком длинный (максимум 200 символов)' }
    }
    
    result.search = params.search.trim()
  }
  
  // Проверяем сортировку
  if (params.sortBy !== undefined) {
    if (!isString(params.sortBy)) {
      return { valid: false, error: 'Сортировка должна быть строкой' }
    }
    
    const validSorts = ['newest', 'popular', 'rating', 'duration']
    if (!validSorts.includes(params.sortBy)) {
      return { valid: false, error: 'Недопустимый тип сортировки' }
    }
    
    result.sortBy = params.sortBy
  }
  
  // Проверяем лимиты
  if (params.limit !== undefined) {
    const limitNum = Number(params.limit)
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return { valid: false, error: 'Лимит должен быть числом от 1 до 100' }
    }
    result.limit = limitNum.toString()
  }
  
  if (params.offset !== undefined) {
    const offsetNum = Number(params.offset)
    if (isNaN(offsetNum) || offsetNum < 0) {
      return { valid: false, error: 'Offset должен быть неотрицательным числом' }
    }
    result.offset = offsetNum.toString()
  }
  
  return { valid: true, value: result }
}

// Валидация данных курса при создании
export interface CreateCourseData {
  title: string
  description: string
  shortDescription?: string
  category: string
  level: string
  duration: number
  coverImage?: string
  totalRewardTokens?: number
  certificateAvailable?: boolean
  prerequisites?: string[]
  learningObjectives?: string[]
  difficultyScore?: number
  estimatedTime?: number
  instructor?: string
}

export const validateCourseData = (data: unknown): { valid: boolean; error?: string; value?: CreateCourseData } => {
  if (!isObject(data)) {
    return { valid: false, error: 'Данные курса должны быть объектом' }
  }
  
  // Проверяем обязательные поля
  if (!isString(data.title) || data.title.trim() === '') {
    return { valid: false, error: 'Название курса обязательно' }
  }
  
  if (data.title.length > 200) {
    return { valid: false, error: 'Название курса слишком длинное (максимум 200 символов)' }
  }
  
  if (!isString(data.description) || data.description.trim() === '') {
    return { valid: false, error: 'Описание курса обязательно' }
  }
  
  if (data.description.length > 2000) {
    return { valid: false, error: 'Описание курса слишком длинное (максимум 2000 символов)' }
  }
  
  if (!isString(data.category)) {
    return { valid: false, error: 'Категория курса обязательна' }
  }
  
  const validCategories = ['blockchain', 'defi', 'nft', 'trading', 'development', 'security']
  if (!validCategories.includes(data.category.toLowerCase())) {
    return { valid: false, error: 'Недопустимая категория курса' }
  }
  
  if (!isString(data.level)) {
    return { valid: false, error: 'Уровень курса обязателен' }
  }
  
  const validLevels = ['beginner', 'intermediate', 'advanced']
  if (!validLevels.includes(data.level.toLowerCase())) {
    return { valid: false, error: 'Недопустимый уровень курса' }
  }
  
  if (!isNumber(data.duration) || data.duration <= 0) {
    return { valid: false, error: 'Продолжительность курса должна быть положительным числом' }
  }
  
  if (data.duration > 10080) { // максимум неделя в минутах
    return { valid: false, error: 'Продолжительность курса не может превышать неделю' }
  }
  
  // Проверяем опциональные поля
  const result: CreateCourseData = {
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category.toLowerCase(),
    level: data.level.toLowerCase(),
    duration: Math.floor(data.duration)
  }
  
  if (data.shortDescription !== undefined) {
    if (!isString(data.shortDescription)) {
      return { valid: false, error: 'Краткое описание должно быть строкой' }
    }
    if (data.shortDescription.length > 500) {
      return { valid: false, error: 'Краткое описание слишком длинное (максимум 500 символов)' }
    }
    result.shortDescription = data.shortDescription.trim()
  }
  
  if (data.coverImage !== undefined) {
    if (!isString(data.coverImage)) {
      return { valid: false, error: 'Обложка должна быть строкой' }
    }
    result.coverImage = data.coverImage.trim()
  }
  
  if (data.totalRewardTokens !== undefined) {
    if (!isNumber(data.totalRewardTokens) || data.totalRewardTokens < 0) {
      return { valid: false, error: 'Награда в токенах должна быть неотрицательным числом' }
    }
    result.totalRewardTokens = Math.floor(data.totalRewardTokens)
  }
  
  if (data.certificateAvailable !== undefined) {
    if (!isBoolean(data.certificateAvailable)) {
      return { valid: false, error: 'Доступность сертификата должна быть булевым значением' }
    }
    result.certificateAvailable = data.certificateAvailable
  }
  
  if (data.prerequisites !== undefined) {
    if (!isArray(data.prerequisites)) {
      return { valid: false, error: 'Предварительные требования должны быть массивом' }
    }
    
    for (const prereq of data.prerequisites) {
      if (!isString(prereq)) {
        return { valid: false, error: 'Каждое предварительное требование должно быть строкой' }
      }
    }
    
    result.prerequisites = data.prerequisites as string[]
  }
  
  if (data.learningObjectives !== undefined) {
    if (!isArray(data.learningObjectives)) {
      return { valid: false, error: 'Цели обучения должны быть массивом' }
    }
    
    for (const objective of data.learningObjectives) {
      if (!isString(objective)) {
        return { valid: false, error: 'Каждая цель обучения должна быть строкой' }
      }
    }
    
    result.learningObjectives = data.learningObjectives as string[]
  }
  
  if (data.difficultyScore !== undefined) {
    if (!isNumber(data.difficultyScore) || data.difficultyScore < 1 || data.difficultyScore > 10) {
      return { valid: false, error: 'Оценка сложности должна быть числом от 1 до 10' }
    }
    result.difficultyScore = Math.floor(data.difficultyScore)
  }
  
  if (data.estimatedTime !== undefined) {
    if (!isNumber(data.estimatedTime) || data.estimatedTime <= 0) {
      return { valid: false, error: 'Оценочное время должно быть положительным числом' }
    }
    result.estimatedTime = Math.floor(data.estimatedTime)
  }
  
  if (data.instructor !== undefined) {
    if (!isString(data.instructor)) {
      return { valid: false, error: 'Инструктор должен быть строкой' }
    }
    result.instructor = data.instructor.trim()
  }
  
  return { valid: true, value: result }
}

// Вспомогательная функция для создания ответа с ошибкой валидации
export const createValidationErrorResponse = (error: string, field?: string) => {
  return {
    success: false,
    error: `Ошибка валидации${field ? ` поля ${field}` : ''}: ${error}`,
    code: 'VALIDATION_ERROR'
  }
}

