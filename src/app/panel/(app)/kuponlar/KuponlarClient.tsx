'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Copy, Mail, RotateCw, Ticket } from 'lucide-react'
import { PBadge, PButton, PCard, PInput, PSayfaNotu, PSelect, PTextarea } from '../_components/ui'
import { useToast } from '../_components/overlays'
import MetinOner from '../_components/MetinOner'
import { kuponMetinleri, KUPON_VARSAYILAN } from '@/lib/metin/kuponMetni'

export type KuponSatiri = {
  id: string
  kod: string
  eposta: string
  kampanyaAd: string
  indirim: string
  hak: number
  kullanilan: number
  verildi: string
  sonKullanma: string | null
  kullanildi: string | null
  siparisNo: string | null
  aktif: boolean
  kaynak: string
}

export type KuponKampanyasi = { id: string; ad: string; indirim: string; aktif: boolean }

type Filtre = 'hepsi' | 'kullanilmayan' | 'kullanilan' | 'suresi-dolmus' | 'iptal'

const tarihYaz = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: 'Europe/Istanbul',
      })
    : '—'

const suresiDoldu = (k: KuponSatiri) =>
  Boolean(k.sonKullanma && new Date(k.sonKullanma) < new Date())

/**
 * Kupon üretimi ve takibi (Faz 11E).
 *
 * Üretim: BB e-posta(lar) yapıştırır, kampanyayı seçer, hak/süre belirler;
 * sistem her adres için AYRI tek kullanımlık kod üretir ve isterse mail atar.
 * Takip: kim aldı, kullandı mı, hangi siparişte, kalan hak, son kullanma.
 * İptal kuponu silmez — izi kalır, yalnız pasifleşir.
 */
