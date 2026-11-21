import { PBadge, PCard } from '../../_components/ui'
import type { BadgeTone } from '../../_components/ui'
import { bankaYanitiAciklamasi } from '@/lib/tosla/bankaYaniti'

/** Siparişin `metadata.kart` izi — panelde yalnız gösterilir (12 Kas 2026). */
export type KartBilgisi = {
  durum: string
  ortam: string
  kart: string | null
  yetkiKodu: string | null
  islemNo: string | null
  bankaMesaji: string | null
  /** Bankanın yanıt kodu (ISO 8583, ör. 05, 12, 51) — 21 Kas 2026'dan beri gösterilir. */
  bankaKodu: string | null
  neden: string | null
  oturum: string | null
  odendi: string | null
}

const ts = (t: string | null) =>
  t ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' }) : '—'

const DURUM: Record<string, { etiket: string; ton: BadgeTone; aciklama: string }> = {
  odendi: {
    etiket: 'Ödendi',
    ton: 'success',
    aciklama: 'Para Tosla üzerinden alındı. İptal ya da iadede tutar karta otomatik geri verilir.',
  },
  bekliyor: {
    etiket: 'Sonuç bekleniyor',
    ton: 'warning',
    aciklama:
      'Müşteri ödeme sayfasına geçti, sonuç henüz gelmedi. Sonuç gelince sipariş kendiliğinden ödendi olur; gelmezse gece kontrolü Tosla’ya yeniden sorar, 24 saatte tamamlanmayan deneme kapanır.',
  },
  basarisiz: {
    etiket: 'Ödeme tamamlanmadı',
    ton: 'neutral',
    aciklama:
      'Karttan çekim yapılmadı; sipariş ödendi olmadığı için stok düşmedi. Müşteri yeniden denerse yeni bir sipariş numarası oluşur.',
  },
  inceleme: {
    etiket: 'İnceleme gerekiyor',
    ton: 'danger',
    aciklama:
      'Tosla’nın kaydı siparişle uyuşmadı. Size ayrıca e-posta gitti; işlemi Tosla İşim panelinden kontrol edin.',
  },
}

/**
 * Panel · kartla ödeme (Tosla, 12 Kas 2026).
 *
 * Yalnız gösterir: ödeme kararı ve iade akışı sunucudadır (lib/tosla).
 * Deneme ortamında açılmış sipariş ayrıca işaretlenir — gerçek para değildir,
 * kargoya verilmemelidir.
 */
export default function KartBlogu({ k }: { k: KartBilgisi }) {
  const d = DURUM[k.durum] ?? { etiket: k.durum || 'Bilinmiyor', ton: 'neutral' as BadgeTone, aciklama: '' }
  const satir = (ad: string, deger: string) => (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--p-muted)]">{ad}</dt>
      <dd className="text-right tabular-nums">{deger}</dd>
    </div>
  )
  const sebep = k.neden || k.bankaMesaji
  // 21 Kas 2026: bankanın kısa İngilizce yanıtının Türkçe karşılığı — müşteriye
  // ne söyleneceği buradan okunur (ödeme sonucu sayfası da aynısını gösterir).
  const aciklama = k.durum === 'basarisiz' ? bankaYanitiAciklamasi(k.bankaKodu, k.bankaMesaji) : null
  return (
    <PCard title="Kart ödemesi (Tosla)">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <PBadge tone={d.ton}>{d.etiket}</PBadge>
        {k.ortam === 'test' && <PBadge tone="danger">Deneme ortamı · gerçek para değil</PBadge>}
      </div>
      <dl className="space-y-1 text-[13px]">
        {k.kart && satir('Kart', k.kart)}
        {k.yetkiKodu && satir('Banka onay kodu', k.yetkiKodu)}
        {k.islemNo && satir('Tosla işlem no', k.islemNo)}
        {satir('Ödeme sayfası açıldı', ts(k.oturum))}
        {k.odendi && satir('Ödendi', ts(k.odendi))}
        {sebep && k.durum !== 'odendi' && satir('Sebep', sebep)}
        {k.bankaKodu && k.durum !== 'odendi' && satir('Banka yanıt kodu', k.bankaKodu)}
      </dl>
      {aciklama && <p className="mt-3 text-[12px]">{aciklama}</p>}
      {d.aciklama && <p className="mt-3 text-[12px] text-[var(--p-muted)]">{d.aciklama}</p>}
    </PCard>
  )
}
