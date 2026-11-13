import Image from 'next/image'

/**
 * Kart logoları — Tosla İşim sanal POS başvurusunun site şartı (13 Kas 2026,
 * Tosla'nın eksik bildirimi: "VISA, MASTERCARD ve TROY logoları
 * eklenmelidir"; yer: ödeme sayfası ya da ana sayfanın alt kısmı → her
 * sayfanın altı).
 *
 * Dosyalar markaların kendi resmi kaynaklarından alındı; çizim ya da yeniden
 * üretim YOK: Visa Brand Center "Visa Brand Mark Blue RGB" (yalnız saydam
 * kenar boşluğu kırpıldı), Mastercard Brand Center "Mastercard Symbol"
 * (ma_symbol.svg, değiştirilmeden), TROY Medya Merkezi "TROY Logo"
 * (değiştirilmeden). Renkli işaretler beyaz kutuda durur — koyu zeminde
 * renkli işaret için markaların öngördüğü görünüm budur. Mastercard dosyası
 * kendi koruma boşluğunu içerdiği için daha yüksek basılır; üçü gözle eş
 * boyda görünür.
 *
 * Alttaki satır dürüst kalır: kartla ödeme açılana dek (TOSLA_ODEME_ACIK
 * 'evet' değilken) "şu an havale/EFT" der; anahtar açılınca kendiliğinden
 * değişir, metne elle dokunmak gerekmez. Panel karşılığı: gerekmiyor (sabit
 * marka işaretleri; metin ödeme durumunu izler).
 */
const LOGOLAR = [
  { src: '/badges/visa.png', alt: 'Visa', genislik: 332, yukseklik: 109, sinif: 'h-[13px]' },
  { src: '/badges/mastercard.svg', alt: 'Mastercard', genislik: 152, yukseklik: 108, sinif: 'h-[26px]' },
  { src: '/badges/troy.svg', alt: 'Troy', genislik: 298, yukseklik: 137, sinif: 'h-[16px]' },
] as const

/** Kartla ödeme açık mı — Tosla bağlantısı canlıya alınıp anahtar açılınca. */
export function kartlaOdemeAcik(): boolean {
  return process.env.TOSLA_ODEME_ACIK === 'evet'
}

export default function OdemeLogolari() {
  return (
    <div className="flex flex-col items-center gap-2">
      <ul className="flex items-center gap-2" aria-label="Kart logoları">
        {LOGOLAR.map((l) => (
          <li
            key={l.alt}
            className="flex h-9 w-[60px] items-center justify-center rounded-[4px] bg-white px-2"
          >
            <Image
              src={l.src}
              alt={l.alt}
              width={l.genislik}
              height={l.yukseklik}
              unoptimized
              className={`${l.sinif} w-auto max-w-full`}
            />
          </li>
        ))}
      </ul>
      <p className="text-[10px] font-body text-line/50 tracking-wider text-center">
        {kartlaOdemeAcik()
          ? 'Visa, Mastercard ve Troy kartlarla ödeme alınır.'
          : 'Şu an ödemeler havale/EFT ile alınır; kartla ödeme hazırlanıyor.'}
      </p>
    </div>
  )
}
