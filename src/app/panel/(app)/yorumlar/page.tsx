import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import YorumlarClient, { type YorumSatiri } from './YorumlarClient'

export const metadata: Metadata = { title: 'Yorumlar' }
export const dynamic = 'force-dynamic'

/** E-posta maskesi: ka****@ornek.com */
function maskele(email: string | null): string {
  if (!email) return '—'
  const [ad, alan] = email.split('@')
  if (!alan) return email
  return `${ad.slice(0, 2)}****@${alan}`
}

export default async function PanelYorumlarPage() {
  const supabase = createServiceClient()

  // photo_url kolonu DDL'i BB çalıştırana kadar var olmayabilir — kolonlu
  // seçim hata verirse kolonsuz tekrar denenir, ekran kırılmaz (Faz 11D).
  const SECIM_TABANI =
    'id, product_id, guest_name, guest_email, rating, title, body, is_approved, is_verified_purchase, created_at, products(slug, override_title, trendyol_title, override_images, trendyol_images)'
  let data: any[] | null = (
    await supabase
      .from('reviews')
      .select(`${SECIM_TABANI}, photo_url`)
      .order('created_at', { ascending: false })
      .limit(300)
  ).data
  if (!data) {
    data = (
      await supabase
        .from('reviews')
        .select(SECIM_TABANI)
        .order('created_at', { ascending: false })
        .limit(300)
    ).data
  }

  const satirlar: YorumSatiri[] = (data || []).map((r: any) => {
    const p = r.products
    return {
      id: r.id,
      urunAd: p ? p.override_title || p.trendyol_title : '(silinmiş ürün)',
      urunSlug: p?.slug ?? null,
      urunGorsel:
        (p?.override_images as string[] | null)?.[0] ??
        (p?.trendyol_images as string[] | null)?.[0] ??
        null,
      puan: r.rating ?? 0,
      foto: (r as any).photo_url ?? null,
      baslik: r.title,
      metin: r.body ?? '',
      gonderen: r.guest_name ?? '—',
      email: maskele(r.guest_email),
      dogrulanmis: Boolean(r.is_verified_purchase),
      onayli: Boolean(r.is_approved),
      tarih: r.created_at,
    }
  })

  return <YorumlarClient satirlar={satirlar} />
}
