import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    response.cookies.delete('refresh-token')
    
    return response
  } catch (error) {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
    
    response.cookies.delete('refresh-token')
    return response
  }
}