'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { PBadge, PButton, PInput, PSelect } from '../_components/ui'
import { PDialog, useToast } from '../_components/overlays'

export type KampanyaSatiri = {
  id: string
  name: string
  type: string
  code: string | null
  discountType: 'percent' | 'fixed'
  discountValue: number | null
  minCart: number
  maxUses: number | null
  usedCount: number
  bannerText: string | null
  bannerColor: string | null
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  metadata: any
}

const TIP_ETIKET: Record<string, string> = {
  discount_code: 'İndirim kodu',
  cart_discount: 'Sepet indirimi',
  free_shipping: 'Ücretsiz kargo',
  buy_x_get_y: 'X al Y öde',
  banner: 'Duyuru bandı',
}

type Form = {
  name: string
  type: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: string
  min_cart_amount: string
  max_uses: string
  banner_text: string
  starts_at: string
  ends_at: string
  is_active: boolean
}

const BOS_FORM: Form = {
  name: '',
  type: 'discount_code',
  code: '',
  discount_type: 'percent',
  discount_value: '',
  min_cart_amount: '0',
  max_uses: '',
  banner_text: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
}

const dtLocal = (t: string | null) => {
  if (!t) return ''
  const d = new Date(t)
  // İstanbul saatiyle datetime-local formatı
  const tzOffset = 3 * 60
  const local = new Date(d.getTime() + tzOffset * 60000)
  return local.toISOString().slice(0, 16)
}
const dtIso = (v: string) => (v ? new Date(`${v}:00+03:00`).toISOString() : '')

