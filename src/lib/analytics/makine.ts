/**
 * Makine trafiğinin ayıklanması (Faz 32).
 *
 * ── Neden gerekti ──
 * 18 Ağustos – 13 Eylül arası 20.187 hareketin 13.607'si TEK bir oturumdan
 * geldi: 91 dakikada 485 farklı sayfa, her biri ortalama 14 kez. Dört benzer
 * oturum birlikte tüm trafiğin %75'ini oluşturuyordu. Panel bunları dört
 * "ziyaretçi" sayıyor, ama sayfa görüntüleme, ürün sıralaması, saat yoğunluğu
 * ve cihaz kırılımı tamamen onların eseri oluyordu — cihaz dağılımının
 * %92 masaüstü çıkması da bundandı.
 *
 * Tarayıcı adına bakan süzgeç (track.ts → botMu) bunları yakalayamaz: kendini
 * gerçek bir tarayıcı gibi tanıtan tarama araçları user-agent kalıbına uymaz.
 * O yüzden kimliğe değil DAVRANIŞA bakılır.
 *
 * ── Ölçüt ──
 * Bir oturum şu iki durumdan birinde makine sayılır:
 *   1. Gün içinde 80'den fazla FARKLI sayfa gezmişse. (İnsan gezinmesinde
 *      bu sayı tek hanelerde kalır; gerçek verideki en yoğun insan oturumu
 *      26 farklı sayfa.)
 *   2. En az 30 hareket yapmış VE dakikada 10'dan fazla hareket üretmişse.
 *      (Gerçek veride 1,4 dakikada 267 hareket üreten bir oturum var —
 *      dakikada 190. İnsanda bu oran 2-3'ü geçmez.)
 *
 * Eşikler gerçek veriye bakılarak seçildi ve İNSAN oturumlarını dışarıda
 * bırakmayacak kadar geniş: ölçülen en yoğun gerçek oturum (26 sayfa,
 * dakikada 0,25 hareket) ikisine de takılmıyor.
 *
 * ── Ne yapılır ──
 * Satır SİLİNMEZ. Rapor ve gecelik özet bu oturumları hesaba katmaz, panelde
 * "ayıklanan makine trafiği" olarak ayrıca gösterilir. Böylece geçmiş günler
 * de düzelir ve karar verilirken elde hep ham kayıt kalır.
 */

/** Bir oturumun tek satırlık davranış izi. */
export type OturumIzi = {
  /** Oturumdaki toplam hareket. */
  olay: number
  /** Gezilen FARKLI sayfa sayısı. */
  tekilYol: number
  /** İlk hareketin zamanı (ms). */
  ilk: number
  /** Son hareketin zamanı (ms). */
  son: number
}

export const MAKINE_ESIGI = {
  /** Bu kadar farklı sayfa gezen oturum makinedir. */
  tekilYol: 80,
  /** Hız ölçütünün devreye girmesi için gereken en az hareket. */
  olay: 30,
  /** Dakikada bu kadar hareket üreten oturum makinedir. */
  dakikadaOlay: 10,
} as const

export function makineMi(iz: OturumIzi): boolean {
  if (iz.tekilYol >= MAKINE_ESIGI.tekilYol) return true
  if (iz.olay < MAKINE_ESIGI.olay) return false
  // Süre sıfıra yakınsa (aynı saniyede yağan istekler) hız tanım gereği çok
  // yüksektir; en az bir saniye sayarak sonsuza bölmeyi engelliyoruz.
  const dakika = Math.max((iz.son - iz.ilk) / 60000, 1 / 60)
  return iz.olay / dakika >= MAKINE_ESIGI.dakikadaOlay
}

type OlayBenzeri = { session_id: string; path: string | null; occurred_at: string }

/** Olay listesinden oturum izlerini çıkarır. */
export function izleriCikar<T extends OlayBenzeri>(
  olaylar: T[]
): Map<string, OturumIzi & { yollar: Set<string> }> {
  const izler = new Map<string, OturumIzi & { yollar: Set<string> }>()
  for (const o of olaylar) {
    let iz = izler.get(o.session_id)
    if (!iz) {
      iz = { olay: 0, tekilYol: 0, ilk: Infinity, son: -Infinity, yollar: new Set() }
      izler.set(o.session_id, iz)
    }
    iz.olay++
    if (o.path) iz.yollar.add(o.path)
    const t = new Date(o.occurred_at).getTime()
    if (t < iz.ilk) iz.ilk = t
    if (t > iz.son) iz.son = t
  }
  for (const iz of izler.values()) iz.tekilYol = iz.yollar.size
  return izler
}

export type Ayiklama = {
  /** Makine sayılan oturum kimlikleri. */
  makineOturumlar: Set<string>
  /** Kaç oturum ayıklandı. */
  oturum: number
  /** Ayıklanan oturumların taşıdığı toplam hareket. */
  olay: number
}

/** Olay listesindeki makine oturumlarını bulur. */
export function makineleriBul<T extends OlayBenzeri>(olaylar: T[]): Ayiklama {
  const izler = izleriCikar(olaylar)
  const makineOturumlar = new Set<string>()
  let olay = 0
  for (const [id, iz] of izler) {
    if (makineMi(iz)) {
      makineOturumlar.add(id)
      olay += iz.olay
    }
  }
  return { makineOturumlar, oturum: makineOturumlar.size, olay }
}
