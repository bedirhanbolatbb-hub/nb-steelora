'use client'

import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/catalog/categories'
import { vitrinMetni, vitrinHedefi } from '@/lib/campaigns/vitrinMetni'
import { tipCevir, kapsamCevir } from '@/lib/campaigns/yukle'
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
  // Faz 17 — kapsamlı/koşullu alanlar
  scope: string
  hedefler: string[]
  kademeler: { minTutar: number; oran: number }[]
  minItemCount: number | null
  perUserLimit: number | null
  combinable: boolean
  membersOnly: boolean
  firstOrderOnly: boolean
  buyQuantity: number | null
  payQuantity: number | null
  priority: number
  performans: { siparis: number; indirim: number; ciro: number }
}

const TIP_ETIKET: Record<string, string> = {
  discount_code: 'İndirim kodu',
  cart_discount: 'Sepet indirimi',
  free_shipping: 'Ücretsiz kargo',
  buy_x_get_y: 'X al Y öde',
  banner: 'Duyuru bandı',
  item_discount: 'Kapsamlı indirim',
  tiered_discount: 'Kademeli indirim',
  buy_x_get_y_scoped: 'X al Y öde (kapsamlı)',
}

const KAPSAM_ETIKET: Record<string, string> = {
  cart: 'Tüm sepet',
  category: 'Kategori',
  collection: 'Koleksiyon',
  product: 'Ürün',
}

/** Kapsam seçimi gerektiren tipler. */
const KAPSAMLI_TIPLER = ['item_discount', 'buy_x_get_y_scoped']

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
  scope: string
  targets: string[]
  tiers: { minTutar: string; oran: string }[]
  min_item_count: string
  per_user_limit: string
  combinable: boolean
  members_only: boolean
  first_order_only: boolean
  buy_quantity: string
  pay_quantity: string
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
  scope: 'cart',
  targets: [],
  tiers: [],
  min_item_count: '',
  per_user_limit: '',
  combinable: false,
  members_only: false,
  first_order_only: false,
  buy_quantity: '',
  pay_quantity: '',
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

