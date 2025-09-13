import { NextRequest, NextResponse } from 'next/server'

// Minimal webhook to respond to /start with a fixed message
export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    const message = update.message || update.edited_message
    const text: string = message?.text || ''

    if (text.startsWith('/start')) {
      // Welcome message removed as per requirements
      return NextResponse.json({
        success: true,
        action: 'no_message'
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 200 })
  }
}







