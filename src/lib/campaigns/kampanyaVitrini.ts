/**
 * Site geneli indirimin ilk ekranda ve duyuru şeridinde nasıl yazılacağı
 * (Kasım 2026).
 *
 * BB isteği: "kampanya ana sayfada ilk açılan ekranda net bir şekilde
 * görünsün; müşteri girince hemen alışveriş yapma isteği oluşsun."
 *
 * Yalnız KOŞULSUZ, tüm ürünlerde geçerli yüzde indirim için metin üretir
 * (kartlarda üstü çizili fiyat basılan tek kampanya türü). Koşullu
 * kampanyalarda "%X" büyük yazılmaz — tek ürün alan o fiyata ulaşamaz.
 *
 * MEVZUAT: indirimli satış reklamında başlangıç ve bitiş tarihi yazılmak
 * zorunda (Ticaret Bakanlığı, 2025 kılavuz uyarısı ve 1 Ağustos 2026
 * yönetmelik değişikliği). Tarih aralığı bu yüzden metnin parçası; kampanya
 * kaydında tarih yoksa ilk ekran vurgusu hiç basılmaz.
 *
 * Marka sesi: ünlem, emoji, "kaçırmayın" yok; "siz" dili.
 *
 * Saf modül (alias import yok): panel önizlemesi, vitrin ve testler aynı
 * metni üretir.
 */

export type SiteGeneliIndirim = {
  oran: number | null
  fiyatGoster: boolean
  baslangic: string | null
  bitis: string | null
  hedef?: string | null
}

const TZ = 'Europe/Istanbul'

function gunAy(d: Date): { gun: number; ay: string; yil: number } {
  const parcalar = new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(d)
  const al = (t: string) => parcalar.find((p) => p.type === t)?.value ?? ''
  return { gun: Number(al('day')), ay: al('month'), yil: Number(al('year')) }
}

/** Ay adının baş harfi büyük: "kasım" → "Kasım". */
function buyukBaslat(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : s
}

/**
 * "11–30 Kasım" · "28 Ekim – 3 Kasım" · tek gün "11 Kasım". İstanbul saatiyle.
 * Bitiş tam gece yarısıysa (00.00) bir önceki gün sayılır: "1 Aralık 00.00'a
 * kadar" müşteri için "30 Kasım'a kadar"dır.
 */
export function tarihAraligi(baslangic: string | Date | null, bitis: string | Date | null): string | null {
  if (!baslangic || !bitis) return null
  const b = new Date(baslangic)
  let e = new Date(bitis)
  if (!Number.isFinite(b.getTime()) || !Number.isFinite(e.getTime())) return null
  const yerelSaat = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(e)
  if (yerelSaat === '00:00' && e.getTime() - b.getTime() > 60_000) e = new Date(e.getTime() - 60_000)

  const x = gunAy(b)
  const y = gunAy(e)
  const ayX = buyukBaslat(x.ay)
  const ayY = buyukBaslat(y.ay)
  if (x.yil === y.yil && x.ay === y.ay) {
    return x.gun === y.gun ? `${x.gun} ${ayX}` : `${x.gun}–${y.gun} ${ayX}`
  }
  const yilFarki = x.yil !== y.yil
  return `${x.gun} ${ayX}${yilFarki ? ` ${x.yil}` : ''} – ${y.gun} ${ayY}${yilFarki ? ` ${y.yil}` : ''}`
}

/** Kampanya tek bir takvim ayının içindeyse o ayın adı ("Kasım"), değilse null. */
export function kampanyaAyi(baslangic: string | Date | null, bitis: string | Date | null): string | null {
  if (!baslangic || !bitis) return null
  const x = gunAy(new Date(baslangic))
  let e = new Date(bitis)
  const yerelSaat = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(e)
  if (yerelSaat === '00:00') e = new Date(e.getTime() - 60_000)
  const y = gunAy(e)
  return x.yil === y.yil && x.ay === y.ay ? buyukBaslat(x.ay) : null
}

export type IlkEkranKampanyasi = {
  /** Küçük üst satır: "Kasım indirimi" */
  ustBaslik: string
  /** Ana başlık (h1): "Tüm ürünlerde %25 indirim" — "%25" ayrıca vurgulanır. */
  baslik: string
  /** Başlıkta büyütülecek parça: "%25" */
  vurgu: string
  /** Zorunlu tarih satırı: "11–30 Kasım" */
  tarih: string
  /** Masaüstünde başlığın altındaki cümle. */
  aciklama: string
  cta: string
  hedef: string
}

/**
 * İlk ekran (hero) metni. Koşulsuz yüzde indirim değilse ya da tarih yoksa
 * null — o durumda slaytın kendi yazısı aynen kalır.
 */
export function ilkEkranKampanyasi(k: SiteGeneliIndirim | null | undefined): IlkEkranKampanyasi | null {
  if (!k || !k.fiyatGoster || !k.oran || k.oran <= 0) return null
  const tarih = tarihAraligi(k.baslangic, k.bitis)
  if (!tarih) return null
  const oran = Math.round(k.oran)
  const ay = kampanyaAyi(k.baslangic, k.bitis)
  return {
    ustBaslik: ay ? `${ay} indirimi` : 'İndirim dönemi',
    baslik: `Tüm ürünlerde %${oran} indirim`,
    vurgu: `%${oran}`,
    tarih,
    aciklama: 'İndirim her ürüne kendiliğinden uygulanır, kod gerekmez.',
    cta: 'Alışverişe başlayın',
    hedef: k.hedef || '/urunler',
  }
}

/** Duyuru şeridindeki kampanya mesajı: "Tüm ürünlerde %25 indirim, 11–30 Kasım". */
export function seritKampanyaMesaji(k: SiteGeneliIndirim | null | undefined): string | null {
  const m = ilkEkranKampanyasi(k)
  return m ? `${m.baslik}, ${m.tarih}` : null
}
