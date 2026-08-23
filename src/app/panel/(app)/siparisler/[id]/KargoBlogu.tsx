'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Download, RefreshCw, Truck } from 'lucide-react'
import { PBadge, PButton, PCard, PInput, PSelect, type BadgeTone } from '../../_components/ui'
import { PDialog, useToast } from '../../_components/overlays'
import { DURUM_ETIKETLERI, type KargoDurumu } from '@/lib/shipping/providers/types'

export type PanelGonderi = {
  id: string
  saglayici: string
  saglayiciAdi: string
  saglayiciHazir: boolean
  takipKodu: string | null
  firmaAdi: string | null
  durum: KargoDurumu
  durumHam: string | null
  fiyat: number | null
  desi: number | null
  paketSayisi: number
  createdAt: string
  olaylar: { id: string; durum: KargoDurumu; not: string | null; zaman: string; kaynak: string }[]
} | null

export type KargoBloguProps = {
  siparisId: string
  siparisDurumu: string
  gonderi: PanelGonderi
  saglayiciAdi: string
  saglayiciHazir: boolean
  /** Adres alanlarından ön-doldurulan form değerleri. */
  onDolu: { ad: string; telefon: string; adres: string; il: string; ilce: string }
  /** Adresten il/ilçe eşleşmesi tuttu mu; tutmadıysa panel manuel seçim ister. */
  bolgeEslesme: { eslesti: boolean; stateId: number | null; cityId: number | null; neden: string | null }
  bakiye: { tutar: number; paraBirimi: string } | null
}

const DURUM_TONU: Record<KargoDurumu, BadgeTone> = {
  hazirlaniyor: 'warning',
  kargoya_verildi: 'accent',
  yolda: 'accent',
  dagitimda: 'accent',
  teslim_edildi: 'success',
  teslim_edilemedi: 'danger',
  iade_surecinde: 'warning',
  kayip: 'danger',
  iptal: 'danger',
}

const ts = (t: string) =>
  new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' })

type Teklif = { firmaId: string; firmaAdi: string; firmaSlug: string; fiyat: number; paraBirimi: string }

