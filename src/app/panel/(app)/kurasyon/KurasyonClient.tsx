'use client'

import Image from 'next/image'
import Link from 'next/link'
import { isRemoteMedia } from '@/lib/images'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { CATEGORIES } from '@/lib/catalog/categories'
import { PBadge, PButton, PCard, PInput, PSelect, PSayfaNotu } from '../_components/ui'
import { useToast } from '../_components/overlays'
import ProductPicker, { type PickerUrun } from '../_components/ProductPicker'
import MediaUpload from '../_components/MediaUpload'

export type KurasyonUrun = {
  id: string
  slug: string
  title: string
  barcode: string | null
  image: string | null
  stock: number
  active: boolean
}

export type PanelSlayt = {
  id: string
  image_url: string
  image_blur?: string | null
  eyebrow: string
  title: string
  subtitle: string
  cta_label: string
  target_type: 'collection' | 'category' | 'product' | 'url'
  target_value: string
  is_active: boolean
}

const KATEGORILER = [
  { key: 'category_kolye', label: 'Kategori — Kolye' },
  { key: 'category_kupe', label: 'Kategori — Küpe' },
  { key: 'category_bileklik', label: 'Kategori — Bileklik' },
  { key: 'category_yuzuk', label: 'Kategori — Yüzük' },
  { key: 'category_piercing', label: 'Kategori — Piercing' },
  { key: 'category_erkek', label: 'Kategori — Erkek' },
  { key: 'category_setler', label: 'Kategori — Setler' },
] as const

/**
 * Anasayfa gerçeği (Faz 11B-ek) — src/lib/home/sections.ts ile birebir aynı.
 *
 * TEK KAYNAK KURALI (BB kararı): panelde kaç ürün seçiliyse vitrinde o kadar
 * kart basılır; boş slot kart üretmez, hiç ürün seçilmezse bölüm vitrinde
 * GÖRÜNMEZ. Eski "eksik slotlar en yeni ürünlerle otomatik doldurulur"
 * davranışı kaldırıldı — BB'nin haberi olmadan vitrine ürün girmişti
 * (Leopar Desenli Küpe olayı, 27 Ağu).
 */
const TAVAN_SLOT = 8

const COKLU = [
  {
    key: 'featured',
    label: 'Öne Çıkanlar',
    aciklama:
      `Vitrinde SEÇTİĞİNİZ KADAR kart basılır (en fazla ${TAVAN_SLOT}) — ilk 2'si büyük ` +
      `editorial kart. Hiç ürün seçmezseniz bölüm vitrinde görünmez.`,
  },
  {
    key: 'new_arrivals',
    label: 'Yeni Gelenler',
    aciklama:
      `Vitrinde SEÇTİĞİNİZ KADAR kart basılır (en fazla ${TAVAN_SLOT}), kaydırmalı şeritte — ` +
      `masaüstünde ok düğmeleri, mobilde parmakla kaydırma. Hiç ürün seçmezseniz bölüm görünmez.`,
  },
] as const

function UrunUyari({ u }: { u: KurasyonUrun | undefined }) {
  if (!u) return null
  if (!u.active) return <PBadge tone="warning">pasif — vitrinde görünmez</PBadge>
  if (u.stock === 0) return <PBadge tone="warning">stoksuz</PBadge>
  return null
}

const YENI_SLAYT = (): PanelSlayt => ({
  id: `yeni_${Date.now().toString(36)}`,
  image_url: '',
  eyebrow: '',
  title: '',
  subtitle: '',
  cta_label: 'Keşfet',
  target_type: 'collection',
  target_value: '',
  is_active: true,
})

