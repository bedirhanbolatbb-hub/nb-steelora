import { createServiceClient } from '@/lib/supabase/service'
import { getCarrierProvider } from './providers'

/**
 * Sipariş adresindeki il/ilçe METNİNİ sağlayıcının kimliklerine eşler.
 *
 * Liste sağlayıcıdan çekilip carrier_regions tablosunda önbelleklenir. Eşleşme
 * bulunamazsa hata fırlatılmaz; `eslesti: false` dönülür ve panel manuel seçim
 * ister — adres sessizce yanlış ilçeye gönderilmez.
 */

/** Türkçe karakterleri sadeleştirip karşılaştırma anahtarı üretir. */
export function adAnahtari(metin: string): string {
  return (metin || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıîöşüâ]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', î: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a' })[c] || c)
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

export type Bolge = { providerId: number; ad: string }

/**
 * İl listesini senkronlar (tek istek — hızlı).
 *
 * İlçeler burada çekilmez: 81 il için ardışık /cities çağrısı hem sağlayıcının
 * hız sınırına takılıyor hem de sunucu fonksiyonu süresini aşıyordu (Faz 10B).
 * İlçeler ihtiyaç anında, il bazında `ilceleriSenkronla` ile getirilir.
 */
export async function bolgeleriSenkronla(): Promise<{ il: number; ilce: number }> {
  const saglayici = getCarrierProvider() as any
  if (typeof saglayici.getStates !== 'function') return { il: 0, ilce: 0 }

  const supabase = createServiceClient()
  const iller: Bolge[] = (await saglayici.getStates()).map((s: any) => ({ providerId: s.id, ad: s.ad }))
  if (iller.length === 0) return { il: 0, ilce: 0 }

  const satirlar = iller.map((i) => ({
    provider: saglayici.slug,
    kind: 'state',
    provider_id: i.providerId,
    name: i.ad,
    name_key: adAnahtari(i.ad),
    parent_provider_id: null,
    synced_at: new Date().toISOString(),
  }))

  await supabase.from('carrier_regions').upsert(satirlar, { onConflict: 'provider,kind,provider_id' })
  return { il: iller.length, ilce: 0 }
}

/** Tek bir ilin ilçelerini sağlayıcıdan çekip önbelleğe yazar. */
export async function ilceleriSenkronla(stateId: number): Promise<number> {
  const saglayici = getCarrierProvider() as any
  if (typeof saglayici.getCities !== 'function') return 0

  const ilceler: Bolge[] = (await saglayici.getCities(stateId)).map((c: any) => ({
    providerId: c.id,
    ad: c.ad,
  }))
  if (ilceler.length === 0) return 0

  const supabase = createServiceClient()
  await supabase.from('carrier_regions').upsert(
    ilceler.map((c) => ({
      provider: saglayici.slug,
      kind: 'city',
      provider_id: c.providerId,
      name: c.ad,
      name_key: adAnahtari(c.ad),
      parent_provider_id: stateId,
      synced_at: new Date().toISOString(),
    })),
    { onConflict: 'provider,kind,provider_id' }
  )
  return ilceler.length
}

export type EslesmeSonuc = {
  eslesti: boolean
  stateId: number | null
  cityId: number | null
  ilAdi: string | null
  ilceAdi: string | null
  /** Panelde manuel seçim gerekirse gösterilecek sebep. */
  neden: string | null
}

/** Adres metnindeki il/ilçeyi sağlayıcı kimliklerine çevirir. */
export async function bolgeEslestir(il: string, ilce: string): Promise<EslesmeSonuc> {
  const supabase = createServiceClient()
  const saglayici = getCarrierProvider()

  const bos = (neden: string): EslesmeSonuc => ({
    eslesti: false,
    stateId: null,
    cityId: null,
    ilAdi: null,
    ilceAdi: null,
    neden,
  })

  const ilKey = adAnahtari(il)
  if (!ilKey) return bos('Sipariş adresinde il bilgisi yok')

  const { data: ilSatir } = await supabase
    .from('carrier_regions')
    .select('provider_id, name')
    .eq('provider', saglayici.slug)
    .eq('kind', 'state')
    .eq('name_key', ilKey)
    .maybeSingle()

  if (!ilSatir) {
    return bos(`"${il}" ili sağlayıcı listesinde bulunamadı — manuel seçim gerekiyor`)
  }

  const ilceKey = adAnahtari(ilce)
  // İlin ilçeleri henüz önbellekte yoksa yalnız o il için çekilir (tembel).
  if (ilceKey) {
    const { count } = await supabase
      .from('carrier_regions')
      .select('id', { count: 'exact', head: true })
      .eq('provider', saglayici.slug)
      .eq('kind', 'city')
      .eq('parent_provider_id', ilSatir.provider_id)
    if (!count) await ilceleriSenkronla(ilSatir.provider_id).catch(() => 0)
  }

  const { data: ilceSatir } = ilceKey
    ? await supabase
        .from('carrier_regions')
        .select('provider_id, name')
        .eq('provider', saglayici.slug)
        .eq('kind', 'city')
        .eq('parent_provider_id', ilSatir.provider_id)
        .eq('name_key', ilceKey)
        .maybeSingle()
    : { data: null }

  if (!ilceSatir) {
    return {
      eslesti: false,
      stateId: ilSatir.provider_id,
      cityId: null,
      ilAdi: ilSatir.name,
      ilceAdi: null,
      neden: ilceKey
        ? `"${ilce}" ilçesi ${ilSatir.name} altında bulunamadı — manuel seçim gerekiyor`
        : 'Sipariş adresinde ilçe bilgisi yok — manuel seçim gerekiyor',
    }
  }

  return {
    eslesti: true,
    stateId: ilSatir.provider_id,
    cityId: ilceSatir.provider_id,
    ilAdi: ilSatir.name,
    ilceAdi: ilceSatir.name,
    neden: null,
  }
}

/** Panel seçicileri için liste okuma. */
export async function illeriGetir(): Promise<Bolge[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('carrier_regions')
    .select('provider_id, name')
    .eq('provider', getCarrierProvider().slug)
    .eq('kind', 'state')
    .order('name')
  return (data || []).map((r: any) => ({ providerId: r.provider_id, ad: r.name }))
}

export async function ilceleriGetir(stateId: number): Promise<Bolge[]> {
  const supabase = createServiceClient()
  const oku = async () => {
    const { data } = await supabase
      .from('carrier_regions')
      .select('provider_id, name')
      .eq('provider', getCarrierProvider().slug)
      .eq('kind', 'city')
      .eq('parent_provider_id', stateId)
      .order('name')
    return (data || []).map((r: any) => ({ providerId: r.provider_id, ad: r.name }))
  }
  let liste = await oku()
  if (liste.length === 0) {
    await ilceleriSenkronla(stateId).catch(() => 0)
    liste = await oku()
  }
  return liste
}
