import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { ipfsService } from '@/lib/storage/ipfs.service'

// POST /api/jobs/portfolio/upload - upload portfolio asset (image/pdf)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ success: false, error: 'Файл не найден' }, { status: 400 })

    // Reuse IPFS service, returns data URL as gateway fallback
    const result = await ipfsService.uploadImage(file)

    return NextResponse.json({ success: true, data: { url: result.gatewayUrl, cid: result.cid } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Ошибка загрузки файла' }, { status: 500 })
  }
})
