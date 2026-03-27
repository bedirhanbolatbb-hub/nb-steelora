import { NextResponse } from 'next/server'

export async function POST() {
  // TODO: Trendyol sync logic
  return NextResponse.json({ message: 'Sync endpoint - yakında aktif olacak' })
}
