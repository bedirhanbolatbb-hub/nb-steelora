import { createServiceClient } from '@/lib/supabase/service'
import { kampanyalariYukle } from './yukle'
import { kartFiyatiGosterilsinMi, kosulRozeti, type HesapKampanyasi } from './hesap'
import { vitrinHedefi, vitrinMetni } from './vitrinMetni'
import { CATEGORIES } from '@/lib/catalog/categories'

/** Kategori slug'ı → menüdeki başlık ("kupe" → "Küpe"). */
const kategoriAdi = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.title

export type VitrinIndirimi = {
  /** Kampanya kimliği — besleme, geçerlilik tarihini bununla okur. */
  id: string
  ad: string
  /** Yalnız koşulsuz kampanyada dolu: kartta indirimli fiyat bununla hesaplanır. */
  oran: number | null
  /** Koşullu kampanyada kartta yalnız bu rozet basılır ("500₺ üzeri %30"). */
  rozet: string | null
  /** Kartta üstü çizili fiyat + indirimli fiyat gösterilecek mi? */
  fiyatGoster: boolean
  /**
   * Vitrin bandına basılacak MÜŞTERİ metni (Faz 20 acil düzeltme).
   * Panel adı DEĞİL: bant "İKİNCİ SİPARİŞ KUPONU" yazıyordu. Boşsa bant
   * hiç basılmaz.
   */
  metin: string
  /** Bandın tıklama hedefi — kapsamı olan kampanyada ilgili sayfa. */
  hedef: string
  /** "… tarihine kadar" satırı için. */
  bitis: string | null
  /**
   * Kampanyanın yürürlüğe girdiği an (Faz 11F).
   * Ürün yapısal verisinde `offers.validFrom` bundan türer: indirimli fiyat
   * bu tarihte geçerli oldu. Kampanyanın başlangıcı yoksa null.
   */
  baslangic: string | null
}

/**
 * Vitrinde gösterilecek otomatik sepet indirimi (Faz 15).
 *
 * BB tüm ürünlerde %30 kampanya tanımladı ama vitrinde bunun izi yoktu:
 * müşteri indirimi ancak ödeme adımında görüyordu. Burada, sepet alt sınırı
 * OLMAYAN (yani her sepette geçerli) yüzde tipi otomatik kampanyanın oranı
 * okunur; kart ve ürün sayfası üstü çizili fiyatı buna göre basar.
 *
 * Alt sınırı olan kampanyalar dışarıda bırakılır — "her üründe %30" demek
 * yanıltıcı olurdu. Tutarın kendisi yine tek motordan (pricing.ts) hesaplanır;
 * burası yalnız görsel işaret üretir.
 */
export async function vitrinIndirimiGetir(simdi?: Date): Promise<VitrinIndirimi | null> {
  try {
    const supabase = createServiceClient()
    // `simdi` yalnız simülasyon içindir: bir kampanyanın bitişinden sonra
    // vitrinin ne göstereceğini CANLI VERİYE DOKUNMADAN ölçebilmek için
    // (bkz. __testler__/kampanyaBitisi.sim.mts). Üretimde hiç geçilmez.
    const { otomatikler } = await kampanyalariYukle(supabase, simdi)
    if (otomatikler.length === 0) return null

    // Koşulsuz kampanyalar öncelikli: kartta gerçek fiyat gösterilebilen tek
    // grup onlar. Yoksa koşullu kampanyalardan biri rozet olarak basılır.
    const kosulsuz = otomatikler
      .filter((k) => kartFiyatiGosterilsinMi(k))
      .sort((a, b) => (Number(b.deger) || 0) - (Number(a.deger) || 0))[0]

    // Banda basılacak metin kampanyanın kendi `banner_text` alanından gelir;
    // yoksa tip+değer+kapsamdan üretilir. Panel adına ASLA düşülmez.
    const suslu = async (k: HesapKampanyasi) => {
      const { data } = await supabase
        .from('campaigns')
        .select('banner_text, ends_at, starts_at')
        .eq('id', k.id)
        .maybeSingle()
      return {
        metin: vitrinMetni(k, data?.banner_text, kategoriAdi),
        hedef: vitrinHedefi(k),
        bitis: data?.ends_at ?? null,
        baslangic: data?.starts_at ?? null,
      }
    }

    if (kosulsuz) {
      return {
        id: kosulsuz.id,
        ad: kosulsuz.ad,
        oran: Number(kosulsuz.deger) || null,
        rozet: null,
        fiyatGoster: true,
        ...(await suslu(kosulsuz)),
      }
    }

    for (const k of otomatikler) {
      const rozet = kosulRozeti(k)
      if (rozet) return { id: k.id, ad: k.ad, oran: null, rozet, fiyatGoster: false, ...(await suslu(k)) }
    }
    return null
  } catch {
    return null
  }
}
