'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Download, Info } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { PBadge, PButton, PCard, PInput, PSayfaNotu } from '../_components/ui'
import type { Rapor, UrunSatiri } from '@/lib/analytics/report'

const DONEMLER = [
  ['bugun', 'Bugün'],
  ['dun', 'Dün'],
  ['son7', 'Son 7 gün'],
  ['son30', 'Son 30 gün'],
  ['buay', 'Bu ay'],
  ['gecenay', 'Geçen ay'],
  ['buyil', 'Bu yıl'],
  ['ozel', 'Özel'],
] as const

const sayi = (n: number) => n.toLocaleString('tr-TR')
const yuzde = (n: number) => `%${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`

function sure(saniye: number): string {
  if (saniye < 60) return `${saniye} sn`
  const dk = Math.floor(saniye / 60)
  return `${dk} dk ${saniye % 60} sn`
}

/**
 * Önceki döneme göre değişim rozeti.
 *
 * Önceki dönemde HİÇ ölçüm yoksa (ör. ölçümün başladığı günden öncesi) "yeni"
 * ya da "%0" demek yanıltıcı olur — o dönem için veri yoktur, sıfır değildir.
 */
function Degisim({ simdi, onceki, veriVar = true }: { simdi: number; onceki: number; veriVar?: boolean }) {
  // "veri yok" tek başına kartın KENDİ verisinin olmadığı gibi okunuyordu
  // (Faz 24). Eksik olan karşılaştırma dönemi; cümle bunu söylesin.
  if (!veriVar)
    return <span className="text-[11px] text-[var(--p-muted)]">önceki dönemde veri yok</span>
  if (onceki === 0 && simdi === 0) return <span className="text-[11px] text-[var(--p-muted)]">—</span>
  if (onceki === 0) return <PBadge tone="success">yeni</PBadge>
  const fark = ((simdi - onceki) / onceki) * 100
  const yuvarlak = Math.round(fark * 10) / 10
  if (Math.abs(yuvarlak) < 0.1) return <span className="text-[11px] text-[var(--p-muted)]">değişmedi</span>
  return (
    <span className={`text-[11px] ${yuvarlak > 0 ? 'text-[var(--p-success)]' : 'text-[var(--p-danger)]'}`}>
      {yuvarlak > 0 ? '▲' : '▼'} {Math.abs(yuvarlak).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}%
    </span>
  )
}

function Kart({
  baslik,
  deger,
  simdi,
  onceki,
  oncekiVeriVar = true,
  not,
}: {
  baslik: string
  deger: string
  simdi?: number
  onceki?: number
  oncekiVeriVar?: boolean
  not?: string
}) {
  return (
    <div className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--p-muted)]">{baslik}</p>
      <p className="mt-1 text-[20px] font-medium tabular-nums text-[var(--p-ink)]">{deger}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        {simdi !== undefined && onceki !== undefined && (
          <Degisim simdi={simdi} onceki={onceki} veriVar={oncekiVeriVar} />
        )}
        {not && <span className="text-[10px] text-[var(--p-muted)]">{not}</span>}
      </div>
    </div>
  )
}