export default function KampanyalarClient({
  satirlar,
  v2Hazir,
  kategoriler,
  koleksiyonlar,
}: {
  satirlar: KampanyaSatiri[]
  v2Hazir: boolean
  kategoriler: { slug: string; title: string }[]
  koleksiyonlar: { id: string; slug: string; ad: string }[]
}) {
  const router = useRouter()
  const { push: toast } = useToast()

  const [duzenlenen, setDuzenlenen] = useState<string | 'yeni' | null>(null)
  const [form, setForm] = useState<Form>(BOS_FORM)
  const [silinecek, setSilinecek] = useState<KampanyaSatiri | null>(null)
  const [isleniyor, setIsleniyor] = useState(false)
  const [onizleme, setOnizleme] = useState<any>(null)
  const [onizleniyor, setOnizleniyor] = useState(false)

  /**
   * Canlı önizleme: taslak kampanyayı vitrindeki motorla örnek sepete uygular.
   * Panelde görünen sayı ile müşterinin göreceği sayı aynı fonksiyondan gelir.
   */
  const onizle = async () => {
    setOnizleniyor(true)
    try {
      const tip =
        form.type === 'tiered_discount'
          ? 'kademeli'
          : form.type === 'buy_x_get_y' || form.type === 'buy_x_get_y_scoped'
            ? 'x_al_y_ode'
            : form.type === 'free_shipping'
              ? 'ucretsiz_kargo'
              : form.scope !== 'cart'
                ? form.discount_type === 'fixed'
                  ? 'kapsam_sabit'
                  : 'kapsam_yuzde'
                : form.discount_type === 'fixed'
                  ? 'sepet_sabit'
                  : 'sepet_yuzde'

      const kapsam =
        form.scope === 'category'
          ? 'kategori'
          : form.scope === 'collection'
            ? 'koleksiyon'
            : form.scope === 'product'
              ? 'urun'
              : 'sepet'

      const res = await fetch('/api/panel/kampanya-onizleme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kampanya: {
            id: 'taslak',
            ad: form.name || 'Taslak kampanya',
            tip,
            kapsam,
            hedefler: form.targets,
            deger: form.discount_value ? Number(form.discount_value) : null,
            minSepet: Number(form.min_cart_amount || 0),
            minAdet: Number(form.min_item_count || 0),
            alAdet: form.buy_quantity ? Number(form.buy_quantity) : null,
            odeAdet: form.pay_quantity ? Number(form.pay_quantity) : null,
            kademeler: form.tiers
              .map((t) => ({ minTutar: Number(t.minTutar), oran: Number(t.oran) }))
              .filter((t) => Number.isFinite(t.minTutar) && t.oran > 0),
            birlesebilir: form.combinable,
            oncelik: 100,
            ilkAlisverisMi: form.first_order_only,
            sadeceUyelere: form.members_only,
            koduVar: form.type === 'discount_code',
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Önizleme başarısız')
      setOnizleme(data)
    } catch (e: any) {
      toast(e.message, 'danger')
    }
    setOnizleniyor(false)
  }

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
      scope: c.scope ?? 'cart',
      targets: c.hedefler ?? [],
      tiers: (c.kademeler ?? []).map((t) => ({ minTutar: String(t.minTutar), oran: String(t.oran) })),
      min_item_count: c.minItemCount != null ? String(c.minItemCount) : '',
      per_user_limit: c.perUserLimit != null ? String(c.perUserLimit) : '',
      combinable: Boolean(c.combinable),
      members_only: Boolean(c.membersOnly),
      first_order_only: Boolean(c.firstOrderOnly),
      buy_quantity: c.buyQuantity != null ? String(c.buyQuantity) : '',
      pay_quantity: c.payQuantity != null ? String(c.payQuantity) : '',
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
        tiers: form.tiers
          .map((t) => ({ minTutar: Number(t.minTutar), oran: Number(t.oran) }))
          .filter((t) => Number.isFinite(t.minTutar) && t.oran > 0),
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

  // Yürürlük rozetleri — vitrindeki kuralın (lib/campaigns/pricing.ts) panel karşılığı.
  const suresiDolduMu = (c: KampanyaSatiri) => Boolean(c.endsAt && new Date(c.endsAt) < new Date())
  const henuzBaslamadiMi = (c: KampanyaSatiri) => Boolean(c.startsAt && new Date(c.startsAt) > new Date())

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
            {c.scope && c.scope !== 'cart' && (
              <PBadge tone="neutral">
                {KAPSAM_ETIKET[c.scope]}
                {c.hedefler.length > 0 ? ` (${c.hedefler.length})` : ''}
              </PBadge>
            )}
            {c.minCart > 0 && (
              <span className="text-[12px] text-[var(--p-muted)]">min {formatPrice(c.minCart)}</span>
            )}
            {c.minItemCount ? (
              <span className="text-[12px] text-[var(--p-muted)]">min {c.minItemCount} ürün</span>
            ) : null}
            {c.firstOrderOnly && <PBadge tone="neutral">ilk alışveriş</PBadge>}
            {c.membersOnly && <PBadge tone="neutral">üyelere</PBadge>}
            {c.combinable && <PBadge tone="accent">birleşebilir</PBadge>}
            {c.performans.siparis > 0 && (
              <span className="text-[12px] text-[var(--p-success)]">
                {c.performans.siparis} sipariş · {formatPrice(c.performans.indirim)} indirim ·{' '}
                {formatPrice(c.performans.ciro)} ciro
              </span>
            )}
            <span className="text-[12px] text-[var(--p-muted)]">{tarihAraligi(c)}</span>
            {c.maxUses != null && (
              <span className="text-[12px] text-[var(--p-muted)]">
                kullanım {c.usedCount}/{c.maxUses}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1.5">
              {/* Faz 11: tarihi geçmiş kampanya "aktif" görünüp kafa karıştırıyordu.
                  Vitrinde ve indirim hesabında zaten hiç dikkate alınmaz. */}
              {suresiDolduMu(c) && <PBadge tone="danger">süresi doldu</PBadge>}
              {henuzBaslamadiMi(c) && <PBadge tone="warning">henüz başlamadı</PBadge>}
              {c.maxUses != null && c.usedCount >= c.maxUses && (
                <PBadge tone="danger">limit doldu</PBadge>
              )}
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

          {/* Kapsam — kapsamlı tiplerde hedef seçici açılır (Faz 17). */}
          {(KAPSAMLI_TIPLER.includes(form.type) || form.scope !== 'cart') && (
            <div className="rounded-[4px] border border-[var(--p-line)] p-3">
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Kapsam</label>
              <PSelect
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value, targets: [] })}
              >
                {Object.entries(KAPSAM_ETIKET).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </PSelect>

              {form.scope === 'category' && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {kategoriler.map((k) => {
                    const secili = form.targets.includes(k.slug)
                    return (
                      <button
                        key={k.slug}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            targets: secili
                              ? form.targets.filter((t) => t !== k.slug)
                              : [...form.targets, k.slug],
                          })
                        }
                        className={`rounded-[4px] border px-2 py-1 text-[12px] transition-colors ${
                          secili
                            ? 'border-[var(--p-ink)] bg-[var(--p-ink)] text-[var(--p-surface)]'
                            : 'border-[var(--p-line)] text-[var(--p-ink-soft)]'
                        }`}
                      >
                        {k.title}
                      </button>
                    )
                  })}
                </div>
              )}

              {form.scope === 'collection' && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {koleksiyonlar.map((k) => {
                    const secili = form.targets.includes(k.id)
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            targets: secili
                              ? form.targets.filter((t) => t !== k.id)
                              : [...form.targets, k.id],
                          })
                        }
                        className={`rounded-[4px] border px-2 py-1 text-[12px] transition-colors ${
                          secili
                            ? 'border-[var(--p-ink)] bg-[var(--p-ink)] text-[var(--p-surface)]'
                            : 'border-[var(--p-line)] text-[var(--p-ink-soft)]'
                        }`}
                      >
                        {k.ad}
                      </button>
                    )
                  })}
                </div>
              )}

              {form.scope === 'product' && (
                <div className="mt-2">
                  <PInput
                    placeholder="Ürün kimlikleri ya da barkodlar, virgülle"
                    value={form.targets.join(', ')}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        targets: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                  />
                  <p className="mt-1 text-[11px] text-[var(--p-muted)]">
                    Ürünler ekranındaki barkodu (ör. NBK199) yapıştırabilirsiniz.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* X al Y öde */}
          {(form.type === 'buy_x_get_y' || form.type === 'buy_x_get_y_scoped') && (
            <div className="grid grid-cols-2 gap-3 rounded-[4px] border border-[var(--p-line)] p-3">
              <div>
                <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Al (adet)</label>
                <PInput
                  inputMode="numeric"
                  value={form.buy_quantity}
                  onChange={(e) => setForm({ ...form, buy_quantity: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Öde (adet)</label>
                <PInput
                  inputMode="numeric"
                  value={form.pay_quantity}
                  onChange={(e) => setForm({ ...form, pay_quantity: e.target.value })}
                  placeholder="2"
                />
              </div>
              <p className="col-span-2 text-[11px] text-[var(--p-muted)]">
                Kapsamdaki en ucuz ürünler bedava sayılır.
              </p>
            </div>
          )}

          {/* Kademeli eşikler */}
          {form.type === 'tiered_discount' && (
            <div className="rounded-[4px] border border-[var(--p-line)] p-3">
              <label className="mb-2 block text-[12px] text-[var(--p-muted)]">
                Eşikler — sepete uyan en yüksek eşik uygulanır
              </label>
              <div className="space-y-2">
                {form.tiers.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <PInput
                      inputMode="decimal"
                      value={t.minTutar}
                      onChange={(e) => {
                        const yeni = [...form.tiers]
                        yeni[i] = { ...yeni[i], minTutar: e.target.value }
                        setForm({ ...form, tiers: yeni })
                      }}
                      placeholder="500"
                    />
                    <span className="text-[12px] text-[var(--p-muted)]">₺ üzeri</span>
                    <PInput
                      inputMode="decimal"
                      value={t.oran}
                      onChange={(e) => {
                        const yeni = [...form.tiers]
                        yeni[i] = { ...yeni[i], oran: e.target.value }
                        setForm({ ...form, tiers: yeni })
                      }}
                      placeholder="10"
                    />
                    <span className="text-[12px] text-[var(--p-muted)]">%</span>
                    <PButton
                      variant="ghost"
                      onClick={() => setForm({ ...form, tiers: form.tiers.filter((_, j) => j !== i) })}
                    >
                      Sil
                    </PButton>
                  </div>
                ))}
                <PButton
                  variant="ghost"
                  onClick={() => setForm({ ...form, tiers: [...form.tiers, { minTutar: '', oran: '' }] })}
                >
                  <Plus size={13} /> Eşik ekle
                </PButton>
              </div>
            </div>
          )}
          {!v2Hazir && (
            <p className="rounded-[4px] border border-[var(--p-danger)] bg-[#FDECEC] p-2.5 text-[12px]">
              Kapsam ve kademe tabloları henüz kurulmadı
              (<code>docs/kampanya-motoru/01-kampanya-motoru-v2.sql</code>). Kategori/koleksiyon/ürün
              kapsamı ve kademeli indirim kaydedilemez; diğer alanlar çalışır.
            </p>
          )}
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
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Min. ürün adedi</label>
              <PInput
                inputMode="numeric"
                value={form.min_item_count}
                onChange={(e) => setForm({ ...form, min_item_count: e.target.value })}
                placeholder="boş = koşul yok"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--p-muted)]">Kişi başı kullanım</label>
              <PInput
                inputMode="numeric"
                value={form.per_user_limit}
                onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
                placeholder="boş = sınırsız"
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

          {/* Koşul anahtarları (Faz 17) */}
          <div className="flex flex-wrap items-center gap-3 rounded-[4px] border border-[var(--p-line)] p-3 text-[12px]">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.first_order_only}
                onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })}
              />
              Yalnız ilk alışverişte
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.members_only}
                onChange={(e) => setForm({ ...form, members_only: e.target.checked })}
              />
              Yalnız üyelere
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.combinable}
                onChange={(e) => setForm({ ...form, combinable: e.target.checked })}
              />
              Diğer kampanyalarla birleşebilir
            </label>
            <span className="text-[var(--p-muted)]">Birleşenlerin toplamı sepetin %35'ini aşamaz.</span>
          </div>

          {/* Canlı önizleme — kaydetmeden etkisini gör */}
          <div className="rounded-[4px] border border-[var(--p-line)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-[var(--p-muted)]">Canlı önizleme</span>
              <PButton variant="ghost" onClick={onizle} disabled={onizleniyor}>
                {onizleniyor ? 'Hesaplanıyor…' : 'Örnek sepette dene'}
              </PButton>
            </div>
            {onizleme && (
              <div className="mt-2 space-y-1 text-[12px]">
                <p className="text-[var(--p-muted)]">
                  {onizleme.ornekSepet.map((k: any) => `${k.adet} × ${k.ad}`).join(' + ') || 'örnek sepet'}
                </p>
                <p>
                  Ara toplam <strong>{formatPrice(onizleme.ozet.araToplam)}</strong> → indirim{' '}
                  <strong className="text-[var(--p-success)]">{formatPrice(onizleme.ozet.indirimToplami)}</strong> →
                  toplam <strong>{formatPrice(onizleme.ozet.toplam)}</strong>
                </p>
                {onizleme.ozet.indirimToplami === 0 && (
                  <p className="text-[var(--p-danger)]">
                    Bu sepette indirim üretmiyor — koşulları kontrol edin.
                  </p>
                )}
                {onizleme.ozet.tavanUygulandi && (
                  <p className="text-[var(--p-muted)]">%35 indirim tavanı uygulandı.</p>
                )}
              </div>
            )}
          </div>

          {/* Vitrin metni ARTIK HER TİPTE görünür (Faz 20). Eskiden yalnız
              type='banner' kampanyalarda çıkıyordu; bu yüzden NB30'un metni
              hiç yazılamamıştı ve bant kampanyanın PANEL ADINI basıyordu. */}
          <div>
            <label className="mb-1 block text-[12px] text-[var(--p-muted)]">
              Vitrin metni <span className="text-[var(--p-muted)]">(boş bırakılırsa otomatik üretilir)</span>
            </label>
            <PInput
              value={form.banner_text}
              onChange={(e) => setForm({ ...form, banner_text: e.target.value })}
              placeholder="ör. Yaza merhaba: tüm ürünlerde %30"
            />
            <VitrinOnizleme form={form} />
          </div>
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

