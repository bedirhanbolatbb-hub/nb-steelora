import { NextResponse } from 'next/server'

/**
 * Faz 27: bu uç kimlik doğrulaması olmadan HER POST'a 200 dönüyordu ve
 * hiçbir şey yapmıyordu. "Çalışıyor" görünen ölü bir uç, hem tarayıcılara
 * geçerli bir hedef gibi görünür hem de ileride yanlışlıkla bir şeye
 * bağlanabilir. Gerçek kargo webhook'u /api/webhooks/carrier/[provider]
 * altında ve HMAC imzasıyla korunuyor.
 */
export async function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
