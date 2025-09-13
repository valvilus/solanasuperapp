import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/users - получить информацию о пользователе
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        isPremium: true,
        photoUrl: true,
        walletAddress: true,
        createdAt: true,
        lastLoginAt: true
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
})

// POST /api/users - обновить профиль пользователя
export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const body = await request.json()
    const { username, firstName, lastName, walletAddress } = body

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        username,
        firstName,
        lastName,
        walletAddress
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        isPremium: true,
        photoUrl: true,
        walletAddress: true
      }
    })
    
    return NextResponse.json({ 
      success: true,
      user: updatedUser
    })
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка обновления профиля' }, { status: 500 })
  }
})
