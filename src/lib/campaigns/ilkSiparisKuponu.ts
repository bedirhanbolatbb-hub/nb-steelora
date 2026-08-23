import { createServiceClient } from '@/lib/supabase/service'
import { kampanyalariYukle } from './yukle'
import { vitrinIndirimiGetir } from './vitrinIndirimi'
import { ILK_SIPARIS_ANAHTARLARI, ilkSiparisMetni } from './ilkSiparisMetinleri'

export { ILK_SIPARIS_ANAHTARLARI } from './ilkSiparisMetinleri'

/**
 * İlk sipariş kuponu duyurusu (Faz 19).
 *
 * Ölçüm: HOSGELDIN10 sitede HİÇBİR YERDE yazmıyordu. Navbar'daki kupon
 * hatırlatması `type='discount_code'` satırlarından EN YENİSİNİ alıyor; en
 * yeni satır "İkinci Sipariş Kuponu" ve onun `code`'u null olduğu için
 * hatırlatma hiç basılmıyordu. NB30 bitince geriye kalan tek kaldıraç,
 * müşterinin varlığından haberdar olmadığı bir koddu.
 *
 * ÇAKIŞMA KURALI: duyuru YALNIZ otomatik bir vitrin kampanyası yokken
 * görünür. "Sepette %30" ile "kodla %10"u yan yana göstermek müşteriyi
 * daha kötü olanı seçmeye davet etmek olurdu — üstelik ikisi birleşmiyor,
 * motor zaten en yükseğini uyguluyor. Tek kaynak `vitrinIndirimiGetir()`:
 * o ne zaman null dönerse duyuru o zaman açılır.
 *
 * METİNLER site_content'ten düzenlenir; `{kod}` ve `{oran}` yer tutucuları
 * gerçek kampanya değerleriyle doldurulur — panelde yanlış oran yazıp
 * vitrinle çelişme ihtimali böylece ortadan kalkıyor.
 */

export type IlkSiparisDuyurusu = {
  kod: string
  oran: number
  /** Navbar duyuru şeridi */
  serit: string
  /** Sepet ve ödeme adımında kupon kutusunun altı */
  sepet: string
  /** Bülten aboneliği sonrası teşekkür mesajı */
  bulten: string
}

/**
 * Duyuru metinleri — kampanya yürürlükte değilse ya da otomatik bir vitrin
 * kampanyası varsa `null`.
 *
 * @param simdi Yalnız simülasyon için; üretimde geçilmez.
 * @param icerik site_content zaten okunmuşsa (layoutData) tekrar sorgulanmaz.
 */
export async function ilkSiparisDuyurusu(
  simdi?: Date,
  icerik?: Record<string, string>
): Promise<IlkSiparisDuyurusu | null> {
  try {
    // 1) Otomatik kampanya varsa duyuru KAPALI — ikisi çakışmasın.
    const vitrin = await vitrinIndirimiGetir(simdi)
    if (vitrin) return null

    const supabase = createServiceClient()

    let metinler = icerik
    if (!metinler) {
      const { data } = await supabase.from('site_content').select('key, value')
      metinler = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value ?? '']))
    }

    // Kod alanında yer tutucu yok; oran henüz bilinmiyor, 0 geçiliyor.
    const kod = ilkSiparisMetni(ILK_SIPARIS_ANAHTARLARI.kod, metinler, '', 0)
      .trim()
      .toLocaleUpperCase('tr-TR')
    if (!kod) return null

    // 2) Kod gerçekten yürürlükte mi? Bitmiş ya da kapatılmış bir kampanyayı
    //    duyurmak, müşteriye çalışmayan bir kod vaat etmek olurdu.
    //    HesapKampanyasi kodu taşımıyor (kodaGoreBul ayrı bir harita istiyor),
    //    bu yüzden kod DB'den çözülüp yürürlük listesinde ARANIYOR.
    const { data: satir } = await supabase
      .from('campaigns')
      .select('id, discount_value, discount_type')
      .eq('is_active', true)
      .ilike('code', kod)
      .maybeSingle()
    if (!satir) return null

    const { kodlular } = await kampanyalariYukle(supabase, simdi)
    if (!kodlular.some((k) => k.id === satir.id)) return null

    // Yalnız yüzde indirimler duyurulur: sabit tutarlı bir kuponu "%X" diye
    // yazmak yanlış olurdu, metin şablonu da orana göre kurulu.
    if (satir.discount_type !== 'percent') return null
    const oran = Number(satir.discount_value) || 0

    if (oran <= 0) return null

    return {
      kod,
      oran,
      serit: ilkSiparisMetni(ILK_SIPARIS_ANAHTARLARI.serit, metinler, kod, oran),
      sepet: ilkSiparisMetni(ILK_SIPARIS_ANAHTARLARI.sepet, metinler, kod, oran),
      bulten: ilkSiparisMetni(ILK_SIPARIS_ANAHTARLARI.bulten, metinler, kod, oran),
    }
  } catch {
    // Duyuru üretilemezse vitrin sessizce eski hâlinde kalır.
    return null
  }
}
