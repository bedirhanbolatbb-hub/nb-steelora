'use client'

import Image from 'next/image'
import { gorselBoyutu, isRemoteMedia } from '@/lib/images'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { PBadge, PButton, PInput, PSelect, PSayfaNotu } from '../_components/ui'
import { PDialog, useToast } from '../_components/overlays'

export type UrunSatiri = {
  id: string
  slug: string
  title: string
  tyTitle: string
  barcode: string | null
  category: string | null
  price: number
  stock: number
  active: boolean
  badge: string | null
  featured: boolean
  hasOverride: boolean
  image: string | null
}

type Params = {
  q: string
  kategori: string
  gender: string
  durum: string
  stok: string
  isaret: string
  sira: string
}

/** Satır rozetleri — liste ve mobil kartta aynı. */
function DurumRozetleri({ p }: { p: UrunSatiri }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {!p.active && <PBadge tone="danger">pasif</PBadge>}
      {p.active && p.stock === 1 && <PBadge tone="warning">stok 1</PBadge>}
      {p.badge && <PBadge tone="accent">{p.badge}</PBadge>}
      {p.featured && <PBadge tone="accent">öne çıkan</PBadge>}
      {p.hasOverride && <PBadge tone="neutral">override</PBadge>}
    </span>
  )
}

