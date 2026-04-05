import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const htmlContent = formData.get('htmlContent') as string | null

  if (!htmlContent) {
    return new NextResponse('Missing htmlContent', { status: 400 })
  }

  const html = Buffer.from(htmlContent, 'base64').toString('utf-8')

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
