/**
 * Fatura turunun BB'ye özeti.
 *
 * Mail yalnız iki durumda gider: yeni taslak açıldıysa, ya da elle bakılacak /
 * uyarı / hata listesi bir önceki maildekinden farklıysa. Aynı açık konu her
 * sabah tekrar gelmesin diye son listenin parmak izi alert_state'te
 * (`fatura_ozet`) tutulur.
 */
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMail } from '@/lib/emails/send'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import type { FaturaIsiSonucu } from './is'

const OZET = 'fatura_ozet'
const TUR_ADI = { normal: 'Normal satış', kurumsal: 'Kurumsal', mikro: 'Mikro ihracat' } as const

const kacis = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function faturaOzetEposta(s: FaturaIsiSonucu): { subject: string; html: string } {
  const p: string[] = []
  if (s.kesildi.length) {
    p.push(
      `<p>${s.kesildi.length} siparişin faturası e-Arşiv Portal'da taslak olarak hazır. ` +
        `İmza için: e-Arşiv Portal, Düzenlenen Belgeler, taslakları seç, GİB İmza. ` +
        `Sonra her birini Trendyol'da kendi siparişine yükle.</p>`
    )
    p.push(
      '<table cellpadding="6" style="border-collapse:collapse;font-size:14px">' +
        '<tr><th align="left">Sipariş</th><th align="left">Belge</th><th align="left">Tür</th><th align="right">Tutar</th></tr>' +
        s.kesildi
          .map(
            (k) =>
              `<tr><td>${kacis(k.siparis)}</td><td>${kacis(k.belge ?? '—')}</td>` +
              `<td>${TUR_ADI[k.tur]}</td><td align="right">${tl(k.tutar)} TL</td></tr>`
          )
          .join('') +
        '</table>'
    )
  }
  if (s.elle.length) {
    p.push('<p>Sistemin kesmediği, elle bakılması gereken siparişler:</p>')
    p.push(`<ul>${s.elle.map((e) => `<li>${kacis(e.siparis)}: ${kacis(e.neden)}</li>`).join('')}</ul>`)
  }
  if (s.uyari.length) {
    p.push(
      '<p>İptal ya da iade olmuş ama faturası bulunan siparişler. İmzasız taslaksa portalda silinebilir; ' +
        'imzalıysa iptal ya da iade faturası gerekir:</p>'
    )
    p.push(
      `<ul>${s.uyari
        .map((u) => `<li>${kacis(u.siparis)} (${kacis(u.durum)}): ${kacis(u.belge)}, ${kacis(u.onay)}</li>`)
        .join('')}</ul>`
    )
  }
  if (s.hatalar.length) {
    p.push('<p>Hatalar:</p>')
    p.push(`<ul>${s.hatalar.map((h) => `<li>${kacis(h)}</li>`).join('')}</ul>`)
  }
  p.push(`<p style="color:#777;font-size:12px">Tur: ${kacis(s.zaman)} · Trendyol paketi: ${s.paket} · GİB: ${s.gib}</p>`)

  const subject = s.kesildi.length
    ? `Fatura taslağı hazır: ${s.kesildi.length} sipariş`
    : s.hatalar.length
      ? 'Fatura turu: hata var'
      : 'Fatura turu: bakılacak sipariş var'
  return { subject, html: p.join('\n') }
}

function parmakIzi(s: FaturaIsiSonucu): string {
  const icerik = JSON.stringify([
    s.elle.map((e) => `${e.siparis}:${e.neden}`).sort(),
    s.uyari.map((u) => `${u.siparis}:${u.belge}:${u.onay}`).sort(),
    s.hatalar.map((h) => h.replace(/\d{8,}/g, '#')).sort(),
  ])
  return createHash('sha256').update(icerik).digest('hex').slice(0, 32)
}

/**
 * Gerekiyorsa özeti gönderir. `zorla`: panelden elle tetiklenen turda aynı
 * konular yeniden de olsa gider; söylenecek hiçbir şey yoksa yine gitmez.
 */
export async function ozetiGonder(s: FaturaIsiSonucu, zorla = false): Promise<string> {
  const konuVar = s.elle.length + s.uyari.length + s.hatalar.length > 0
  if (!s.kesildi.length && !konuVar) return 'gerekmedi'

  const iz = parmakIzi(s)
  const db = createServiceClient()
  if (!s.kesildi.length && !zorla) {
    const { data } = await db.from('alert_state').select('fingerprint').eq('key', OZET).maybeSingle()
    if (data?.fingerprint === iz) return 'aynı konular, tekrar gönderilmedi'
  }

  const mail = faturaOzetEposta(s)
  const sonuc = await sendMail({ to: await bildirimAdresi(), subject: mail.subject, html: mail.html, label: 'Fatura özeti' })
  if (sonuc.error) return `hata: ${sonuc.error}`

  const simdi = new Date().toISOString()
  await db
    .from('alert_state')
    .upsert({ key: OZET, fingerprint: iz, last_sent_at: simdi, count: 1, updated_at: simdi }, { onConflict: 'key' })
  return `gönderildi (${sonuc.id})`
}
