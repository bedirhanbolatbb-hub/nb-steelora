'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'
import { isRemoteMedia } from '@/lib/images'
import { formatPrice } from '@/lib/utils'
import { PBadge, PButton, PInput, PSelect } from '../_components/ui'

export type SeciciUrun = {
  id: string
  barkod: string | null
  ad: string
  fiyat: number
  stok: number
  kategori: string | null
  gorsel: string | null
}

/**
 * Kampanya ürün seçicisi (Faz 24).
 *
 * Önceden kapsam "ürün" seçilince tek bir metin kutusu çıkıyor ve barkodların
 * virgülle yapıştırılması bekleniyordu: 432 ürünlük katalogda kullanılamaz bir
 * arayüzdü — mağazacı hangi barkodun hangi ürün olduğunu ezberlemek zorundaydı.
 *
 * Seçim ÜRÜN KİMLİĞİ olarak tutulur, barkod olarak değil: barkod Trendyol'dan
 * gelen bir alandır ve değişebilir. Eskiden barkodla kaydedilmiş kampanyalar
 * yine çalışır — motor ikisini de eşleştirir, seçici de ikisini de çözer.
 */

/** Kategori adından kısa etiket: "Çelik Kolye" → "kolye" ailesi için özet. */
function kategoriOzeti(urunler: SeciciUrun[]): string {
  const sayac = new Map<string, number>()
  for (const u of urunler) {
    // "Çelik Kolye" ve "Bijuteri Kolye" tek başlıkta toplanır — mağazacı
    // "8 kolye" görmek ister, "4 Çelik Kolye + 4 Bijuteri Kolye" değil.
    const son = (u.kategori ?? '').trim().split(/\s+/).pop() ?? ''
    const ad = son ? son.toLocaleLowerCase('tr-TR') : 'diğer'
    sayac.set(ad, (sayac.get(ad) ?? 0) + 1)
  }
  return [...sayac.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ad, adet]) => `${adet} ${ad}`)
    .join(', ')
}

