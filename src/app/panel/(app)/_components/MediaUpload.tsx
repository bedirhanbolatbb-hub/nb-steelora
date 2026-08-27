'use client'

import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { useToast } from './overlays'

const MAX_KENAR = 1600
const MAX_BAYT = 10 * 1024 * 1024
// Vitrin görsel bütçesi (Faz 11D): hiçbir yüklenen görsel 300 KB'yi aşmasın.
// BB'nin kutu fotoğrafı eski ayarlarla (2400px, sabit 0.85) 937 KB çıkmıştı.
const HEDEF_BAYT = 300 * 1024

/** Görseli uzun kenar ≤1600px'e indirir ve kalite 300 KB hedefine inene
 *  kadar kademeli düşürülerek webp'ye (olmadı jpeg) çevrilir. */
async function kucult(dosya: File): Promise<Blob> {
  const bitmap = await createImageBitmap(dosya)
  const oran = Math.min(1, MAX_KENAR / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * oran)
  const h = Math.round(bitmap.height * oran)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blobla = (tip: string, kalite: number) =>
    new Promise<Blob | null>((cozumle) => canvas.toBlob(cozumle, tip, kalite))

  for (let kalite = 0.8; kalite >= 0.5; kalite -= 0.1) {
    const b = (await blobla('image/webp', kalite)) ?? (await blobla('image/jpeg', kalite))
    if (b && b.size <= HEDEF_BAYT) return b
    if (kalite < 0.55 && b) return b // taban: daha fazla düşürmek görüntüyü bozar
  }
  return (await blobla('image/webp', 0.5)) ?? (await blobla('image/jpeg', 0.5))!
}

/**
 * Panel medya yükleyicisi: dosya seç (bilgisayar/telefon) → istemcide küçült →
 * guard'lı API'ye XHR ile yükle (ilerleme çubuğu) → public URL'i geri ver.
 */
export default function MediaUpload({
  onUploaded,
  etiket = 'Görsel yükle',
}: {
  onUploaded: (url: string) => void
  etiket?: string
}) {
  const girisRef = useRef<HTMLInputElement>(null)
  const { push: toast } = useToast()
  const [yuzde, setYuzde] = useState<number | null>(null)
  const [onizleme, setOnizleme] = useState<string | null>(null)
  // Yükleme sonrası boyut panelde görünür (Faz 11D) — BB 937 KB'lik dosyanın
  // sessizce geçtiğini ancak Lighthouse'ta fark etmişti.
  const [sonBoyutKB, setSonBoyutKB] = useState<number | null>(null)

  const yukle = async (dosya: File) => {
    if (dosya.size > MAX_BAYT) {
      toast('Dosya 10 MB sınırını aşıyor', 'danger')
      return
    }
    try {
      setYuzde(0)
      const kucuk = await kucult(dosya)
      const url = URL.createObjectURL(kucuk)
      setOnizleme(url)

      const form = new FormData()
      const ad = kucuk.type === 'image/webp' ? 'gorsel.webp' : 'gorsel.jpg'
      form.append('file', new File([kucuk], ad, { type: kucuk.type }))

      // XHR: fetch upload ilerlemesi vermiyor.
      const sonuc = await new Promise<{ url?: string; error?: string }>((cozumle) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/panel/media')
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setYuzde(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          try {
            cozumle(JSON.parse(xhr.responseText))
          } catch {
            cozumle({ error: 'Beklenmeyen yanıt' })
          }
        }
        xhr.onerror = () => cozumle({ error: 'Ağ hatası' })
        xhr.send(form)
      })

      URL.revokeObjectURL(url)
      if (!sonuc.url) throw new Error(sonuc.error || 'Yükleme başarısız')
      const kb = Math.round(kucuk.size / 1024)
      setSonBoyutKB(kb)
      toast(`Görsel yüklendi (${kb} KB)`, 'success')
      onUploaded(sonuc.url)
    } catch (e: any) {
      toast(e.message || 'Yükleme başarısız', 'danger')
    }
    setYuzde(null)
    setOnizleme(null)
  }

  return (
    <div>
      <input
        ref={girisRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) yukle(f)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => girisRef.current?.click()}
        disabled={yuzde !== null}
        className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-[4px] border border-dashed border-[var(--p-line)] bg-[var(--p-surface)] px-3 py-2 text-[12px] text-[var(--p-ink-soft)] hover:border-[var(--p-accent-line)] hover:text-[var(--p-ink)] transition-colors disabled:opacity-60"
      >
        <ImagePlus size={14} />
        {yuzde === null ? etiket : `Yükleniyor… %${yuzde}`}
      </button>
      {sonBoyutKB !== null && yuzde === null && (
        <p className="mt-1 text-[11px] text-[var(--p-muted)]">
          Yüklenen boyut: {sonBoyutKB} KB{sonBoyutKB > 300 ? ' — 300 KB hedefinin üstünde' : ''}
        </p>
      )}
      {yuzde !== null && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--p-line)]">
          <div
            className="h-full bg-[var(--p-accent-line)] transition-[width] duration-200"
            style={{ width: `${yuzde}%` }}
          />
        </div>
      )}
      {onizleme && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={onizleme} alt="Önizleme" className="mt-2 h-20 w-auto rounded-[4px] border border-[var(--p-line)] object-cover" />
      )}
    </div>
  )
}