/**
 * "Vitrinde şöyle görünecek" satırı (Faz 20).
 *
 * Metni ve uygunluk kararını ÜRETİMDEKİ fonksiyonlardan alır (vitrinMetni,
 * tipCevir, kapsamCevir) — önizlemenin gerçekten olacak şeyi göstermesi buna
 * bağlı. Kod gerektiren ve kişiye özel kupon üreten kampanyalar bantta
 * çıkmaz; önizleme bunu da söyler.
 */
function VitrinOnizleme({ form }: { form: Form }) {
  const koduVar = form.type === 'discount_code'
  const ham: any = {
    type: form.type,
    scope: form.scope,
    discount_type: form.discount_type,
  }
  const tip = tipCevir(ham)

  if (koduVar) {
    return (
      <p className="mt-2 rounded-[4px] bg-[var(--p-surface-muted)] px-3 py-2 text-[11px] leading-relaxed text-[var(--p-muted)]">
        <strong>Vitrinde görünmez.</strong> Kod gerektiren kampanyalar bantta duyurulmaz —
        müşteriye kodu kendisi girmesi gereken bir indirimi bant olarak göstermek yanıltıcı olur.
      </p>
    )
  }

  if (!tip) {
    return (
      <p className="mt-2 rounded-[4px] bg-[var(--p-surface-muted)] px-3 py-2 text-[11px] text-[var(--p-muted)]">
        Bu tip indirim üretmiyor; vitrin bandında görünmez.
      </p>
    )
  }

  const k: any = {
    id: '',
    ad: form.name,
    tip,
    kapsam: kapsamCevir(ham),
    hedefler: form.targets ?? [],
    deger: Number(form.discount_value) || null,
    minSepet: Number(form.min_cart_amount) || 0,
    minAdet: Number(form.min_item_count) || 0,
    alAdet: Number(form.buy_quantity) || null,
    odeAdet: Number(form.pay_quantity) || null,
    kademeler: (form.tiers ?? []).map((t) => ({
      minTutar: Number(t.minTutar) || 0,
      oran: Number(t.oran) || 0,
    })),
    birlesebilir: form.combinable,
    oncelik: 100,
    ilkAlisverisMi: form.first_order_only,
    sadeceUyelere: form.members_only,
    koduVar: false,
  }

  const metin = vitrinMetni(k, form.banner_text, (slug) => CATEGORIES.find((c) => c.slug === slug)?.title)

  if (!metin) {
    return (
      <p className="mt-2 rounded-[4px] bg-[var(--p-warning-bg)] px-3 py-2 text-[11px] text-[var(--p-warning)]">
        Metin üretilemedi — bant <strong>hiç basılmaz</strong>. Oran/tutar alanlarını doldurun
        ya da vitrin metnini elle yazın.
      </p>
    )
  }

  return (
    <div className="mt-2 rounded-[4px] border border-[var(--p-line)] bg-[var(--p-surface-muted)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--p-muted)]">Vitrinde şöyle görünecek</p>
      <p className="mt-1 text-[12px] uppercase tracking-[0.14em] text-[var(--p-ink)]">{metin}</p>
      <p className="mt-1 text-[11px] text-[var(--p-muted)]">
        Tıklayınca: <code>{vitrinHedefi(k)}</code>
      </p>
    </div>
  )
}