export default function KurasyonClient({
  bolumler,
  urunler,
  slaytlar,
  kategoriGorselleri,
  koleksiyonlar,
}: {
  bolumler: Record<string, string[]>
  urunler: Record<string, KurasyonUrun>
  slaytlar: PanelSlayt[]
  kategoriGorselleri: Record<string, string | null>
  koleksiyonlar: { slug: string; name: string }[]
}) {
  const router = useRouter()
  const { push: toast } = useToast()

  const [state, setState] = useState<Record<string, string[]>>(bolumler)
  const [cache, setCache] = useState<Record<string, KurasyonUrun>>(urunler)
  const [katGorsel, setKatGorsel] = useState<Record<string, string | null>>(kategoriGorselleri)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [kaydedilen, setKaydedilen] = useState<string | null>(null)

  // ── Hero slaytları ──
  const [slides, setSlides] = useState<PanelSlayt[]>(slaytlar)
  const [slaytKaydediliyor, setSlaytKaydediliyor] = useState(false)
  const [urunHedefIcin, setUrunHedefIcin] = useState<string | null>(null)
  const slaytDegisti = JSON.stringify(slides) !== JSON.stringify(slaytlar)

  const slaytGuncelle = (id: string, patch: Partial<PanelSlayt>) =>
    setSlides((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const slaytTasi = (i: number, yon: -1 | 1) => {
    const j = i + yon
    if (j < 0 || j >= slides.length) return
    const next = [...slides]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSlides(next)
  }

  const slaytKaydet = async () => {
    setSlaytKaydediliyor(true)
    try {
      const res = await fetch('/api/panel/hero-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      for (const u of data.uyarilar || []) toast(u, 'danger')
      toast('Hero slaytları kaydedildi — vitrin birkaç dakika içinde güncellenir.', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setSlaytKaydediliyor(false)
  }

  // ── Bölüm kaydetme (featured/new_arrivals/kategori) ──
  const degisti = (key: string) =>
    JSON.stringify(state[key]) !== JSON.stringify(bolumler[key]) ||
    (key.startsWith('category_') && (katGorsel[key] ?? null) !== (kategoriGorselleri[key] ?? null))

  const kaydet = async (key: string) => {
    setKaydedilen(key)
    try {
      const govde: any = { section: key, product_ids: state[key] }
      if (key.startsWith('category_')) govde.image_url = katGorsel[key] ?? null
      const res = await fetch('/api/panel/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(govde),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast('Kaydedildi — vitrin en geç ~15 saniye içinde güncellenir.', 'success')
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydedilen(null)
  }

  const sec = (u: PickerUrun) => {
    // Ürün seçici iki bağlamda kullanılıyor: slayt hedefi ya da bölüm listesi.
    if (urunHedefIcin) {
      slaytGuncelle(urunHedefIcin, { target_value: u.slug })
      if (!u.active) toast('Seçilen ürün pasif — vitrinde link üretilmez', 'danger')
      setUrunHedefIcin(null)
      setPickerFor(null)
      return
    }
    const key = pickerFor
    if (!key) return
    setCache((c) => ({ ...c, [u.id]: u }))
    setState((s) => {
      const tekli = KATEGORILER.some((t) => t.key === key)
      const mevcut = s[key] || []
      if (tekli) return { ...s, [key]: [u.id] }
      if (mevcut.includes(u.id)) return s
      return { ...s, [key]: [...mevcut, u.id] }
    })
    setPickerFor(null)
  }

  const tasi = (key: string, i: number, yon: -1 | 1) => {
    const list = state[key]
    const j = i + yon
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setState({ ...state, [key]: next })
  }

  // Bileşen olarak DEĞİL, düz fonksiyon olarak çağrılır: bileşen fonksiyonunun
  // içinde tanımlanan bir bileşen her render'da yeni tip sayılır ve alt ağacı
  // remount eder (form alanlarında odak kaybına yol açan desen).
  const kaydetSatiri = (bolum: string) =>
    degisti(bolum) ? (
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--p-line)] pt-3">
        <PButton
          variant="ghost"
          onClick={() => {
            setState((s) => ({ ...s, [bolum]: bolumler[bolum] }))
            if (bolum.startsWith('category_'))
              setKatGorsel((g) => ({ ...g, [bolum]: kategoriGorselleri[bolum] ?? null }))
          }}
        >
          Geri al
        </PButton>
        <PButton onClick={() => kaydet(bolum)} disabled={kaydedilen === bolum}>
          {kaydedilen === bolum ? 'Kaydediliyor…' : 'Kaydet'}
        </PButton>
      </div>
    ) : null

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PSayfaNotu>
        Anasayfanın hangi görselleri, hangi ürünleri ve hangi bölümleri göstereceğini burada
        seçersiniz; kaydettikten birkaç dakika sonra vitrinde görünür.
      </PSayfaNotu>

      {/* ── Hero slaytları (Faz 9A — kampanya bandı) ── */}
      <PCard
        title={`Hero slaytları (${slides.length}/4)`}
        action={
          <PButton variant="ghost" onClick={() => slides.length < 4 && setSlides([...slides, YENI_SLAYT()])} disabled={slides.length >= 4}>
            <Plus size={14} /> Slayt ekle
          </PButton>
        }
      >
        <p className="mb-3 text-[12px] leading-relaxed text-[var(--p-muted)]">
          Anasayfada 1–4 slayt gösterilir; yalnız «aktif» ve görseli olan slaytlar basılır.
          {slides.length > 1 && ' Ziyaretçi ok, nokta, klavye ve kaydırmayla gezer — otomatik dönme yok.'}
        </p>
        {slides.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-[var(--p-line)] px-3 py-6 text-center">
            <p className="text-[13px] font-medium text-[var(--p-ink)]">
              Slayt ekleyin — görsel yükleyip başlık ve hedef seçin.
            </p>
            <p className="mx-auto mt-1.5 max-w-[46ch] text-[12px] leading-relaxed text-[var(--p-muted)]">
              Slayt yokken anasayfada tipografik hero görünür (boş sayfa açılmaz, hiçbir yere
              link vermez). Otomatik dönme bilinçli olarak yok; ziyaretçi okla/kaydırmayla gezer.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {slides.map((s, i) => (
              <div key={s.id} className="rounded-[6px] border border-[var(--p-line)] p-3">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
                  {/* Canlı önizleme kartı */}
                  <div>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-[var(--p-ink)]">
                      {s.image_url ? (
                        <Image src={s.image_url} unoptimized={isRemoteMedia(s.image_url)} alt="" fill sizes="280px" className="object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] text-white/40">
                          Görsel bekleniyor
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        {s.eyebrow && <p className="text-[8px] uppercase tracking-[0.24em] text-[var(--p-accent)]">{s.eyebrow}</p>}
                        <p className="panel-brand text-[15px] leading-tight text-white">{s.title || 'Başlık'}</p>
                        {s.cta_label && (
                          <span className="mt-1.5 inline-block rounded-[3px] bg-white px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[var(--p-ink)]">
                            {s.cta_label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <MediaUpload etiket="Görsel yükle / değiştir" onUploaded={(url) => slaytGuncelle(s.id, { image_url: url })} />
                      <PInput
                        className="mt-2"
                        placeholder="…ya da görsel URL'i yapıştır"
                        value={s.image_url}
                        onChange={(e) => slaytGuncelle(s.id, { image_url: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Alanlar */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Eyebrow</label>
                      <PInput value={s.eyebrow} onChange={(e) => slaytGuncelle(s.id, { eyebrow: e.target.value })} placeholder="Yeni Koleksiyon" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] text-[var(--p-muted)]">CTA metni</label>
                      <PInput value={s.cta_label} onChange={(e) => slaytGuncelle(s.id, { cta_label: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Başlık</label>
                      <PInput value={s.title} onChange={(e) => slaytGuncelle(s.id, { title: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Alt metin</label>
                      <PInput value={s.subtitle} onChange={(e) => slaytGuncelle(s.id, { subtitle: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Hedef tipi</label>
                      <PSelect
                        value={s.target_type}
                        onChange={(e) => slaytGuncelle(s.id, { target_type: e.target.value as PanelSlayt['target_type'], target_value: '' })}
                      >
                        <option value="collection">Koleksiyon</option>
                        <option value="category">Kategori</option>
                        <option value="product">Ürün</option>
                        <option value="url">Özel URL</option>
                      </PSelect>
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Hedef</label>
                      {s.target_type === 'collection' && (
                        <PSelect value={s.target_value} onChange={(e) => slaytGuncelle(s.id, { target_value: e.target.value })}>
                          <option value="">Seçin…</option>
                          {koleksiyonlar.map((k) => (
                            <option key={k.slug} value={k.slug}>{k.name}</option>
                          ))}
                        </PSelect>
                      )}
                      {s.target_type === 'category' && (
                        <PSelect value={s.target_value} onChange={(e) => slaytGuncelle(s.id, { target_value: e.target.value })}>
                          <option value="">Seçin…</option>
                          {CATEGORIES.map((k) => (
                            <option key={k.slug} value={k.slug}>{k.title}</option>
                          ))}
                        </PSelect>
                      )}
                      {s.target_type === 'product' && (
                        <PButton
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setUrunHedefIcin(s.id)
                            setPickerFor('__slayt__')
                          }}
                        >
                          {s.target_value ? `/urun/${s.target_value.slice(0, 26)}…` : 'Ürün seç'}
                        </PButton>
                      )}
                      {s.target_type === 'url' && (
                        <PInput
                          value={s.target_value}
                          onChange={(e) => slaytGuncelle(s.id, { target_value: e.target.value })}
                          placeholder="/kampanya ya da https://…"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--p-line)] pt-2.5">
                  <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={s.is_active}
                      onChange={(e) => slaytGuncelle(s.id, { is_active: e.target.checked })}
                      className="h-4 w-4 accent-[var(--p-accent-line)]"
                    />
                    Aktif
                  </label>
                  <span className="ml-auto flex items-center gap-1">
                    <button onClick={() => slaytTasi(i, -1)} disabled={i === 0} aria-label="Yukarı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] disabled:opacity-30 hover:border-[var(--p-ink)]"><ArrowUp size={14} /></button>
                    <button onClick={() => slaytTasi(i, 1)} disabled={i === slides.length - 1} aria-label="Aşağı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] disabled:opacity-30 hover:border-[var(--p-ink)]"><ArrowDown size={14} /></button>
                    <button onClick={() => setSlides(slides.filter((x) => x.id !== s.id))} aria-label="Sil" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-danger)]/30 text-[var(--p-danger)] hover:border-[var(--p-danger)]"><Trash2 size={14} /></button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {slaytDegisti && (
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--p-line)] pt-3">
            <PButton variant="ghost" onClick={() => setSlides(slaytlar)} disabled={slaytKaydediliyor}>
              Geri al
            </PButton>
            <PButton onClick={slaytKaydet} disabled={slaytKaydediliyor}>
              {slaytKaydediliyor ? 'Kaydediliyor…' : 'Slaytları kaydet'}
            </PButton>
          </div>
        )}
      </PCard>

      {/* ── Sıralı çoklu listeler ── */}
      {COKLU.map((c) => {
        const secili = state[c.key]?.length ?? 0
        return (
        <PCard
          key={c.key}
          title={`${c.label} (${secili}/${TAVAN_SLOT})`}
          action={
            <PButton
              variant="ghost"
              onClick={() => setPickerFor(c.key)}
              disabled={secili >= TAVAN_SLOT}
            >
              <Plus size={14} /> Ekle
            </PButton>
          }
        >
          {/* Anasayfa gerçeği panelde yazılı — kaç öğe basılıyor, eksikse ne oluyor. */}
          <p className="mb-3 text-[12px] leading-relaxed text-[var(--p-muted)]">
            {c.aciklama}
            {secili > 0 && (
              <span className="text-[var(--p-ink-soft)]"> Vitrinde şu an {secili} kart basılıyor.</span>
            )}
            {secili >= TAVAN_SLOT && (
              <span className="text-[var(--p-warning)]"> Tavana ulaşıldı ({TAVAN_SLOT}).</span>
            )}
          </p>
          {(state[c.key] || []).length === 0 ? (
            <p className="rounded-[4px] border border-dashed border-[var(--p-line)] px-3 py-6 text-center text-[12px] text-[var(--p-muted)]">
              Ürün seçilmedi — bu bölüm vitrinde GÖRÜNMEZ. Göstermek için ürün ekleyin.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {(state[c.key] || []).map((id, i) => {
                const u = cache[id]
                return (
                  <li key={id} className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--p-line)] p-2 sm:flex-nowrap sm:gap-3">
                    <span className="w-5 text-center text-[11px] tabular-nums text-[var(--p-muted)]">{i + 1}</span>
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                      {u?.image && <Image src={u.image} unoptimized={isRemoteMedia(u.image)} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--p-ink)]">{u?.title ?? id}</span>
                      <span className="text-[11px] text-[var(--p-muted)]">{u?.barcode ?? ''}</span>
                    </span>
                    <UrunUyari u={u} />
                    <span className="flex shrink-0 items-center gap-1">
                      <button onClick={() => tasi(c.key, i, -1)} disabled={i === 0} aria-label="Yukarı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] disabled:opacity-30 hover:border-[var(--p-ink)]"><ArrowUp size={14} /></button>
                      <button onClick={() => tasi(c.key, i, 1)} disabled={i === (state[c.key]?.length ?? 0) - 1} aria-label="Aşağı" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-line)] disabled:opacity-30 hover:border-[var(--p-ink)]"><ArrowDown size={14} /></button>
                      <button onClick={() => setState((s) => ({ ...s, [c.key]: s[c.key].filter((x) => x !== id) }))} aria-label="Çıkar" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[var(--p-danger)]/30 text-[var(--p-danger)] hover:border-[var(--p-danger)]"><Trash2 size={14} /></button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {kaydetSatiri(c.key)}
        </PCard>
        )
      })}

      {/* ── Kategori kartı görselleri ── */}
      <div className="pt-2">
        <h2 className="text-[13px] font-semibold text-[var(--p-ink)]">
          Kategori kartları ({KATEGORILER.length}/{KATEGORILER.length})
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--p-muted)]">
          Anasayfada {KATEGORILER.length} kategori kartı basılır — sabit liste, azaltılamaz.
          Kapak görseli seçmezseniz kategoriye uyan ilk ürünün görseli kullanılır.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KATEGORILER.map((t) => {
          const id = state[t.key]?.[0]
          const u = id ? cache[id] : undefined
          const yuklenen = katGorsel[t.key]
          const gorunen = yuklenen ?? u?.image ?? null
          return (
            <PCard key={t.key} title={t.label}>
              <div className="space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                  {gorunen ? (
                    <Image src={gorunen} unoptimized={isRemoteMedia(gorunen)} alt="" fill sizes="200px" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] text-[var(--p-muted)]">
                      Otomatik
                    </span>
                  )}
                  {yuklenen && (
                    <span className="absolute left-1.5 top-1.5"><PBadge tone="accent">yüklenen</PBadge></span>
                  )}
                </div>
                <MediaUpload etiket="Kapak yükle" onUploaded={(url) => setKatGorsel((g) => ({ ...g, [t.key]: url }))} />
                {yuklenen && (
                  <button
                    onClick={() => setKatGorsel((g) => ({ ...g, [t.key]: null }))}
                    className="w-full text-[11px] text-[var(--p-muted)] underline underline-offset-2 hover:text-[var(--p-ink)]"
                  >
                    Yüklenen kapağı bırak
                  </button>
                )}
                <PButton variant="ghost" onClick={() => setPickerFor(t.key)} className="w-full">
                  <RefreshCcw size={13} /> {u ? 'Ürün değiştir' : 'Üründen seç'}
                </PButton>
                {kaydetSatiri(t.key)}
              </div>
            </PCard>
          )
        })}
      </div>

      {/* Koleksiyonlar bandı burada yönetilmiyor — nerede yönetildiği yazılı olsun
          ki panel, anasayfanın tamamını karşılamış görünsün (Faz 11). */}
      <PCard title={`Koleksiyonlar bandı (${koleksiyonlar.length})`}>
        <p className="text-[12px] leading-relaxed text-[var(--p-muted)]">
          Anasayfada aktif koleksiyonların tamamı basılır — şu an {koleksiyonlar.length} koleksiyon
          {koleksiyonlar.length > 0 ? `: ${koleksiyonlar.map((k) => k.name).join(', ')}` : ''}.
          Sıra, ad ve kapak görseli <Link href="/panel/koleksiyonlar" className="text-[var(--p-accent-deep)] underline underline-offset-2">Koleksiyonlar</Link> sayfasından
          yönetilir. Koleksiyon yoksa bant hiç basılmaz.
        </p>
      </PCard>

      <PCard title="Blog şeridi (3)">
        <p className="text-[12px] leading-relaxed text-[var(--p-muted)]">
          Anasayfada en son yayımlanan 3 yazı basılır; seçim yapılmaz.
          Yazılar <Link href="/panel/blog" className="text-[var(--p-accent-deep)] underline underline-offset-2">Blog</Link> sayfasından yönetilir.
        </p>
      </PCard>

      <ProductPicker
        open={pickerFor !== null}
        onClose={() => {
          setPickerFor(null)
          setUrunHedefIcin(null)
        }}
        onSelect={sec}
        disabledIds={pickerFor && pickerFor !== '__slayt__' ? state[pickerFor] ?? [] : []}
      />
    </div>
  )
}