export default function UrunlerClient({
  satirlar,
  toplam,
  sayfa,
  sayfaBoyu,
  kategoriler,
  aktifSayi,
  pasifSayi,
  params,
}: {
  satirlar: UrunSatiri[]
  toplam: number
  sayfa: number
  sayfaBoyu: number
  kategoriler: string[]
  aktifSayi: number
  pasifSayi: number
  params: Params
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const { push: toast } = useToast()

  const [secili, setSecili] = useState<Set<string>>(new Set())
  const [filtreSheet, setFiltreSheet] = useState(false)
  const [rozetDialog, setRozetDialog] = useState(false)
  const [rozetMetni, setRozetMetni] = useState('')
  const [isleniyor, setIsleniyor] = useState(false)
  const [arama, setArama] = useState(params.q)
  const aramaZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filtre/sayfa değişince seçim sıfırlanır — görünmeyen satıra işlem yapılmasın.
  useEffect(() => setSecili(new Set()), [satirlar])

  const guncelle = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if (!('sayfa' in updates)) next.delete('sayfa')
      router.push(`${pathname}?${next.toString()}`)
    },
    [sp, pathname, router]
  )

  const aramaDegisti = (value: string) => {
    setArama(value)
    if (aramaZamanlayici.current) clearTimeout(aramaZamanlayici.current)
    aramaZamanlayici.current = setTimeout(() => guncelle({ q: value.trim() }), 350)
  }

  const hepsiSecili = satirlar.length > 0 && satirlar.every((p) => secili.has(p.id))
  const toggleHepsi = () =>
    setSecili(hepsiSecili ? new Set() : new Set(satirlar.map((p) => p.id)))
  const toggle = (id: string) =>
    setSecili((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // ── Faz 21: toplu açıklama üretimi ─────────────────────────────────────
  // İki adım: önce önizleme (hiçbir şey yazılmaz), BB listeyi görüp
  // onaylayınca kaydetme. Tek adımda yazmak, onlarca ürünün açıklamasını
  // görmeden değiştirmek olurdu.
  type Onizleme = {
    secili: number
    uretilecek: { id: string; ad: string; metin: string }[]
    atlanan: number
    veriYok: { id: string; ad: string }[]
  }
  const [aciklamaOnizleme, setAciklamaOnizleme] = useState<Onizleme | null>(null)

  const aciklamaOnizle = async () => {
    setIsleniyor(true)
    try {
      const res = await fetch('/api/panel/products/aciklama-uret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...secili], action: 'onizle' }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Önizleme alınamadı')
      setAciklamaOnizleme(data)
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  const aciklamaUygula = async () => {
    setIsleniyor(true)
    try {
      const res = await fetch('/api/panel/products/aciklama-uret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...secili], action: 'uygula' }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Kaydedilemedi')
      toast(
        `${data.yazilan} ürüne açıklama yazıldı` +
          (data.atlanan ? ` · ${data.atlanan} üründe açıklama zaten var, atlandı` : ''),
        'success'
      )
      setAciklamaOnizleme(null)
      setSecili(new Set())
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  const topluIslem = async (action: string, badge?: string) => {
    setIsleniyor(true)
    try {
      const res = await fetch('/api/panel/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...secili], action, badge }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız')
      toast(`${data.updated} ürün güncellendi`, 'success')
      setRozetDialog(false)
      setRozetMetni('')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  const toplamSayfa = Math.max(1, Math.ceil(toplam / sayfaBoyu))

  const filtreler = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <PSelect value={params.kategori} onChange={(e) => guncelle({ kategori: e.target.value })} aria-label="Kategori">
        <option value="">Kategori: tümü</option>
        {kategoriler.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </PSelect>
      <PSelect value={params.gender} onChange={(e) => guncelle({ gender: e.target.value })} aria-label="Gender">
        <option value="">Gender: tümü</option>
        <option value="women">Kadın</option>
        <option value="men">Erkek</option>
        <option value="bos">Boş</option>
      </PSelect>
      <PSelect value={params.stok} onChange={(e) => guncelle({ stok: e.target.value })} aria-label="Stok">
        <option value="">Stok: tümü</option>
        <option value="1">Stok 1</option>
        <option value="tukenen">Tükenen</option>
      </PSelect>
      <PSelect value={params.isaret} onChange={(e) => guncelle({ isaret: e.target.value })} aria-label="İşaret">
        <option value="">İşaret: tümü</option>
        <option value="rozetli">Rozetli</option>
        <option value="one-cikan">Öne çıkan</option>
        <option value="override">Override&apos;lı</option>
      </PSelect>
    </div>
  )

  /**
   * Aktif / Pasif / Tümü sekmeleri (Faz 23-C).
   *
   * Sayaçlar aynı anda uygulanan diğer filtrelere göre hesaplanır — kategori
   * seçiliyken sekmede o kategorinin aktif/pasif sayısı görünür.
   */
  const sekmeler: { deger: string; ad: string; sayi: number }[] = [
    { deger: 'aktif', ad: 'Aktif', sayi: aktifSayi },
    { deger: 'pasif', ad: 'Pasif', sayi: pasifSayi },
    { deger: 'tumu', ad: 'Tümü', sayi: aktifSayi + pasifSayi },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <PSayfaNotu>
        Vitrindeki ürünlerin tümü burada listelenir; arar, rozet verir, öne çıkarır, düzenlemek için ürünün kendi sayfasına girersiniz.
      </PSayfaNotu>
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--p-line)]">
        {sekmeler.map((s) => (
          <button
            key={s.deger}
            type="button"
            onClick={() => guncelle({ durum: s.deger === 'aktif' ? '' : s.deger })}
            aria-current={params.durum === s.deger ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors',
              params.durum === s.deger
                ? 'border-[var(--p-ink)] font-medium text-[var(--p-ink)]'
                : 'border-transparent text-[var(--p-muted)] hover:text-[var(--p-ink)]'
            )}
          >
            {s.ad}
            <span className="ml-1.5 text-[11px] tabular-nums opacity-60">{s.sayi}</span>
          </button>
        ))}
      </div>

      {params.durum === 'pasif' && (
        <p className="rounded-md bg-[var(--p-surface)] border border-[var(--p-line)] px-3 py-2 text-[12px] leading-relaxed text-[var(--p-muted)]">
          Pasif ürünler <strong className="font-medium text-[var(--p-ink)]">vitrinde görünmez</strong>;
          arama, kategori ve besleme dışındadırlar. Bir ürün, son senkronda
          Trendyol&apos;dan gelmediğinde (kaldırıldı ya da satışa kapandı) otomatik
          olarak buraya düşer. Adresi 404 verir — birebir karşılığı varsa yönlendirme
          tanımlanmıştır.
        </p>
      )}

      {/* Arama + sıralama + mobil filtre girişi */}
      <div className="flex flex-wrap items-center gap-2">
        <PInput
          placeholder="Ara: ad, Trendyol adı, barkod…"
          value={arama}
          onChange={(e) => aramaDegisti(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <PSelect
          value={params.sira}
          onChange={(e) => guncelle({ sira: e.target.value })}
          className="w-auto"
          aria-label="Sıralama"
        >
          <option value="">Güncellenme (yeni)</option>
          <option value="ad">Ada göre</option>
          <option value="fiyat">Fiyat (yüksek)</option>
          <option value="stok">Stok (az)</option>
        </PSelect>
        <button
          onClick={() => setFiltreSheet(true)}
          className="flex min-h-[44px] items-center gap-1.5 rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface)] px-3 text-[13px] sm:hidden"
        >
          <SlidersHorizontal size={14} /> Filtreler
        </button>
        <p className="ml-auto text-[12px] text-[var(--p-muted)]">{toplam} ürün</p>
      </div>

      <div className="hidden sm:block">{filtreler}</div>

      {/* Toplu işlem çubuğu */}
      {secili.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-[var(--p-accent-line)]/40 bg-[#f5efe2] px-3 py-2">
          <p className="text-[13px] font-medium text-[var(--p-ink)]">{secili.size} seçili</p>
          <PButton variant="ghost" onClick={() => setRozetDialog(true)} disabled={isleniyor}>
            Rozet ata
          </PButton>
          <PButton variant="ghost" onClick={() => topluIslem('clear_badge')} disabled={isleniyor}>
            Rozeti kaldır
          </PButton>
          <PButton variant="ghost" onClick={() => topluIslem('set_featured')} disabled={isleniyor}>
            Öne çıkar
          </PButton>
          <PButton variant="ghost" onClick={() => topluIslem('clear_featured')} disabled={isleniyor}>
            Öne çıkarma
          </PButton>
          <PButton variant="ghost" onClick={aciklamaOnizle} disabled={isleniyor}>
            Açıklamayı verilerden üret
          </PButton>
          <button
            onClick={() => setSecili(new Set())}
            className="ml-auto text-[12px] text-[var(--p-muted)] hover:text-[var(--p-ink)]"
          >
            Vazgeç
          </button>
        </div>
      )}

      {/* ── Masaüstü tablo ── */}
      <div className="hidden overflow-x-auto rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] sm:block">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-[var(--p-surface)]">
            <tr className="border-b border-[var(--p-line)] text-left text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">
              <th className="w-10 px-3 py-2.5">
                <input type="checkbox" checked={hepsiSecili} onChange={toggleHepsi} aria-label="Tümünü seç" className="h-4 w-4 accent-[var(--p-accent-line)]" />
              </th>
              <th className="px-3 py-2.5 font-semibold">Ürün</th>
              <th className="px-3 py-2.5 font-semibold">Barkod</th>
              <th className="px-3 py-2.5 font-semibold">Kategori</th>
              <th className="px-3 py-2.5 text-right font-semibold">Fiyat</th>
              <th className="px-3 py-2.5 text-right font-semibold">Stok</th>
              <th className="px-3 py-2.5 font-semibold">Durum</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((p) => (
              <tr key={p.id} className={cn('border-b border-[var(--p-line)]/60 last:border-0 hover:bg-[var(--p-bg)]/60', secili.has(p.id) && 'bg-[#f5efe2]/50')}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={secili.has(p.id)} onChange={() => toggle(p.id)} aria-label={p.title} className="h-4 w-4 accent-[var(--p-accent-line)]" />
                </td>
                <td className="px-3 py-2">
                  <Link href={`/panel/urunler/${p.id}`} className="flex items-center gap-3 group">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                      {p.image && <Image src={gorselBoyutu(p.image, 96)} unoptimized={isRemoteMedia(p.image)} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--p-ink)] group-hover:text-[var(--p-accent-deep)]">{p.title}</span>
                      <span className="block max-w-[260px] truncate text-[11px] text-[var(--p-muted)]">
                        {p.tyTitle.split(' ').slice(0, 5).join(' ')}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-[12px] text-[var(--p-ink-soft)]">{p.barcode ?? '—'}</td>
                <td className="px-3 py-2 text-[12px] text-[var(--p-ink-soft)]">{p.category ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPrice(p.price)}</td>
                <td className={cn('px-3 py-2 text-right tabular-nums', p.stock === 0 && 'text-[var(--p-danger)]', p.stock === 1 && 'text-[var(--p-warning)]')}>{p.stock}</td>
                <td className="px-3 py-2"><DurumRozetleri p={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {satirlar.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">Bu filtrelerle ürün bulunamadı.</p>
        )}
      </div>

      {/* ── Mobil kartlar ── */}
      <div className="space-y-2 sm:hidden">
        {satirlar.map((p) => (
          <div key={p.id} className={cn('flex items-center gap-3 rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3', secili.has(p.id) && 'border-[var(--p-accent-line)]')}>
            <input type="checkbox" checked={secili.has(p.id)} onChange={() => toggle(p.id)} aria-label={p.title} className="h-5 w-5 shrink-0 accent-[var(--p-accent-line)]" />
            <Link href={`/panel/urunler/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                {p.image && <Image src={gorselBoyutu(p.image, 112)} unoptimized={isRemoteMedia(p.image)} alt="" width={48} height={48} sizes="48px" className="h-12 w-12 object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[var(--p-ink)]">{p.title}</span>
                <span className="mt-0.5 block text-[12px] tabular-nums text-[var(--p-ink-soft)]">
                  {formatPrice(p.price)} · stok {p.stock}
                </span>
                <span className="mt-1 block"><DurumRozetleri p={p} /></span>
              </span>
            </Link>
          </div>
        ))}
        {satirlar.length === 0 && (
          <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">
            Bu filtrelerle ürün bulunamadı.
          </p>
        )}
      </div>

      {/* Sayfalama */}
      {toplamSayfa > 1 && (
        <div className="flex items-center justify-between">
          <PButton variant="ghost" disabled={sayfa <= 1} onClick={() => guncelle({ sayfa: String(sayfa - 1) })}>
            ← Önceki
          </PButton>
          <p className="text-[12px] text-[var(--p-muted)]">Sayfa {sayfa} / {toplamSayfa}</p>
          <PButton variant="ghost" disabled={sayfa >= toplamSayfa} onClick={() => guncelle({ sayfa: String(sayfa + 1) })}>
            Sonraki →
          </PButton>
        </div>
      )}

      {/* ── Mobil filtre sheet ── */}
      {filtreSheet && (
        <div className="fixed inset-0 z-[70] sm:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[var(--p-ink)]/40" onClick={() => setFiltreSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[10px] border-t border-[var(--p-line)] bg-[var(--p-surface)] p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold">Filtreler</p>
              <button onClick={() => setFiltreSheet(false)} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center text-[var(--p-muted)]">
                <X size={18} />
              </button>
            </div>
            {filtreler}
            <PButton className="mt-4 w-full" onClick={() => setFiltreSheet(false)}>
              {toplam} ürünü göster
            </PButton>
          </div>
        </div>
      )}

      {/* ── Toplu açıklama önizlemesi (Faz 21) ── */}
      <PDialog
        open={aciklamaOnizleme !== null}
        onClose={() => setAciklamaOnizleme(null)}
        title="Açıklama üretimi — önizleme"
        footer={
          <>
            <PButton variant="ghost" onClick={() => setAciklamaOnizleme(null)}>
              Vazgeç
            </PButton>
            <PButton
              onClick={aciklamaUygula}
              disabled={isleniyor || !aciklamaOnizleme?.uretilecek.length}
            >
              {isleniyor
                ? 'Yazılıyor…'
                : `${aciklamaOnizleme?.uretilecek.length ?? 0} ürüne yaz`}
            </PButton>
          </>
        }
      >
        {aciklamaOnizleme && (
          <div className="space-y-3">
            <p className="text-[12px] text-[var(--p-muted)]">
              {aciklamaOnizleme.secili} ürün seçildi.
              {aciklamaOnizleme.atlanan > 0 && (
                <>
                  {' '}
                  <strong>{aciklamaOnizleme.atlanan} üründe açıklama zaten var, atlandı.</strong>
                </>
              )}
              {aciklamaOnizleme.veriYok.length > 0 && (
                <> {aciklamaOnizleme.veriYok.length} üründe metin üretecek veri yok.</>
              )}
            </p>

            {aciklamaOnizleme.uretilecek.length === 0 ? (
              <p className="rounded-[4px] bg-[var(--p-surface-muted)] px-3 py-2 text-[13px] text-[var(--p-muted)]">
                Yazılacak ürün yok.
              </p>
            ) : (
              <ul className="max-h-[46vh] space-y-2 overflow-y-auto">
                {aciklamaOnizleme.uretilecek.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface-muted)] px-3 py-2"
                  >
                    <p className="text-[12px] font-medium text-[var(--p-ink)]">{u.ad}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--p-ink-soft)]">{u.metin}</p>
                  </li>
                ))}
              </ul>
            )}

            {aciklamaOnizleme.veriYok.length > 0 && (
              <div className="rounded-[4px] bg-[var(--p-warning-bg)] px-3 py-2">
                <p className="text-[12px] text-[var(--p-warning)]">
                  Veri yetersiz — bunlara dokunulmayacak:{' '}
                  {aciklamaOnizleme.veriYok.map((v) => v.ad).join(', ')}
                </p>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-[var(--p-muted)]">
              Metinler yalnız üründe KAYITLI veriden üretilir (kategori, malzeme, başlıktaki
              renk/taş, ölçü). Özellik uydurulmaz. Açıklaması dolu ürünlere dokunulmaz.
            </p>
          </div>
        )}
      </PDialog>

      {/* ── Rozet atama dialog'u ── */}
      <PDialog
        open={rozetDialog}
        onClose={() => setRozetDialog(false)}
        title={`${secili.size} ürüne rozet ata`}
        footer={
          <>
            <PButton variant="ghost" onClick={() => setRozetDialog(false)}>Vazgeç</PButton>
            <PButton onClick={() => topluIslem('set_badge', rozetMetni)} disabled={isleniyor || !rozetMetni.trim()}>
              {isleniyor ? 'Yazılıyor…' : 'Ata'}
            </PButton>
          </>
        }
      >
        <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Rozet metni (ör. Yeni, İndirim)</label>
        <PInput value={rozetMetni} onChange={(e) => setRozetMetni(e.target.value)} maxLength={24} autoFocus />
        <p className="mt-2 text-[12px] text-[var(--p-muted)]">
          Vitrindeki öncelik: Son 1 adet &gt; bu rozet &gt; Yeni.
        </p>
      </PDialog>
    </div>
  )
}