export default function KuponlarClient({
  satirlar,
  kampanyalar,
}: {
  satirlar: KuponSatiri[]
  kampanyalar: KuponKampanyasi[]
}) {
  const router = useRouter()
  const { push: toast } = useToast()

  const [kampanyaId, setKampanyaId] = useState(kampanyalar[0]?.id ?? '')
  const [epostalar, setEpostalar] = useState('')
  const [hak, setHak] = useState('1')
  const [gun, setGun] = useState('30')
  const [mailAt, setMailAt] = useState(true)
  const [baslik, setBaslik] = useState('')
  const [govde, setGovde] = useState('')
  const [uretiliyor, setUretiliyor] = useState(false)
  const [sonUretim, setSonUretim] = useState<{ email: string; kod: string }[] | null>(null)

  const [filtre, setFiltre] = useState<Filtre>('hepsi')
  const [arama, setArama] = useState('')
  const [mesgul, setMesgul] = useState<string | null>(null)

  const adresSayisi = useMemo(
    () => epostalar.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean).length,
    [epostalar]
  )

  const liste = useMemo(() => {
    const q = arama.trim().toLowerCase()
    return satirlar.filter((k) => {
      if (q && !k.kod.toLowerCase().includes(q) && !k.eposta.toLowerCase().includes(q)) return false
      if (filtre === 'kullanilan') return k.kullanilan > 0
      if (filtre === 'kullanilmayan') return k.kullanilan === 0 && k.aktif && !suresiDoldu(k)
      if (filtre === 'suresi-dolmus') return suresiDoldu(k) && k.kullanilan === 0
      if (filtre === 'iptal') return !k.aktif
      return true
    })
  }, [satirlar, filtre, arama])

  const uret = async () => {
    const adresler = epostalar.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)
    if (!kampanyaId) return toast('Kampanya seçin', 'danger')
    if (!adresler.length) return toast('En az bir e-posta girin', 'danger')
    setUretiliyor(true)
    setSonUretim(null)
    try {
      const res = await fetch('/api/panel/kupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: kampanyaId,
          emails: adresler,
          maxUses: Number(hak) || 1,
          gecerlilikGun: Number(gun) || 0,
          mailAt,
          baslik,
          govde,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Üretilemedi')
      setSonUretim(d.uretilen ?? [])
      const hataSayisi = (d.hatalar ?? []).length
      toast(
        `${(d.uretilen ?? []).length} kupon üretildi${mailAt ? ' ve maillendi' : ''}${hataSayisi ? ` · ${hataSayisi} sorun` : ''}`,
        hataSayisi ? 'danger' : 'success'
      )
      if (hataSayisi) console.warn('[kupon] sorunlar:', d.hatalar)
      setEpostalar('')
      router.refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Üretilemedi', 'danger')
    }
    setUretiliyor(false)
  }

  const iptalDegistir = async (k: KuponSatiri) => {
    setMesgul(k.id)
    try {
      const res = await fetch('/api/panel/kupon', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: k.id, is_active: !k.aktif }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Güncellenemedi')
      toast(k.aktif ? 'Kupon iptal edildi' : 'Kupon yeniden etkinleştirildi', 'success')
      router.refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Güncellenemedi', 'danger')
    }
    setMesgul(null)
  }

  const tekrarMail = async (k: KuponSatiri) => {
    setMesgul(k.id)
    try {
      const res = await fetch('/api/panel/kupon?islem=mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kuponId: k.id, baslik, govde }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gönderilemedi')
      toast('Kod yeniden gönderildi', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Gönderilemedi', 'danger')
    }
    setMesgul(null)
  }

  const durumRozeti = (k: KuponSatiri) => {
    if (!k.aktif) return <PBadge tone="neutral">iptal</PBadge>
    if (k.kullanilan >= k.hak) return <PBadge tone="success">kullanıldı</PBadge>
    if (suresiDoldu(k)) return <PBadge tone="danger">süresi doldu</PBadge>
    if (k.kullanilan > 0) return <PBadge tone="warning">{k.kullanilan}/{k.hak} kullanıldı</PBadge>
    return <PBadge tone="neutral">bekliyor</PBadge>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PSayfaNotu>
        Kişiye özel kuponlar: bir adrese tanımlanan kod yalnız o adresle kullanılabilir, sepette
        sahibi doğrulanır. Kod gerektiren kampanyalar vitrinde hiçbir yerde duyurulmaz — kodu
        yalnız sizin verdiğiniz kişiler bilir.
      </PSayfaNotu>

      {/* ── Üretim ── */}
      <PCard title="Kupon oluştur">
        {kampanyalar.length === 0 ? (
          <p className="rounded-[4px] border border-dashed border-[var(--p-line)] px-3 py-6 text-center text-[12px] text-[var(--p-muted)]">
            Kod gerektiren kampanya yok. Önce Kampanyalar ekranından &quot;Kod gerektirir&quot;
            seçili bir kampanya oluşturun — kişisel kodlar ona bağlanır.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Kampanya</label>
                <PSelect value={kampanyaId} onChange={(e) => setKampanyaId(e.target.value)}>
                  {kampanyalar.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ad} · {k.indirim}
                      {k.aktif ? '' : ' (pasif)'}
                    </option>
                  ))}
                </PSelect>
                <p className="mt-1 text-[11px] text-[var(--p-muted)]">
                  İndirim oranı kampanyadan gelir; kupon yalnız kimin kullanacağını belirler.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Kullanım hakkı</label>
                  <PInput type="number" min={1} max={20} value={hak} onChange={(e) => setHak(e.target.value)} />
                  <p className="mt-1 text-[11px] text-[var(--p-muted)]">Kod kaç kez kullanılabilir. Örn: 1</p>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Geçerlilik (gün)</label>
                  <PInput type="number" min={0} max={365} value={gun} onChange={(e) => setGun(e.target.value)} />
                  <p className="mt-1 text-[11px] text-[var(--p-muted)]">0 = süresiz. Örn: 30</p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">
                E-posta adresleri {adresSayisi > 0 && <span className="text-[var(--p-ink-soft)]">({adresSayisi} adres)</span>}
              </label>
              <PTextarea
                rows={3}
                value={epostalar}
                onChange={(e) => setEpostalar(e.target.value)}
                placeholder="ornek@eposta.com, ikinci@eposta.com — virgül, boşluk ya da alt alta"
              />
              <p className="mt-1 text-[11px] text-[var(--p-muted)]">
                Her adres için AYRI kod üretilir. Tek seferde en fazla 200 adres.
              </p>
            </div>

            <label className="flex items-center gap-2 text-[13px] text-[var(--p-ink)]">
              <input type="checkbox" checked={mailAt} onChange={(e) => setMailAt(e.target.checked)} />
              Kodu müşteriye mail at
            </label>

            {mailAt && (
              <div className="grid gap-3 rounded-[4px] border border-[var(--p-line)] p-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Mail başlığı</label>
                  <PInput
                    value={baslik}
                    onChange={(e) => setBaslik(e.target.value)}
                    placeholder={KUPON_VARSAYILAN.baslik}
                  />
                  <MetinOner uret={() => kuponMetinleri().map((v) => v.baslik)} onSec={setBaslik} />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Mail metni</label>
                  <PTextarea
                    rows={2}
                    value={govde}
                    onChange={(e) => setGovde(e.target.value)}
                    placeholder={KUPON_VARSAYILAN.govde}
                  />
                  <MetinOner uret={() => kuponMetinleri().map((v) => v.govde)} onSec={setGovde} />
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--p-muted)] sm:col-span-2">
                  Kod, kullanım hakkı, son kullanma ve çakışma kuralı maile otomatik eklenir —
                  bu alanlar yalnız selamlama metnidir. Boş bırakırsanız varsayılan kullanılır.
                </p>
              </div>
            )}

            <PButton onClick={uret} disabled={uretiliyor || !adresSayisi}>
              <Ticket size={14} />
              {uretiliyor ? 'Üretiliyor…' : `Kupon üret${adresSayisi > 1 ? ` (${adresSayisi})` : ''}`}
            </PButton>

            {sonUretim && sonUretim.length > 0 && (
              <div className="rounded-[4px] border border-[var(--p-line)] bg-[var(--p-bg)] p-3">
                <p className="mb-2 text-[12px] font-medium text-[var(--p-ink)]">Üretilen kodlar</p>
                <ul className="space-y-1">
                  {sonUretim.map((u) => (
                    <li key={u.kod} className="flex items-center gap-2 text-[12px] text-[var(--p-ink-soft)]">
                      <code className="rounded bg-[var(--p-line)]/40 px-1.5 py-0.5 font-mono text-[12px] text-[var(--p-ink)]">
                        {u.kod}
                      </code>
                      <span className="truncate">{u.email}</span>
                      <button
                        onClick={() => navigator.clipboard?.writeText(u.kod)}
                        aria-label="Kodu kopyala"
                        className="ml-auto flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--p-muted)] hover:text-[var(--p-ink)]"
                      >
                        <Copy size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </PCard>

      {/* ── Takip ── */}
      <PCard title={`Üretilen kuponlar (${liste.length}/${satirlar.length})`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(
            [
              ['hepsi', 'Hepsi'],
              ['kullanilmayan', 'Kullanılmayan'],
              ['kullanilan', 'Kullanılan'],
              ['suresi-dolmus', 'Süresi dolmuş'],
              ['iptal', 'İptal'],
            ] as [Filtre, string][]
          ).map(([deger, etiket]) => (
            <button
              key={deger}
              onClick={() => setFiltre(deger)}
              className={`rounded-[4px] border px-3 py-1.5 text-[12px] transition-colors ${
                filtre === deger
                  ? 'border-[var(--p-ink)] text-[var(--p-ink)]'
                  : 'border-[var(--p-line)] text-[var(--p-muted)] hover:border-[var(--p-ink)]'
              }`}
            >
              {etiket}
            </button>
          ))}
          <PInput
            className="ml-auto max-w-[220px]"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Kod ya da e-posta ara"
          />
        </div>

        {liste.length === 0 ? (
          <p className="rounded-[4px] border border-dashed border-[var(--p-line)] px-3 py-6 text-center text-[12px] text-[var(--p-muted)]">
            Bu süzgeçte kupon yok.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {liste.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--p-line)] p-2.5">
                <code className="rounded bg-[var(--p-line)]/40 px-1.5 py-0.5 font-mono text-[12px] text-[var(--p-ink)]">
                  {k.kod}
                </code>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-[var(--p-ink)]">{k.eposta}</span>
                  <span className="text-[11px] text-[var(--p-muted)]">
                    {k.kampanyaAd} · {k.indirim} · verildi {tarihYaz(k.verildi)}
                    {k.sonKullanma ? ` · son ${tarihYaz(k.sonKullanma)}` : ' · süresiz'}
                    {k.kullanildi ? ` · kullanıldı ${tarihYaz(k.kullanildi)}` : ''}
                    {k.siparisNo ? ` · ${k.siparisNo}` : ''}
                    {k.kaynak !== 'manual' ? ` · otomatik (${k.kaynak})` : ''}
                  </span>
                </span>
                {durumRozeti(k)}
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => tekrarMail(k)}
                    disabled={mesgul === k.id || !k.aktif || k.eposta === '—'}
                    aria-label="Kodu tekrar mail at"
                    title="Kodu tekrar mail at"
                    className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] hover:border-[var(--p-ink)] disabled:opacity-30"
                  >
                    {mesgul === k.id ? <RotateCw size={13} className="animate-spin" /> : <Mail size={13} />}
                  </button>
                  <button
                    onClick={() => iptalDegistir(k)}
                    disabled={mesgul === k.id}
                    aria-label={k.aktif ? 'Kuponu iptal et' : 'Kuponu yeniden etkinleştir'}
                    title={k.aktif ? 'Kuponu iptal et' : 'Yeniden etkinleştir'}
                    className={`flex h-9 w-9 items-center justify-center rounded-[4px] border disabled:opacity-30 ${
                      k.aktif
                        ? 'border-[var(--p-danger)]/30 text-[var(--p-danger)] hover:border-[var(--p-danger)]'
                        : 'border-[var(--p-line)] text-[var(--p-muted)] hover:border-[var(--p-ink)]'
                    }`}
                  >
                    <Ban size={13} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </PCard>
    </div>
  )
}