/** Kütüphanesiz çizgi grafiği — ziyaretçi ve ciro (iki eksen, normalize). */
function Seri({ seri }: { seri: Rapor['seri'] }) {
  if (seri.length < 2) {
    return (
      <p className="px-4 py-8 text-center text-[12px] text-[var(--p-muted)]">
        Grafik için en az iki günlük veri gerekiyor.
      </p>
    )
  }
  const G = 600, Y = 160, P = 8
  const maxZ = Math.max(...seri.map((s) => s.ziyaretci), 1)
  const maxC = Math.max(...seri.map((s) => s.ciro), 1)
  const x = (i: number) => P + (i * (G - 2 * P)) / (seri.length - 1)
  const yz = (v: number) => Y - P - (v / maxZ) * (Y - 2 * P)
  const yc = (v: number) => Y - P - (v / maxC) * (Y - 2 * P)
  const cizgi = (f: (v: number) => number, alan: (s: Rapor['seri'][0]) => number) =>
    seri.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${f(alan(s)).toFixed(1)}`).join(' ')

  return (
    <div className="overflow-x-auto px-4 py-3">
      <svg viewBox={`0 0 ${G} ${Y}`} className="h-[160px] w-full min-w-[320px]" role="img" aria-label="Ziyaretçi ve ciro eğrisi">
        <path d={cizgi(yz, (s) => s.ziyaretci)} fill="none" stroke="var(--p-ink)" strokeWidth="1.5" />
        <path d={cizgi(yc, (s) => s.ciro)} fill="none" stroke="var(--p-accent-line)" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
      <div className="mt-1 flex flex-wrap justify-between gap-2 text-[10px] text-[var(--p-muted)]">
        <span>{seri[0].gun}</span>
        <span className="flex gap-3">
          <span className="flex items-center gap-1"><span className="inline-block h-px w-4 bg-[var(--p-ink)]" /> ziyaretçi (en çok {sayi(maxZ)})</span>
          <span className="flex items-center gap-1"><span className="inline-block h-px w-4 border-t border-dashed border-[var(--p-accent-line)]" /> ciro (en çok {formatPrice(maxC)})</span>
        </span>
        <span>{seri[seri.length - 1].gun}</span>
      </div>
    </div>
  )
}

function UrunTablosu({
  satirlar,
  adlar,
  sutunlar,
}: {
  satirlar: UrunSatiri[]
  adlar: Record<string, { ad: string; slug: string }>
  sutunlar: { baslik: string; deger: (u: UrunSatiri) => string }[]
}) {
  if (satirlar.length === 0) {
    return <p className="px-4 py-6 text-center text-[12px] text-[var(--p-muted)]">Bu dönemde veri yok.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-[12px]">
        <thead>
          <tr className="border-b border-[var(--p-line)] text-left text-[10px] uppercase tracking-[0.08em] text-[var(--p-muted)]">
            <th className="px-4 py-2 font-normal">Ürün</th>
            {sutunlar.map((s) => (
              <th key={s.baslik} className="px-3 py-2 text-right font-normal">{s.baslik}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((u) => (
            <tr key={u.productId} className="border-b border-[var(--p-line)] last:border-0">
              <td className="max-w-[240px] truncate px-4 py-2 text-[var(--p-ink)]">
                {adlar[u.productId]?.ad ?? u.productId.slice(0, 8)}
              </td>
              {sutunlar.map((s) => (
                <td key={s.baslik} className="px-3 py-2 text-right tabular-nums">{s.deger(u)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AnalizClient({
  rapor,
  secili,
  adlar,
  olcumNotu,
  kampanyalar = [],
}: {
  rapor: Rapor
  secili: string
  adlar: Record<string, { ad: string; slug: string }>
  /** Panelden düzenlenebilir tek satırlık ölçüm notu; boşsa hiç basılmaz. */
  olcumNotu?: string
  /** Kampanya bazlı kullanım özeti (Faz 11E); dönemde kullanım yoksa boş. */
  kampanyalar?: {
    id: string
    ad: string
    aktif: boolean
    gizli: boolean
    kullanim: number
    toplamIndirim: number
    toplamCiro: number
    ortalamaSepet: number
  }[]
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [bas, setBas] = useState(sp.get('bas') ?? '')
  const [bit, setBit] = useState(sp.get('bit') ?? '')

  const donemSec = (d: string) => {
    if (d === 'ozel') {
      router.push(`/panel/analiz?donem=ozel${bas ? `&bas=${bas}` : ''}${bit ? `&bit=${bit}` : ''}`)
      return
    }
    router.push(`/panel/analiz?donem=${d}`)
  }

  const csvIndir = () => {
    const satirlar = [
      ['Metrik', 'Değer', 'Önceki dönem'],
      ['Günlük tekil ziyaretçi', rapor.metrikler.ziyaretci, rapor.onceki.ziyaretci],
      ['Sayfa görüntüleme', rapor.metrikler.sayfaGoruntuleme, rapor.onceki.sayfaGoruntuleme],
      ['Ürün görüntüleme', rapor.metrikler.urunGoruntuleme, rapor.onceki.urunGoruntuleme],
      ['Sepete ekleme', rapor.metrikler.sepeteEkleme, rapor.onceki.sepeteEkleme],
      ['Favorileme', rapor.metrikler.favori, rapor.onceki.favori],
      ['Üyelik', rapor.metrikler.uyelik, rapor.onceki.uyelik],
      ['Ödemeye başlama', rapor.metrikler.odemeBaslama, rapor.onceki.odemeBaslama],
      ['Sipariş', rapor.metrikler.siparis, rapor.onceki.siparis],
      ['Net ciro', rapor.metrikler.ciro, rapor.onceki.ciro],
      ['Brüt ciro', rapor.metrikler.brutCiro, rapor.onceki.brutCiro],
      ['İptal/iade', rapor.metrikler.iptalIade, rapor.onceki.iptalIade],
      ['Dönüşüm oranı %', rapor.metrikler.donusumOrani, rapor.onceki.donusumOrani],
      [],
      ['Trafik kaynağı', 'Sayfa görüntüleme', 'Pay %'],
      ...rapor.kaynakGruplari.map((k) => [k.ad, k.adet, k.oran]),
      [],
      ['Ürün', 'Görüntüleme', 'Sepete ekleme', 'Satış', 'Görüntüleme→satış %'],
      ...rapor.urunler.map((u) => [
        adlar[u.productId]?.ad ?? u.productId,
        u.goruntuleme,
        u.sepeteEkleme,
        u.satis,
        u.oran,
      ]),
    ]
    const csv = satirlar
      .map((s) => s.map((h) => `"${String(h ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `nb-analiz-${rapor.donem.etiket.replace(/\s/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const m = rapor.metrikler
  const o = rapor.onceki

  return (
    <div className="space-y-4">
      <PSayfaNotu>
        Ziyaretçi, sipariş ve dönüşüm sayılarını seçtiğiniz dönemde izlersiniz; hangi ürünün ilgi gördüğü ve trafiğin nereden geldiği burada görünür.
      </PSayfaNotu>
      {/* Ölçüm geçmişi notu — site_content'teki analiz_notu ile düzenlenir,
          boşaltılınca satır tamamen kalkar. */}
      {olcumNotu && (
        <p className="flex items-start gap-1.5 rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface-muted,var(--p-surface))] px-3 py-2 text-[12px] text-[var(--p-ink-soft)]">
          <Info size={13} className="mt-0.5 shrink-0 text-[var(--p-muted)]" />
          <span>{olcumNotu}</span>
        </p>
      )}

      {/* Rıza şeffaflığı */}
      <p className="flex items-start gap-1.5 rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface)] px-3 py-2 text-[12px] text-[var(--p-ink-soft)]">
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--p-muted)]" />
        <span>
          Rıza oranı: <strong>{yuzde(rapor.rizaOrani)}</strong>. Aşağıdaki metriklerin tamamı çerezsiz
          ve anonim ölçümden gelir — rıza oranından etkilenmez. Tekrar gelen ziyaretçi analizi yalnız
          rıza verenleri kapsar ({sayi(rapor.katmanBOlay)} olay).
        </span>
      </p>

      {/* Dönem seçici */}
      <div className="flex flex-wrap items-center gap-1.5">
        {DONEMLER.map(([k, etiket]) => (
          <button
            key={k}
            onClick={() => donemSec(k)}
            className={`min-h-[32px] rounded-[4px] border px-3 text-[12px] transition-colors ${
              secili === k
                ? 'border-[var(--p-ink)] bg-[var(--p-ink)] text-white'
                : 'border-[var(--p-line)] bg-[var(--p-surface)] text-[var(--p-ink-soft)] hover:border-[var(--p-ink)]'
            }`}
          >
            {etiket}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5">
          <PButton variant="ghost" onClick={csvIndir}>
            <Download size={13} /> CSV
          </PButton>
        </span>
      </div>

      {secili === 'ozel' && (
        <div className="flex flex-wrap items-end gap-2 rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3">
          <label className="text-[11px] text-[var(--p-muted)]">
            Başlangıç
            <PInput type="date" value={bas} onChange={(e) => setBas(e.target.value)} className="mt-1" />
          </label>
          <label className="text-[11px] text-[var(--p-muted)]">
            Bitiş
            <PInput type="date" value={bit} onChange={(e) => setBit(e.target.value)} className="mt-1" />
          </label>
          <PButton onClick={() => donemSec('ozel')} disabled={!bas || !bit}>Uygula</PButton>
        </div>
      )}

      {/* Faz 23: sayıların ne demek olduğu kartların üstünde tek satır.
          Çerezsiz ölçümde "oturum" diye bir şey yok; ziyaretçi GÜNLÜK tekildir. */}
      <p className="text-[12px] leading-relaxed text-[var(--p-muted)]">
        Ziyaretçi sayımı çerezsizdir:{' '}
        <strong className="font-medium text-[var(--p-ink)]">aynı ziyaretçi aynı gün</strong> kaç kez
        gelirse gelsin bir kez sayılır, ertesi gün yeniden sayılır. Bu yüzden haftalık toplam,
        günlük sayıların toplamı değildir. Ciro ve dönüşümden iptal/iade edilen siparişler
        düşülür.
      </p>

      {/* Kartlar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kart baslik="Günlük tekil ziyaretçi" deger={sayi(m.ziyaretci)} simdi={m.ziyaretci} onceki={o.ziyaretci} oncekiVeriVar={rapor.oncekiVeriVar} not="aynı gün tekrar gelen tek sayılır" />
        <Kart baslik="Sayfa görüntüleme" deger={sayi(m.sayfaGoruntuleme)} simdi={m.sayfaGoruntuleme} onceki={o.sayfaGoruntuleme} oncekiVeriVar={rapor.oncekiVeriVar} />
        <Kart baslik="Ort. aktiflik" deger={sure(m.ortAktiflikSaniye)} simdi={m.ortAktiflikSaniye} onceki={o.ortAktiflikSaniye} oncekiVeriVar={rapor.oncekiVeriVar} not="ilk–son hareket arası, 30 dk ile sınırlı" />
        <Kart baslik="Sepete ekleme" deger={sayi(m.sepeteEkleme)} simdi={m.sepeteEkleme} onceki={o.sepeteEkleme} oncekiVeriVar={rapor.oncekiVeriVar} />
        <Kart baslik="Favorileme" deger={sayi(m.favori)} simdi={m.favori} onceki={o.favori} oncekiVeriVar={rapor.oncekiVeriVar} />
        <Kart baslik="Üyelik" deger={sayi(m.uyelik)} simdi={m.uyelik} onceki={o.uyelik} oncekiVeriVar={rapor.oncekiVeriVar} />
        <Kart baslik="Sipariş" deger={sayi(m.siparis)} simdi={m.siparis} onceki={o.siparis} oncekiVeriVar={rapor.oncekiVeriVar} />
        <Kart baslik="Net ciro" deger={formatPrice(m.ciro)} simdi={m.ciro} onceki={o.ciro} oncekiVeriVar={rapor.oncekiVeriVar} not="iptal ve iadeler düşülmüş" />
        <Kart baslik="Brüt ciro" deger={formatPrice(m.brutCiro)} simdi={m.brutCiro} onceki={o.brutCiro} oncekiVeriVar={rapor.oncekiVeriVar} not="iptal/iade dahil tahsilat" />
        <Kart baslik="İptal / iade" deger={sayi(m.iptalIade)} simdi={m.iptalIade} onceki={o.iptalIade} oncekiVeriVar={rapor.oncekiVeriVar} not="ciroya ve dönüşüme sayılmaz" />
        <Kart baslik="Dönüşüm oranı" deger={yuzde(m.donusumOrani)} simdi={m.donusumOrani} onceki={o.donusumOrani} oncekiVeriVar={rapor.oncekiVeriVar} not="sipariş / günlük tekil ziyaretçi" />
        <Kart baslik="Sepete ekleme oranı" deger={yuzde(m.sepeteEklemeOrani)} simdi={m.sepeteEklemeOrani} onceki={o.sepeteEklemeOrani} oncekiVeriVar={rapor.oncekiVeriVar} not="sepet / ürün görünt." />
        <Kart baslik="Sepetten ödemeye" deger={yuzde(m.sepettenOdemeOrani)} simdi={m.sepettenOdemeOrani} onceki={o.sepettenOdemeOrani} oncekiVeriVar={rapor.oncekiVeriVar} not="ödeme / sepet" />
      </div>

      <PCard title={`Ziyaretçi ve ciro — ${rapor.donem.etiket}`}>
        <Seri seri={rapor.seri} />
      </PCard>

      {/* Huni */}
      <PCard title="Dönüşüm hunisi">
        <ul className="space-y-2 p-4">
          {rapor.huni.map((a, i) => {
            const oncekiAdet = i === 0 ? a.adet : rapor.huni[i - 1].adet
            const dusus = oncekiAdet ? Math.round((1 - a.adet / oncekiAdet) * 1000) / 10 : 0
            return (
              <li key={a.ad}>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-[var(--p-ink)]">{a.ad}</span>
                  <span className="tabular-nums text-[var(--p-ink)]">
                    {sayi(a.adet)} <span className="text-[var(--p-muted)]">({yuzde(a.oran)})</span>
                    {i > 0 && dusus > 0 && (
                      <span className="ml-2 text-[var(--p-danger)]">−{yuzde(dusus)}</span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--p-bg)]">
                  {/* Sepete ekleme, aynı üründen tekrar eklemeyle görüntülemeyi
                      aşabilir; çubuk %100'de doyar, sayı gerçeği gösterir. */}
                  <div
                    className="h-full bg-[var(--p-accent-line)]"
                    style={{ width: `${Math.min(Math.max(a.oran, 0.5), 100)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </PCard>

      {rapor.uyeKirilimi && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kart baslik="Üye ziyaretçi" deger={sayi(rapor.uyeKirilimi.uyeZiyaretci)} />
          <Kart baslik="Misafir ziyaretçi" deger={sayi(rapor.uyeKirilimi.misafirZiyaretci)} />
          <Kart baslik="Üye siparişi" deger={sayi(rapor.uyeKirilimi.uyeSiparis)} />
          <Kart
            baslik="Üye payı"
            deger={yuzde(
              rapor.uyeKirilimi.uyeZiyaretci + rapor.uyeKirilimi.misafirZiyaretci
                ? Math.round(
                    (rapor.uyeKirilimi.uyeZiyaretci /
                      (rapor.uyeKirilimi.uyeZiyaretci + rapor.uyeKirilimi.misafirZiyaretci)) *
                      1000
                  ) / 10
                : 0
            )}
            not="giriş yapmış ziyaretçiler"
          />
        </div>
      )}

      <PCard title="Saat ve gün yoğunluğu">
        <p className="mb-3 text-[12px] leading-relaxed text-[var(--p-muted)]">
          Sayfa görüntülemelerinin haftanın günü ve saate göre dağılımı (İstanbul saati).
          Koyu kutu daha yoğun demek — kampanya ve gönderi saatini buna göre seçin.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-[560px] border-separate border-spacing-[2px] text-[10px]">
            <thead>
              <tr>
                <th className="w-8" />
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} className="w-5 font-normal text-[var(--p-muted)]">
                    {h % 3 === 0 ? h : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rapor.saatlik.map((satir) => (
                <tr key={satir.gun}>
                  <td className="pr-1 text-right text-[var(--p-muted)]">{satir.gun}</td>
                  {satir.saatler.map((adet, h) => (
                    <td
                      key={h}
                      title={`${satir.gun} ${String(h).padStart(2, '0')}:00 — ${adet} görüntüleme`}
                      className="h-5 rounded-[2px]"
                      style={{
                        backgroundColor:
                          adet === 0
                            ? 'var(--p-bg)'
                            : `color-mix(in srgb, var(--p-accent-deep) ${Math.round(
                                (adet / rapor.saatlikTavan) * 85 + 15
                              )}%, transparent)`,
                      }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PCard>

      <PCard title="En çok görüntülenen ürünler (ilk 20)">
        <UrunTablosu
          satirlar={rapor.urunler}
          adlar={adlar}
          sutunlar={[
            { baslik: 'Görünt.', deger: (u) => sayi(u.goruntuleme) },
            { baslik: 'Sepet', deger: (u) => sayi(u.sepeteEkleme) },
            { baslik: 'Satış', deger: (u) => sayi(u.satis) },
            { baslik: 'Görünt.→satış', deger: (u) => yuzde(u.oran) },
          ]}
        />
      </PCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PCard title="Sepete eklenip alınmayanlar (fırsat)">
          <UrunTablosu
            satirlar={rapor.firsatlar}
            adlar={adlar}
            sutunlar={[{ baslik: 'Sepete ekleme', deger: (u) => sayi(u.sepeteEkleme) }]}
          />
        </PCard>
        <PCard title="En çok favorilenenler">
          <UrunTablosu
            satirlar={rapor.favoriler}
            adlar={adlar}
            sutunlar={[{ baslik: 'Favori', deger: (u) => sayi(u.favori) }]}
          />
        </PCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PCard title="Cihaz">
          <ul className="divide-y divide-[var(--p-line)] text-[12px]">
            {rapor.cihazlar.length === 0 && <li className="px-4 py-6 text-center text-[var(--p-muted)]">Veri yok.</li>}
            {rapor.cihazlar.map((c) => (
              <li key={c.ad} className="flex justify-between px-4 py-2">
                <span className="text-[var(--p-ink)]">{c.ad}</span>
                <span className="tabular-nums">{sayi(c.adet)}</span>
              </li>
            ))}
          </ul>
        </PCard>
        <PCard title="Trafik kaynağı">
          {/* Faz 23-B: önce grup, sonra ham alan adı. Eskiden yalnız ham liste
              vardı ve `api.iyzipay.com` (ödeme dönüşü) ile `nbsteelora.com.`
              (kendi sitemiz) trafik kaynağı gibi görünüyordu. */}
          <ul className="divide-y divide-[var(--p-line)] text-[12px]">
            {rapor.kaynakGruplari.length === 0 && <li className="px-4 py-6 text-center text-[var(--p-muted)]">Veri yok.</li>}
            {rapor.kaynakGruplari.map((k) => (
              <li key={k.anahtar} className="flex items-center justify-between gap-2 px-4 py-2">
                <span className="truncate font-medium text-[var(--p-ink)]">{k.ad}</span>
                <span className="flex shrink-0 items-baseline gap-1.5">
                  <span className="text-[var(--p-muted)]">%{k.oran}</span>
                  <span className="tabular-nums">{sayi(k.adet)}</span>
                </span>
              </li>
            ))}
          </ul>
          {rapor.kaynaklar.length > 0 && (
            <details className="border-t border-[var(--p-line)] px-4 py-2 text-[12px]">
              <summary className="cursor-pointer text-[var(--p-muted)]">Alan adı ayrıntısı</summary>
              <ul className="mt-2 space-y-1">
                {rapor.kaynaklar.map((k) => (
                  <li key={k.ad} className="flex justify-between gap-2">
                    <span className="truncate text-[var(--p-ink)]">{k.ad}</span>
                    <span className="tabular-nums">{sayi(k.adet)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--p-muted)]">
                Site içi dönüşler (ödeme sağlayıcısı, kendi alan adımız) yukarıdaki gruplara
                sayılmaz ama burada görünür.
              </p>
            </details>
          )}
        </PCard>
        <PCard title="Aramalar">
          <ul className="divide-y divide-[var(--p-line)] text-[12px]">
            {rapor.aramalar.length === 0 && <li className="px-4 py-6 text-center text-[var(--p-muted)]">Veri yok.</li>}
            {rapor.aramalar.map((a) => (
              <li key={a.sorgu} className="flex items-center justify-between gap-2 px-4 py-2">
                <span className="truncate text-[var(--p-ink)]">{a.sorgu}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {a.sonucsuz && <PBadge tone="warning">sonuçsuz</PBadge>}
                  <span className="tabular-nums">{sayi(a.adet)}</span>
                </span>
              </li>
            ))}
          </ul>
        </PCard>

        {/* Kampanya kullanımı (Faz 11E) — dönemde hiç kullanım yoksa kart
            basılmaz; sıfırla dolu bir tablo bilgi vermez. */}
        {kampanyalar.length > 0 && (
          <PCard title="Kampanya kullanımı">
            <ul className="space-y-1.5">
              {kampanyalar.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-2 border-b border-[var(--p-line)] pb-2 last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[var(--p-ink)]">{k.ad}</span>
                    <span className="text-[11px] text-[var(--p-muted)]">
                      {k.kullanim} sipariş · {formatPrice(k.toplamIndirim)} indirim ·
                      {' '}ort. sepet {formatPrice(k.ortalamaSepet)}
                    </span>
                  </span>
                  {k.gizli && <PBadge tone="warning">gizli</PBadge>}
                  {!k.aktif && <PBadge tone="neutral">pasif</PBadge>}
                  <span className="text-[13px] tabular-nums text-[var(--p-ink)]">
                    {formatPrice(k.toplamCiro)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--p-muted)]">
              Seçili dönemde tamamlanan siparişlerden sayılır; iptal ve iade edilenler dışarıdadır.
            </p>
          </PCard>
        )}
      </div>
    </div>
  )
}
