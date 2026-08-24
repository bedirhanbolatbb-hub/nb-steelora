import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import {
  adminNewOrderEmail,
  adminNewReviewEmail,
  adminOrderRequestEmail,
  orderConfirmationEmail,
  reviewInviteEmail,
  shippingNotificationEmail,
} from '@/lib/emails/templates'
import { sendMail } from '@/lib/emails/send'

/**
 * Admin korumalı gönderim testi: üç müşteri mailini de gerçek şablonlarıyla
 * belirtilen adrese yollar ve Resend mesaj id'lerini döner.
 * Yapılandırma (alan doğrulaması, API anahtarı) değiştikçe tekrar koşulabilir.
 * Müşteri siparişlerine dokunmaz; sipariş verisi verilmezse örnek veri kullanır.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const to = String(body?.to ?? '').trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json({ error: 'Geçerli bir alıcı adresi verin' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: products } = await supabase
    .from('products_display')
    .select('slug, display_title, display_images')
    .limit(2)

  const sampleProducts = (products ?? []).map((p: any) => ({
    slug: p.slug,
    display_title: p.display_title,
    image: (p.display_images as string[] | null)?.[0] ?? null,
  }))

  const order = {
    order_number: 'NBS-TEST-MAIL',
    items: sampleProducts.map((p) => ({ name: p.display_title, price: 499.9, quantity: 1 })),
    total: 999.8,
    shipping_cost: 0,
    shipping_address: { full_name: 'Test Alıcı', address: 'Test Adres 1', city: 'İstanbul' },
  }

  const confirmation = orderConfirmationEmail(order)
  const shipping = shippingNotificationEmail(order, 'TEST123456789')
  const invite = reviewInviteEmail(order, sampleProducts)

  // Faz 29: YÖNETİCİ bildirimleri de sınanabiliyor. İlk gerçek siparişte
  // bildirim gitmemişti ve bunu önceden yakalayacak bir kontrol yoktu.
  const yalnizYonetici = body?.kapsam === 'yonetici'
  const yeniSiparis = adminNewOrderEmail(order)
  const iadeTalebi = adminOrderRequestEmail(order, 'return', 'Test iade gerekçesi')
  const yeniYorum = adminNewReviewEmail({
    urun: sampleProducts[0]?.display_title ?? 'Örnek ürün',
    puan: 5,
    govde: 'Test yorum metni.',
    yazar: 'Test Müşteri',
  })

  const results: Record<string, unknown> = {
    adminYeniSiparis: await sendMail({ to, ...yeniSiparis, label: 'Admin new order (test)' }),
    adminIadeTalebi: await sendMail({ to, ...iadeTalebi, label: 'Admin return request (test)' }),
    adminYeniYorum: await sendMail({ to, ...yeniYorum, label: 'Admin new review (test)' }),
  }

  if (!yalnizYonetici) {
    results.confirmation = await sendMail({ to, ...confirmation, label: 'Order confirmation (test)' })
    results.shipping = await sendMail({ to, ...shipping, label: 'Shipping notification (test)' })
    results.reviewInvite = await sendMail({ to, ...invite, label: 'Review invite (test)' })
  }

  return NextResponse.json({ to, results })
}