export default function UrunSecici({
  secili,
  onChange,
  kategoriler,
  koleksiyonlar,
}: {
  secili: string[]
  onChange: (hedefler: string[]) => void
  kategoriler: { slug: string; title: string }[]
  koleksiyonlar: { id: string; ad: string }[]
}) {
  const [sekme, setSekme] = useState<'ara' | 'secili'>('ara')
  const [q, setQ] = useState('')
  const [kategori, setKategori] = useState('')
  const [koleksiyon, setKoleksiyon] = useState('')
  const [sayfa, setSayfa] = useState(1)

  const [sonuc, setSonuc] = useState<SeciciUrun[]>([])
  const [toplam, setToplam] = useState(0)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hepsiYukleniyor, setHepsiYukleniyor] = useState(false)

  /** Seçilenlerin ayrıntısı — sekmeler arasında kaybolmasın diye biriktirilir. */
  const [detay, setDetay] = useState<Map<string, SeciciUrun>>(new Map())
  const [bulunamayan, setBulunamayan] = useState<string[]>([])
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)

  const seciliKume = useMemo(() => new Set(secili.map((s) => s.toLowerCase())), [secili])

  const ara = useCallback(async () => {
    setYukleniyor(true)
    try {
      const res = await fetch('/api/panel/campaigns/urun-ara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, kategori, koleksiyon, sayfa }),
      })
      const d = await res.json()
      if (d?.ok) {
        setSonuc(d.urunler)
        setToplam(d.toplam)
        // Görülen her ürün detay havuzuna girer; sonradan seçilirse
        // "Seçilenler" sekmesi için ikinci bir isteğe gerek kalmaz.
        setDetay((m) => {
          const n = new Map(m)
          for (const u of d.urunler as SeciciUrun[]) n.set(u.id, u)
          return n
        })
      }
    } finally {
      setYukleniyor(false)
    }
  }, [q, kategori, koleksiyon, sayfa])

  useEffect(() => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current)
    zamanlayici.current = setTimeout(ara, 250)
    return () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current)
    }
  }, [ara])

  // Kaydedilmiş hedefleri (kimlik ya da barkod) satıra çevir.
  useEffect(() => {
    const eksik = secili.filter((s) => !detay.has(s))
    if (eksik.length === 0) return
    let iptal = false
    fetch('/api/panel/campaigns/urun-ara', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mod: 'coz', hedefler: eksik }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (iptal || !d?.ok) return
        setDetay((m) => {
          const n = new Map(m)
          for (const u of d.urunler as SeciciUrun[]) {
            n.set(u.id, u)
            // Barkodla kaydedilmiş eski hedefler de aynı satıra bağlanır.
            if (u.barkod) n.set(u.barkod, u)
          }
          return n
        })
        setBulunamayan(d.bulunamayan ?? [])
      })
    return () => {
      iptal = true
    }
    // `secili` değiştikçe eksikler tamamlanır.
  }, [secili, detay])

  const degistir = (u: SeciciUrun) => {
    const varMi = seciliKume.has(u.id.toLowerCase()) || (u.barkod ? seciliKume.has(u.barkod.toLowerCase()) : false)
    if (varMi) {
      onChange(
        secili.filter(
          (s) => s.toLowerCase() !== u.id.toLowerCase() && s.toLowerCase() !== (u.barkod ?? '').toLowerCase()
        )
      )
    } else {
      onChange([...secili, u.id])
    }
  }

  const tumunuSec = async () => {
    setHepsiYukleniyor(true)
    try {
      const res = await fetch('/api/panel/campaigns/urun-ara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, kategori, koleksiyon, yalnizKimlik: true }),
      })
      const d = await res.json()
      if (d?.ok) {
        const yeni = new Set(secili)
        for (const id of d.kimlikler as string[]) yeni.add(id)
        onChange([...yeni])
      }
    } finally {
      setHepsiYukleniyor(false)
    }
  }

  const seciliUrunler = useMemo(
    () => secili.map((s) => detay.get(s)).filter(Boolean) as SeciciUrun[],
    [secili, detay]
  )
  // Aynı ürün hem kimlik hem barkodla seçilmiş olabilir; özet tekilleştirilir.
  const tekilSecili = useMemo(() => {
    const m = new Map<string, SeciciUrun>()
    for (const u of seciliUrunler) m.set(u.id, u)
    return [...m.values()]
  }, [seciliUrunler])

  const toplamSayfa = Math.max(1, Math.ceil(toplam / 40))

  const Satir = ({ u }: { u: SeciciUrun }) => {
    const isaretli =
      seciliKume.has(u.id.toLowerCase()) || (u.barkod ? seciliKume.has(u.barkod.toLowerCase()) : false)
    return (
      <li>
        <button
          type="button"
          onClick={() => degistir(u)}
          aria-pressed={isaretli}
          className={`flex w-full items-center gap-3 rounded-[4px] border px-2 py-1.5 text-left transition-colors ${
            isaretli
              ? 'border-[var(--p-accent-deep)] bg-[#f5efe2]'
              : 'border-transparent hover:bg-[var(--p-bg)]'
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
              isaretli
                ? 'border-[var(--p-accent-deep)] bg-[var(--p-accent-deep)] text-white'
                : 'border-[var(--p-line)]'
            }`}
          >
            {isaretli && <Check size={11} strokeWidth={3} />}
          </span>
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[3px] bg-[var(--p-bg)]">
            {u.gorsel && (
              <Image
                src={u.gorsel}
                unoptimized={isRemoteMedia(u.gorsel)}
                alt=""
                width={36}
                height={36}
                sizes="36px"
                className="h-9 w-9 object-cover"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-[var(--p-ink)]">{u.ad}</span>
            <span className="block truncate text-[11px] text-[var(--p-muted)]">
              {u.barkod ?? '—'}
              {u.kategori ? ` · ${u.kategori}` : ''}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[12px] tabular-nums text-[var(--p-ink)]">
              {formatPrice(u.fiyat)}
            </span>
            <span className="block text-[11px] tabular-nums text-[var(--p-muted)]">
              stok {u.stok}
            </span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-[4px] border border-[var(--p-line)] p-0.5">
          {(
            [
              ['ara', 'Ara'],
              ['secili', `Seçilenler (${tekilSecili.length})`],
            ] as const
          ).map(([k, ad]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSekme(k)}
              className={`rounded-[3px] px-2.5 py-1 text-[12px] transition-colors ${
                sekme === k
                  ? 'bg-[var(--p-ink)] text-[var(--p-surface)]'
                  : 'text-[var(--p-muted)] hover:text-[var(--p-ink)]'
              }`}
            >
              {ad}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] font-medium text-[var(--p-ink)]">
          {secili.length === 0 ? 'Ürün seçilmedi' : `${secili.length} ürün seçildi`}
        </span>
        {secili.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex items-center gap-1 text-[12px] text-[var(--p-muted)] hover:text-[var(--p-danger)]"
          >
            <X size={12} /> Temizle
          </button>
        )}
      </div>

      {tekilSecili.length > 0 && (
        <p className="rounded-[4px] bg-[var(--p-bg)] px-2.5 py-1.5 text-[12px] text-[var(--p-ink-soft)]">
          <strong className="font-medium text-[var(--p-ink)]">
            {tekilSecili.length} ürün seçildi
          </strong>{' '}
          — {kategoriOzeti(tekilSecili)}
        </p>
      )}

      {bulunamayan.length > 0 && (
        <p className="rounded-[4px] border border-[var(--p-warning)]/40 bg-[var(--p-warning-bg)] px-2.5 py-1.5 text-[12px] text-[var(--p-warning)]">
          {bulunamayan.length} kayıtlı hedef katalogda bulunamadı ({bulunamayan.slice(0, 5).join(', ')}
          {bulunamayan.length > 5 ? '…' : ''}). Ürün pasife düşmüş ya da barkodu değişmiş olabilir;
          kampanyada durmaya devam eder ama hiçbir ürüne uymaz.
        </p>
      )}

      {sekme === 'ara' ? (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="relative sm:col-span-3">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--p-muted)]"
              />
              <PInput
                placeholder="Ürün adı ya da barkod ile ara…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setSayfa(1)
                }}
                className="pl-7"
              />
            </div>
            <PSelect
              value={kategori}
              onChange={(e) => {
                setKategori(e.target.value)
                setSayfa(1)
              }}
              aria-label="Kategori"
            >
              <option value="">Kategori: tümü</option>
              {kategoriler.map((k) => (
                <option key={k.slug} value={k.title}>
                  {k.title}
                </option>
              ))}
            </PSelect>
            <PSelect
              value={koleksiyon}
              onChange={(e) => {
                setKoleksiyon(e.target.value)
                setSayfa(1)
              }}
              aria-label="Koleksiyon"
            >
              <option value="">Koleksiyon: tümü</option>
              {koleksiyonlar.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </PSelect>
            <PButton variant="ghost" onClick={tumunuSec} disabled={hepsiYukleniyor || toplam === 0}>
              {hepsiYukleniyor ? 'Ekleniyor…' : `Tümünü seç (${toplam})`}
            </PButton>
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-[4px] border border-[var(--p-line)] p-1">
            {yukleniyor && sonuc.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-8 text-[12px] text-[var(--p-muted)]">
                <Loader2 size={13} className="animate-spin" /> Aranıyor…
              </p>
            ) : sonuc.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-[var(--p-muted)]">
                Aramanıza uyan aktif ürün yok.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {sonuc.map((u) => (
                  <Satir key={u.id} u={u} />
                ))}
              </ul>
            )}
          </div>

          {toplamSayfa > 1 && (
            <div className="flex items-center justify-between text-[12px] text-[var(--p-muted)]">
              <span>
                {toplam} üründen {(sayfa - 1) * 40 + 1}–{Math.min(sayfa * 40, toplam)}
              </span>
              <span className="flex gap-1">
                <PButton variant="ghost" onClick={() => setSayfa((s) => Math.max(1, s - 1))} disabled={sayfa === 1}>
                  Önceki
                </PButton>
                <PButton
                  variant="ghost"
                  onClick={() => setSayfa((s) => Math.min(toplamSayfa, s + 1))}
                  disabled={sayfa >= toplamSayfa}
                >
                  Sonraki
                </PButton>
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="max-h-[320px] overflow-y-auto rounded-[4px] border border-[var(--p-line)] p-1">
          {tekilSecili.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-[var(--p-muted)]">
              Henüz ürün seçilmedi. &quot;Ara&quot; sekmesinden ekleyin.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {tekilSecili.map((u) => (
                <Satir key={u.id} u={u} />
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-[var(--p-muted)]">
        Yalnız <strong className="font-medium">aktif</strong> ürünler listelenir. Seçim ürün
        kimliğiyle saklanır; ürünün barkodu sonradan değişse bile kampanya doğru ürüne uygulanır.
      </p>
    </div>
  )
}
