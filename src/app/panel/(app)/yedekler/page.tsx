import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import YedeklerClient, { type YedekSatiri } from './YedeklerClient'

export const metadata: Metadata = { title: 'Yedekler' }
export const dynamic = 'force-dynamic'

const BUCKET = 'backups'
/** İndirme bağlantısı ömrü — kişisel veri taşıdığı için kısa. */
const IMZA_SURESI_SN = 60 * 30

export default async function PanelYedeklerPage() {
  const supabase = createServiceClient()

  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 100,
    sortBy: { column: 'name', order: 'desc' },
  })

  const dosyalar = (data ?? []).filter((d: any) => d.name.endsWith('.json.gz'))

  // İndirme bağlantıları İMZALI üretilir: bucket private, doğrudan URL çalışmaz.
  // Süre kısa tutuluyor — dosyada e-posta, adres ve T.C. kimlik numarası var,
  // panelden kopyalanan bir bağlantının süresiz yaşaması istenmez.
  let imzalar: Record<string, string> = {}
  if (dosyalar.length > 0) {
    const { data: imzaData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(dosyalar.map((d: any) => d.name), IMZA_SURESI_SN)
    for (const i of imzaData ?? []) {
      if (i.path && i.signedUrl) imzalar[i.path] = i.signedUrl
    }
  }

  const satirlar: YedekSatiri[] = dosyalar.map((d: any) => ({
    ad: d.name,
    boyut: Number(d.metadata?.size ?? 0),
    tarih: d.created_at ?? d.updated_at ?? null,
    indirmeUrl: imzalar[d.name] ?? null,
  }))

  return (
    <YedeklerClient
      satirlar={satirlar}
      hata={error?.message ?? null}
      imzaDakika={Math.round(IMZA_SURESI_SN / 60)}
    />
  )
}