export default function KargoBlogu({
  siparisId,
  siparisDurumu,
  gonderi,
  saglayiciAdi,
  saglayiciHazir,
  onDolu,
  bolgeEslesme,
  bakiye,
}: KargoBloguProps) {
  const router = useRouter()
  const { push: toast } = useToast()

  const [form, setForm] = useState({
    ad: onDolu.ad,
    telefon: onDolu.telefon,
    adres: onDolu.adres,
    icerik: '',
    desi: '1',
  })
  const [stateId, setStateId] = useState<string>(bolgeEslesme.stateId ? String(bolgeEslesme.stateId) : '')
  const [cityId, setCityId] = useState<string>(bolgeEslesme.cityId ? String(bolgeEslesme.cityId) : '')
  const [iller, setIller] = useState<{ providerId: number; ad: string }[]>([])
  const [ilceler, setIlceler] = useState<{ providerId: number; ad: string }[]>([])
  const [teklifler, setTeklifler] = useState<Teklif[] | null>(null)
  const [seciliFirma, setSeciliFirma] = useState<string>('')
  const [isleniyor, setIsleniyor] = useState<string | null>(null)
  const [iptalAcik, setIptalAcik] = useState(false)

  const manuelBolgeGerekli = !bolgeEslesme.eslesti

  const illeriYukle = async () => {
    if (iller.length > 0) return
    const res = await fetch('/api/panel/shipping/regions')
    const data = await res.json()
    setIller(data.regions || [])
  }

  const ilSecildi = async (deger: string) => {
    setStateId(deger)
    setCityId('')
    setIlceler([])
    if (!deger) return
    const res = await fetch(`/api/panel/shipping/regions?state_id=${deger}`)
    const data = await res.json()
    setIlceler(data.regions || [])
  }

  const gonderiOlustur = async () => {
    setIsleniyor('olustur')
    try {
      const res = await fetch('/api/panel/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: siparisId,
          alici_ad: form.ad,
          alici_telefon: form.telefon,
          alici_adres: form.adres,
          icerik: form.icerik,
          desi: Number(form.desi) || 1,
          ...(stateId ? { state_id: Number(stateId) } : {}),
          ...(cityId ? { city_id: Number(cityId) } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gönderi oluşturulamadı')
      toast('Gönderi oluşturuldu — şimdi fiyat teklifi alın', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(null)
  }

  const eylem = async (action: string, ek?: Record<string, unknown>) => {
    if (!gonderi) return null
    setIsleniyor(action)
    try {
      const res = await fetch(`/api/panel/shipments/${gonderi.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...ek }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')
      return data
    } catch (e: any) {
      toast(e.message, 'danger')
      return null
    } finally {
      setIsleniyor(null)
    }
  }

  const teklifGetir = async () => {
    const data = await eylem('rates')
    if (data?.rates) {
      setTeklifler(data.rates)
      if (data.rates.length === 0) toast('Sağlayıcı fiyat döndürmedi', 'danger')
    }
  }

  const firmaSec = async (firmaId: string | null) => {
    const data = await eylem('select', { carrier_id: firmaId })
    if (data?.ok) {
      toast(`${data.result.firmaAdi} seçildi — takip kodu üretildi`, 'success')
      router.refresh()
    }
  }

  const etiketIndir = async () => {
    const data = await eylem('label')
    if (!data?.pdf) return
    const bytes = Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes as any], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kargo-etiketi-${gonderi?.takipKodu || gonderi?.id}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const iptalEt = async () => {
    const data = await eylem('cancel')
    if (data?.ok) {
      toast('Gönderi iptal edildi', 'success')
      setIptalAcik(false)
      router.refresh()
    }
  }

  const durumYenile = async () => {
    const data = await eylem('refresh')
    if (data?.ok) {
      toast('Durum sağlayıcıdan güncellendi', 'success')
      router.refresh()
    }
  }

  const kopyala = (metin: string) => {
    navigator.clipboard.writeText(metin)
    toast('Takip kodu kopyalandı', 'success')
  }

  // Faz 10B: sıfır/negatif bakiyede gönderi onayı (firma seçimi) sağlayıcı
  // tarafından reddedilir; düşük bakiye ise yalnız uyarıdır.
  const bakiyeYok = Boolean(bakiye && bakiye.tutar <= 0)
  const bakiyeUyarisi = Boolean(bakiye && bakiye.tutar <= 100)

  /* ── Gönderi yok: oluşturma formu ─────────────────────────────────── */
  if (!gonderi || gonderi.durum === 'iptal') {
    const kilitli = !saglayiciHazir || isleniyor !== null
    return (
      <PCard
        title={
          <span className="flex items-center gap-1.5">
            <Truck size={14} /> Kargo
          </span>
        }
        action={<span className="text-[11px] text-[var(--p-muted)]">{saglayiciAdi}</span>}
      >
        <div className="space-y-4 p-4">
          {!saglayiciHazir && (
            <p className="rounded-[4px] border border-[var(--p-warning)]/30 bg-[var(--p-warning-bg)] px-3 py-2 text-[12px] text-[var(--p-warning)]">
              {saglayiciAdi} için API anahtarı tanımlı değil — gönderi oluşturulamaz.
            </p>
          )}
          {bakiyeUyarisi && (
            <p className={`rounded-[4px] border px-3 py-2 text-[12px] ${bakiyeYok ? 'border-[var(--p-danger)]/30 bg-[var(--p-danger-bg)] text-[var(--p-danger)]' : 'border-[var(--p-warning)]/30 bg-[var(--p-warning-bg)] text-[var(--p-warning)]'}`}>
              {bakiyeYok
                ? `${saglayiciAdi} bakiyeniz yetersiz (${bakiye!.tutar} ${bakiye!.paraBirimi}) — gönderi onaylanamaz. Taslak oluşturup fiyat teklifi alabilirsiniz; firma seçimi için bakiye yükleyin.`
                : `Sağlayıcı bakiyesi düşük: ${bakiye!.tutar} ${bakiye!.paraBirimi}. Gönderi oluşturmadan önce yükleme yapın.`}
            </p>
          )}
          {gonderi?.durum === 'iptal' && (
            <p className="text-[12px] text-[var(--p-muted)]">
              Önceki gönderi iptal edildi ({ts(gonderi.createdAt)}). Yeni gönderi oluşturabilirsiniz.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-[var(--p-muted)]">Alıcı adı</span>
              <PInput value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-[var(--p-muted)]">Telefon</span>
              <PInput value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] text-[var(--p-muted)]">Adres</span>
            <textarea
              value={form.adres}
              onChange={(e) => setForm({ ...form, adres: e.target.value })}
              rows={2}
              className="w-full rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface)] px-3 py-2 text-[13px] text-[var(--p-ink)] focus:border-[var(--p-accent-line)] focus:outline-none"
            />
          </label>

          {manuelBolgeGerekli ? (
            <div className="space-y-2 rounded-[4px] border border-[var(--p-warning)]/30 bg-[var(--p-warning-bg)] p-3">
              <p className="text-[12px] text-[var(--p-warning)]">
                {bolgeEslesme.neden || 'İl/ilçe eşlenemedi'} — aşağıdan seçin.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PSelect value={stateId} onChange={(e) => ilSecildi(e.target.value)} onFocus={illeriYukle}>
                  <option value="">İl seçin</option>
                  {iller.map((i) => (
                    <option key={i.providerId} value={i.providerId}>{i.ad}</option>
                  ))}
                </PSelect>
                <PSelect value={cityId} onChange={(e) => setCityId(e.target.value)} disabled={!stateId}>
                  <option value="">İlçe seçin</option>
                  {ilceler.map((i) => (
                    <option key={i.providerId} value={i.providerId}>{i.ad}</option>
                  ))}
                </PSelect>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--p-muted)]">
              Bölge eşleşti: <span className="text-[var(--p-ink)]">{onDolu.il} / {onDolu.ilce}</span>
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <label className="block">
              <span className="mb-1 block text-[11px] text-[var(--p-muted)]">Paket içeriği</span>
              <PInput
                value={form.icerik}
                placeholder="Takı"
                onChange={(e) => setForm({ ...form, icerik: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-[var(--p-muted)]">Desi</span>
              <PInput
                type="number"
                min={1}
                value={form.desi}
                onChange={(e) => setForm({ ...form, desi: e.target.value })}
              />
            </label>
          </div>

          <PButton onClick={gonderiOlustur} disabled={kilitli || !form.ad || !form.telefon || !form.adres || (manuelBolgeGerekli && (!stateId || !cityId))}>
            {isleniyor === 'olustur' ? 'Oluşturuluyor…' : 'Gönderiyi oluştur'}
          </PButton>
        </div>
      </PCard>
    )
  }

  /* ── Gönderi var: durum, çizelge, eylemler ────────────────────────── */
  const secimBekliyor = !gonderi.takipKodu

  return (
    <PCard
      title={
        <span className="flex items-center gap-1.5">
          <Truck size={14} /> Kargo
        </span>
      }
      action={
        <span className="flex items-center gap-2">
          <PBadge tone={DURUM_TONU[gonderi.durum]}>{DURUM_ETIKETLERI[gonderi.durum]}</PBadge>
          <button
            onClick={durumYenile}
            disabled={isleniyor !== null}
            className="text-[var(--p-muted)] transition-colors hover:text-[var(--p-ink)] disabled:opacity-40"
            aria-label="Durumu yenile"
          >
            <RefreshCw size={13} />
          </button>
        </span>
      }
    >
      <div className="space-y-4 p-4">
        {bakiyeUyarisi && (
          <p className={`rounded-[4px] border px-3 py-2 text-[12px] ${bakiyeYok ? 'border-[var(--p-danger)]/30 bg-[var(--p-danger-bg)] text-[var(--p-danger)]' : 'border-[var(--p-warning)]/30 bg-[var(--p-warning-bg)] text-[var(--p-warning)]'}`}>
            {bakiyeYok
              ? `${saglayiciAdi} bakiyeniz yetersiz (${bakiye!.tutar} ${bakiye!.paraBirimi}) — gönderi onaylanamaz.`
              : `Sağlayıcı bakiyesi düşük: ${bakiye!.tutar} ${bakiye!.paraBirimi}`}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-4">
          <div>
            <dt className="text-[var(--p-muted)]">Sağlayıcı</dt>
            <dd className="text-[var(--p-ink)]">{gonderi.saglayiciAdi}</dd>
          </div>
          <div>
            <dt className="text-[var(--p-muted)]">Firma</dt>
            <dd className="text-[var(--p-ink)]">{gonderi.firmaAdi ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[var(--p-muted)]">Ücret</dt>
            <dd className="text-[var(--p-ink)]">{gonderi.fiyat != null ? `${gonderi.fiyat} TL` : '—'}</dd>
          </div>
          <div>
            <dt className="text-[var(--p-muted)]">Desi / paket</dt>
            <dd className="text-[var(--p-ink)]">{gonderi.desi ?? '—'} / {gonderi.paketSayisi}</dd>
          </div>
        </dl>

        {gonderi.takipKodu && (
          <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--p-line)] bg-[var(--p-bg)] px-3 py-2">
            <span className="text-[11px] text-[var(--p-muted)]">Takip kodu</span>
            <code className="text-[13px] font-medium tracking-wide text-[var(--p-ink)]">{gonderi.takipKodu}</code>
            <button
              onClick={() => kopyala(gonderi.takipKodu!)}
              className="text-[var(--p-muted)] transition-colors hover:text-[var(--p-ink)]"
              aria-label="Takip kodunu kopyala"
            >
              <Copy size={13} />
            </button>
          </div>
        )}

        {/* Firma seçimi henüz yapılmadıysa fiyat teklifleri */}
        {secimBekliyor && (
          <div className="space-y-2">
            {!teklifler ? (
              <PButton variant="ghost" onClick={teklifGetir} disabled={isleniyor !== null}>
                {isleniyor === 'rates' ? 'Getiriliyor…' : 'Fiyat tekliflerini getir'}
              </PButton>
            ) : (
              <>
                <ul className="divide-y divide-[var(--p-line)] rounded-[4px] border border-[var(--p-line)]">
                  {teklifler.map((t) => (
                    <li key={t.firmaId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <label className="flex items-center gap-2 text-[13px] text-[var(--p-ink)]">
                        <input
                          type="radio"
                          name="firma"
                          value={t.firmaId}
                          checked={seciliFirma === t.firmaId}
                          onChange={() => setSeciliFirma(t.firmaId)}
                        />
                        {t.firmaAdi}
                      </label>
                      <span className="text-[13px] font-medium text-[var(--p-ink)]">
                        {t.fiyat} {t.paraBirimi}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <PButton onClick={() => firmaSec(seciliFirma)} disabled={!seciliFirma || isleniyor !== null || bakiyeYok}>
                    Seçilen firmayla gönder
                  </PButton>
                  <PButton variant="ghost" onClick={() => firmaSec(null)} disabled={isleniyor !== null || bakiyeYok}>
                    Otomatik en ucuz
                  </PButton>
                  {bakiyeYok && (
                    <span className="self-center text-[11px] text-[var(--p-danger)]">
                      Bakiye yüklenmeden firma seçilemez.
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Zaman çizelgesi */}
        <ol className="space-y-2 border-l border-[var(--p-line)] pl-4">
          {gonderi.olaylar.map((o) => (
            <li key={o.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--p-accent-line)]" />
              <p className="text-[12px] text-[var(--p-ink)]">
                {DURUM_ETIKETLERI[o.durum]}
                {o.not ? <span className="text-[var(--p-muted)]"> — {o.not}</span> : null}
              </p>
              <p className="text-[11px] text-[var(--p-muted)]">
                {ts(o.zaman)} · {o.kaynak}
              </p>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2 border-t border-[var(--p-line)] pt-3">
          {gonderi.takipKodu && (
            <PButton variant="ghost" onClick={etiketIndir} disabled={isleniyor !== null}>
              <Download size={13} /> {isleniyor === 'label' ? 'Hazırlanıyor…' : 'Etiketi indir (PDF)'}
            </PButton>
          )}
          <PButton variant="danger" onClick={() => setIptalAcik(true)} disabled={isleniyor !== null}>
            İptal et
          </PButton>
        </div>

        {siparisDurumu === 'preparing' && gonderi.takipKodu && (
          <p className="text-[11px] text-[var(--p-muted)]">
            Takip kodu siparişe işlendi. Müşteriye kargo maili, sipariş durumunu «Kargoya verildi» yaptığınızda gider.
          </p>
        )}
      </div>

      <PDialog
        open={iptalAcik}
        onClose={() => setIptalAcik(false)}
        title="Gönderi iptal edilsin mi?"
        footer={
          <>
            <PButton variant="ghost" onClick={() => setIptalAcik(false)}>Vazgeç</PButton>
            <PButton variant="danger" onClick={iptalEt} disabled={isleniyor !== null}>
              {isleniyor === 'cancel' ? 'İptal ediliyor…' : 'Evet, iptal et'}
            </PButton>
          </>
        }
      >
        <p className="text-[13px] text-[var(--p-ink-soft)]">
          Gönderi sağlayıcıda iptal edilecek. Kargo firması gönderiyi almışsa iptal talebi 36 saat içinde
          işlenir; bu sürede kargo hareket ederse iptal gerçekleşmeyebilir. Sipariş durumu ve ödeme bu
          işlemden etkilenmez.
        </p>
      </PDialog>
    </PCard>
  )
}