export default function KampanyalarClient({ satirlar }: { satirlar: KampanyaSatiri[] }) {
  const router = useRouter()
  const { push: toast } = useToast()

  const [duzenlenen, setDuzenlenen] = useState<string | 'yeni' | null>(null)
  const [form, setForm] = useState<Form>(BOS_FORM)
  const [silinecek, setSilinecek] = useState<KampanyaSatiri | null>(null)
  const [isleniyor, setIsleniyor] = useState(false)

  const ac = (c: KampanyaSatiri | null) => {
    if (!c) {
      setForm(BOS_FORM)
      setDuzenlenen('yeni')
      return
    }
    setForm({
      name: c.name,
      type: c.type,
      code: c.code ?? '',
      discount_type: c.discountType,
      discount_value: c.discountValue != null ? String(c.discountValue) : '',
      min_cart_amount: String(c.minCart),
      max_uses: c.maxUses != null ? String(c.maxUses) : '',
      banner_text: c.bannerText ?? '',
      starts_at: dtLocal(c.startsAt),
      ends_at: dtLocal(c.endsAt),
      is_active: c.isActive,
    })
    setDuzenlenen(c.id)
  }

  const kaydet = async () => {
    setIsleniyor(true)
    try {
      const govde = {
        ...form,
        starts_at: dtIso(form.starts_at) || undefined,
        ends_at: dtIso(form.ends_at) || null,
      }
      const url = duzenlenen === 'yeni' ? '/api/panel/campaigns' : `/api/panel/campaigns/${duzenlenen}`
      const res = await fetch(url, {
        method: duzenlenen === 'yeni' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(govde),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi')
      toast('Kampanya kaydedildi', 'success')
      setDuzenlenen(null)
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  const sil = async () => {
    if (!silinecek) return
    setIsleniyor(true)
    try {
      const res = await fetch(`/api/panel/campaigns/${silinecek.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Silinemedi')
      toast('Kampanya silindi', 'success')
      setSilinecek(null)
      router.refresh()
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setIsleniyor(false)
  }

  const tarihAraligi = (c: KampanyaSatiri) => {
    const f = (t: string | null) =>
      t ? new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' }) : null
    const b = f(c.startsAt)
    const s = f(c.endsAt)
    if (b && s) return `${b} — ${s}`
    if (b) return `${b} →`
    return '—'
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--p-muted)]">
          Vitrindeki kupon davranışı değişmez — panel yalnız veriyi yönetir.
        </p>
        <PButton onClick={() => ac(null)}>
          <Plus size={14} /> Yeni kampanya
        </PButton>
      </div>

      <div className="space-y-2">
        {satirlar.length === 0 && (
          <p className="rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] px-4 py-10 text-center text-[13px] text-[var(--p-muted)]">
            Kampanya yok.
          </p>
        )}
        {satirlar.map((c) => (
          <button
            key={c.id}
            onClick={() => ac(c)}
            className="flex w-full flex-wrap items-center gap-2 rounded-[6px] border border-[var(--p-line)] bg-[var(--p-surface)] p-3 text-left hover:border-[var(--p-ink)] transition-colors"
          >
            <span className="text-[13px] font-medium">{c.name}</span>
            <PBadge tone="neutral">{TIP_ETIKET[c.type] ?? c.type}</PBadge>
            {c.code && <PBadge tone="accent">{c.code}</PBadge>}
            {c.discountValue != null && (
              <span className="text-[12px] text-[var(--p-ink-soft)]">
                {c.discountType === 'percent' ? `%${c.discountValue}` : formatPrice(c.discountValue)}
              </span>
            )}
            {c.minCart > 0 && (
              <span className="text-[12px] text-[var(--p-muted)]">min {formatPrice(c.minCart)}</span>
            )}
            <span className="text-[12px] text-[var(--p-muted)]">{tarihAraligi(c)}</span>
            {c.maxUses != null && (
              <span className="text-[12px] text-[var(--p-muted)]">
                kullanım {c.usedCount}/{c.maxUses}
              </span>
            )}
            <span className="ml-auto">
              <PBadge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'aktif' : 'pasif'}</PBadge>
            </span>
          </button>
        ))}
      </div>

      {/* Düzenleme / oluşturma */}
      <PDialog
        open={duzenlenen !== null}
        onClose={() => setDuzenlenen(null)}
        title={duzenlenen === 'yeni' ? 'Yeni kampanya' : 'Kampanyayı düzenle'}
        footer={
          <>
            {duzenlenen !== 'yeni' && (
              <PButton
                variant="danger"
                onClick={() => {
                  const c = satirlar.find((x) => x.id === duzenlenen)
                  if (c) {
                    setDuzenlenen(null)
                    setSilinecek(c)
                  }
                }}
              >
                Sil
              </PButton>
            )}
            <PButton variant="ghost" onClick={() => setDuzenlenen(null)}>Vazgeç</PButton>
            <PButton onClick={kaydet} disabled={isleniyor || !form.name.trim()}>
              {isleniyor ? 'Kaydediliyor…' : 'Kaydet'}
            </PButton>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Ad</label>
            <PInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Tip</label>
              <PSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TIP_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </PSelect>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">
                Kod {form.type === 'discount_code' && <span className="text-[var(--p-danger)]">*</span>}
              </label>
              <PInput
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="HOSGELDIN10"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">İndirim tipi</label>
              <PSelect
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })}
              >
                <option value="percent">Yüzde (%)</option>
                <option value="fixed">Sabit tutar (₺)</option>
              </PSelect>
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">İndirim değeri</label>
              <PInput
                inputMode="decimal"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Min. sepet (₺)</label>
              <PInput
                inputMode="decimal"
                value={form.min_cart_amount}
                onChange={(e) => setForm({ ...form, min_cart_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Maks. kullanım</label>
              <PInput
                inputMode="numeric"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="sınırsız"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Başlangıç</label>
              <PInput type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Bitiş</label>
              <PInput type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          {form.type === 'banner' && (
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Band metni</label>
              <PInput value={form.banner_text} onChange={(e) => setForm({ ...form, banner_text: e.target.value })} />
            </div>
          )}
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 accent-[var(--p-accent)]"
            />
            Aktif — vitrinde geçerli
          </label>
        </div>
      </PDialog>

      {/* Silme onayı */}
      <PDialog
        open={silinecek !== null}
        onClose={() => setSilinecek(null)}
        title={`"${silinecek?.name}" silinecek`}
        footer={
          <>
            <PButton variant="ghost" onClick={() => setSilinecek(null)}>Vazgeç</PButton>
            <PButton variant="danger" onClick={sil} disabled={isleniyor}>
              {isleniyor ? 'Siliniyor…' : 'Evet, sil'}
            </PButton>
          </>
        }
      >
        <p>Silme geri alınamaz. Geçmiş siparişlerdeki indirim kayıtları etkilenmez.</p>
      </PDialog>
    </div>
  )
}
