'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ExternalLink, Lock, Plus } from 'lucide-react'
import { PBadge, PButton, PInput, PTextarea } from '../_components/ui'
import { PTabs, useToast } from '../_components/overlays'
import MediaUpload from '../_components/MediaUpload'

export type YaziSatiri = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  published: boolean
  publishedAt: string | null
  readTime: number
}

type Form = Pick<YaziSatiri, 'title' | 'excerpt' | 'content' | 'coverImage' | 'readTime' | 'published'> & {
  publishedAt: string
}

const dLocal = (t: string | null) => (t ? new Date(t).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))

export default function BlogClient({ yazilar }: { yazilar: YaziSatiri[] }) {
  const router = useRouter()
  const { push: toast } = useToast()

  const [arama, setArama] = useState('')
  const [acik, setAcik] = useState<string | 'yeni' | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [sekme, setSekme] = useState('duzenle')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const liste = useMemo(() => {
    const q = arama.trim().toLowerCase()
    if (!q) return yazilar
    return yazilar.filter((y) => y.title.toLowerCase().includes(q))
  }, [yazilar, arama])

  const seciliYazi = acik !== 'yeni' ? yazilar.find((y) => y.id === acik) ?? null : null

  const ac = (y: YaziSatiri | null) => {
    setSekme('duzenle')
    if (!y) {
      setAcik('yeni')
      setForm({ title: '', excerpt: '', content: '', coverImage: '', readTime: 4, published: true, publishedAt: dLocal(null) })
      return
    }
    setAcik(y.id)
    setForm({
      title: y.title,
      excerpt: y.excerpt,
      content: y.content,
      coverImage: y.coverImage,
      readTime: y.readTime,
      published: y.published,
      publishedAt: dLocal(y.publishedAt),
    })
  }

  const kaydet = async () => {
    if (!form) return
    setKaydediliyor(true)
    try {
      const res = await fetch('/api/panel/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(acik !== 'yeni' ? { id: acik } : {}),
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          cover_image: form.coverImage,
          read_time: form.readTime,
          published: form.published,
          published_at: new Date(`${form.publishedAt}T09:00:00+03:00`).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast(`Kaydedildi — /blog/${data.slug}`, 'success')
      setAcik(null)
      setForm(null)
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setKaydediliyor(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {acik === null ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <PInput placeholder="Yazı ara…" value={arama} onChange={(e) => setArama(e.target.value)} className="w-full sm:max-w-xs" />
            <p className="text-[12px] text-[var(--p-muted)]">{liste.length} yazı</p>
            <PButton className="ml-auto" onClick={() => ac(null)}>
              <Plus size={14} /> Yeni yazı
            </PButton>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liste.map((y) => (
              <button
                key={y.id}
                onClick={() => ac(y)}
                className="overflow-hidden rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] text-left transition-colors hover:border-[var(--p-ink)]"
              >
                <div className="relative aspect-[3/2] bg-[var(--p-bg)]">
                  {y.coverImage && (
                    <Image src={y.coverImage} alt="" fill sizes="320px" className="object-cover" />
                  )}
                  {!y.published && (
                    <span className="absolute left-2 top-2"><PBadge tone="warning">taslak</PBadge></span>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-[13px] font-medium text-[var(--p-ink)]">{y.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--p-muted)]">
                    {y.publishedAt
                      ? new Date(y.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' })
                      : '—'}{' '}
                    · {y.readTime} dk okuma
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        form && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setAcik(null)} className="min-h-[44px] text-[13px] text-[var(--p-muted)] hover:text-[var(--p-ink)]">
                ← Yazılar
              </button>
              {seciliYazi && (
                <span className="ml-auto flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-[var(--p-muted)]">
                    <Lock size={11} /> /blog/{seciliYazi.slug}
                  </span>
                  <a
                    href={`/blog/${seciliYazi.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[13px] text-[var(--p-accent-deep)] hover:underline"
                  >
                    Vitrinde gör <ExternalLink size={12} />
                  </a>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Başlık</label>
                <PInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                {acik === 'yeni' && (
                  <p className="mt-1 text-[11px] text-[var(--p-muted)]">Slug başlıktan otomatik üretilir, sonrasında kilitlenir.</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Özet</label>
                <PTextarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Kapak görseli URL</label>
                <PInput value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https://…" />
                <div className="mt-2">
                  <MediaUpload etiket="Kapak yükle" onUploaded={(url) => setForm((f) => (f ? { ...f, coverImage: url } : f))} />
                </div>
                {form.coverImage && (
                  <span className="relative mt-2 block h-24 w-40 overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.coverImage} alt="Kapak önizleme" className="h-24 w-40 object-cover" />
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Tarih</label>
                  <PInput type="date" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[var(--p-ink-soft)]">Okuma (dk)</label>
                  <PInput inputMode="numeric" value={String(form.readTime)} onChange={(e) => setForm({ ...form, readTime: Number(e.target.value) || 1 })} />
                </div>
                <label className="col-span-2 flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="h-4 w-4 accent-[var(--p-accent)]" />
                  Yayında
                </label>
              </div>
            </div>

            {/* İçerik: mevcut format HTML — sade editör + önizleme */}
            <div>
              <PTabs
                tabs={[
                  { id: 'duzenle', label: 'İçerik (HTML)' },
                  { id: 'onizle', label: 'Önizleme' },
                ]}
                value={sekme}
                onChange={setSekme}
              />
              {sekme === 'duzenle' ? (
                <PTextarea
                  rows={18}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="mt-3 font-mono text-[12px]"
                />
              ) : (
                <div
                  className="prose-blog mt-3 max-h-[480px] overflow-y-auto rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-4"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              )}
              <p className="mt-1 text-[11px] text-[var(--p-muted)]">
                Yazılar vitrinde HTML olarak basılır; önizleme aynı stil sınıfını kullanır.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <PButton variant="ghost" onClick={() => setAcik(null)}>Vazgeç</PButton>
              <PButton onClick={kaydet} disabled={kaydediliyor || !form.title.trim() || !form.content.trim()}>
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
              </PButton>
            </div>
          </div>
        )
      )}
    </div>
  )
}
