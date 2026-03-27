import { NextResponse } from 'next/server'

export async function POST() {
  // TODO: Webhook handler
  return NextResponse.json({ message: 'Webhook endpoint - yakında aktif olacak' })
}
