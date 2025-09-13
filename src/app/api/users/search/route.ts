/**
 * User Search API Route
 * Поиск авторизованных пользователей по username для отправки токенов
 */

import { NextRequest, NextResponse } from 'next/server'
import { repositories, prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { AuthErrorCode } from '@/types/auth'

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

// GET /api/users/search?q=username
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    // Получаем поисковый запрос
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
        message: 'Минимум 2 символа для поиска'
      })
    }

    const searchQuery = query.trim()
    console.log(' User search query:', { query: searchQuery })

    // Поиск в базе данных
    const registeredUsers = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          {
            firstName: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          {
            lastName: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        isPremium: true,
        walletAddress: true,
        createdAt: true
      },
      take: 10, // Ограничиваем результаты
      orderBy: [
        { username: 'asc' },
        { firstName: 'asc' }
      ]
    })

    // Преобразуем результаты
    const searchResults = registeredUsers.map(user => ({
      id: user.id,
      username: user.username || '',
      firstName: user.firstName,
      lastName: user.lastName || undefined,
      photoUrl: user.photoUrl || undefined,
      isPremium: user.isPremium,
      walletAddress: user.walletAddress || undefined,
      isRegistered: true,
      registeredAt: user.createdAt.toISOString()
    }))

    // Если найдены пользователи или поиск точно по username
    const exactUsernameMatch = searchResults.find(user => 
      user.username.toLowerCase() === searchQuery.toLowerCase()
    )

    // Если точного совпадения нет, добавляем "потенциального" пользователя
    if (!exactUsernameMatch && searchQuery.match(/^[a-zA-Z0-9_]+$/)) {
      searchResults.unshift({
        id: `pending:${searchQuery}`,
        username: searchQuery,
        firstName: 'Пользователь не найден',
        lastName: '',
        photoUrl: '',
        isPremium: false,
        walletAddress: '',
        isRegistered: false,
        registeredAt: new Date().toISOString()
      } as any)
    }

    console.log(' User search completed:', {
      query: searchQuery,
      found: registeredUsers.length,
      totalResults: searchResults.length
    })

    return NextResponse.json({
      success: true,
      users: searchResults,
      query: searchQuery,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' User search error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка поиска пользователей',
        code: AuthErrorCode.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

// POST /api/users/search - Расширенный поиск с фильтрами
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    // Получаем параметры поиска
    const body = await request.json()
    const { 
      query,
      includeUnregistered = true,
      premiumOnly = false,
      hasWallet = false,
      limit = 10 
    } = body

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
        message: 'Минимум 2 символа для поиска'
      })
    }

    const searchQuery = query.trim()



    // Поиск в базе данных через Repository
    const searchResult = await repositories.users.search(
      {
        query: searchQuery,
        hasWallet,
        isPremium: premiumOnly ? true : undefined
      },
      {
        limit,
        sortBy: 'lastLoginAt',
        sortOrder: 'desc'
      }
    )
    
    const registeredUsers = searchResult.data

    // Преобразуем результаты
    const searchResults: UserSearchResult[] = registeredUsers.map(user => ({
      id: user.id,
      username: user.username || '',
      firstName: user.firstName,
      lastName: user.lastName || undefined,
      photoUrl: user.photoUrl || undefined,
      isPremium: user.isPremium,
      walletAddress: user.walletAddress || undefined,
      isRegistered: true,
      registeredAt: user.createdAt.toISOString()
    }))

    // Добавляем потенциального пользователя если нужно
    if (includeUnregistered && searchQuery.match(/^[a-zA-Z0-9_]+$/)) {
      const exactMatch = searchResults.find(user => 
        user.username.toLowerCase() === searchQuery.toLowerCase()
      )

      if (!exactMatch) {
        searchResults.unshift({
          id: `pending:${searchQuery}`,
          username: searchQuery,
          firstName: 'Пользователь не зарегистрирован',
          lastName: undefined,
          photoUrl: undefined,
          isPremium: false,
          walletAddress: undefined,
          isRegistered: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      users: searchResults,
      query: searchQuery,
      filters: {
        includeUnregistered,
        premiumOnly,
        hasWallet,
        limit
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error(' Advanced user search error:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка расширенного поиска',
        code: AuthErrorCode.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})
