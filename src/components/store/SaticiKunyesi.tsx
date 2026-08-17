import type { Kunye } from '@/lib/legal/veriSorumlusu'
import { WHATSAPP_DISPLAY, WHATSAPP_URL } from '@/lib/contact'

/**
 * Satıcı künyesi — Mesafeli Sözleşmeler Yönetmeliği ve 6563 sayılı E-Ticaret
 * Kanunu'nun satıcı bilgisi zorunluluğu için (Faz 12 tamamlama).
 *
 * Tek kaynak site_content'teki veri_sorumlusu_* anahtarlarıdır; BOŞ alanlar
 * hiç basılmaz. Panelde eksik zorunlu alan uyarısı görünür.
 * `varsayilan` ile, künye hiç doldurulmamışsa asgari bilgi basılabilir
 * (hukuki sayfalar satıcı bilgisi olmadan yayına çıkmamalı).
 */
export default function SaticiKunyesi({
  kunye,
  varsayilan = true,
  baslikYok = false,
}: {
  kunye: Kunye
  varsayilan?: boolean
  baslikYok?: boolean
}) {
  const satirlar: { etiket: string; deger: React.ReactNode }[] = []

  const ekle = (etiket: string, deger: string | null | undefined) => {
    if (deger && deger.trim()) satirlar.push({ etiket, deger: deger.trim() })
  }

  // Mesafeli Sözleşmeler Yönetmeliği m.5 ve 6563 sayılı E-Ticaret Kanunu:
  // unvan, açık adres, telefon, e-posta ve vergi bilgisi ayrı ayrı görünmeli.
  ekle('Unvan', kunye.unvan || (varsayilan ? 'NB Steelora' : ''))
  ekle('Adres', kunye.adres || (varsayilan ? 'Mezitli / Mersin / Türkiye' : ''))
  ekle('Telefon', kunye.telefon || (varsayilan ? WHATSAPP_DISPLAY : ''))
  ekle('E-posta', kunye.eposta || (varsayilan ? 'info@nbsteelora.com' : ''))
  ekle('Vergi dairesi', kunye.vergiDairesi)
  ekle('Vergi no', kunye.vergi)
  ekle('MERSİS', kunye.mersis)
  ekle('KEP', kunye.kep)

  if (kunye.etbis) {
    satirlar.push({
      etiket: 'ETBİS',
      deger: kunye.etbis.startsWith('http') ? (
        <a
          href={kunye.etbis}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-4"
        >
          Kayıt doğrulama
        </a>
      ) : (
        kunye.etbis
      ),
    })
  }

  satirlar.push({
    etiket: 'WhatsApp',
    deger: (
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline underline-offset-4"
      >
        {WHATSAPP_DISPLAY}
      </a>
    ),
  })
  satirlar.push({ etiket: 'Web', deger: 'www.nbsteelora.com' })

  if (satirlar.length === 0) return null

  return (
    <div>
      {!baslikYok && <h2>Satıcı Bilgileri</h2>}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[max-content_1fr]">
        {satirlar.map((s) => (
          <div key={s.etiket} className="contents">
            <dt className="text-muted">{s.etiket}</dt>
            <dd className="text-ink">{s.deger}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
