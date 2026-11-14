/**
 * e-Arşiv fatura görüntüsü → PDF (14 Kas 2026).
 *
 * BB'nin elle yaptığının aynısı: portalın "Görüntüle" sayfası (GİB'in kendi
 * HTML'i, karekod betiği ve logolar içinde) tarayıcıda açılır ve PDF'ye
 * yazdırılır. Sunucuda başsız Chromium (@sparticuz/chromium, Vercel'de
 * çalışan derleme; bundle dışı tutulur — next.config serverExternalPackages).
 *
 * Denetim (biri tutmazsa PDF üretilmez, fatura yüklenmez):
 *  - Sayfa dışarıya hiçbir istek atamaz (yalnız satır içi data: kaynakları).
 *  - Karekod gerçekten çizilmiş olmalı (#qrcode içindeki resim yüklü).
 *  - Yazdırılan sayfanın görünen metninde belge numarası ve ETTN geçmeli.
 *  - Çıktı gerçekten PDF ("%PDF-"), makul boyda (5 KB – 9,5 MB; Trendyol
 *    sınırı 10 MB) ve 1–3 sayfa.
 */
import type { Browser } from 'puppeteer-core'

const SAYFA_SURESI_MS = 15_000

export async function pdfTarayicisiAc(): Promise<Browser> {
  const chromium = (await import('@sparticuz/chromium')).default
  const puppeteer = (await import('puppeteer-core')).default
  chromium.setGraphicsMode = false
  return puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    defaultViewport: { width: 1240, height: 1754, deviceScaleFactor: 1 },
    executablePath: await chromium.executablePath(),
    headless: 'shell',
  })
}

export async function pdfTarayicisiKapat(tarayici: Browser | null): Promise<void> {
  if (!tarayici) return
  try {
    await tarayici.close()
  } catch {
    /* süreç zaten bitmiş olabilir */
  }
}

function sayfaSayisi(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length
}

export async function faturaPdf(tarayici: Browser, html: string, belge: string, ettn: string): Promise<Buffer> {
  const sayfa = await tarayici.newPage()
  try {
    await sayfa.setRequestInterception(true)
    sayfa.on('request', (istek) => {
      if (istek.url().startsWith('data:')) void istek.continue()
      else void istek.abort()
    })
    await sayfa.setContent(html, { waitUntil: 'load', timeout: SAYFA_SURESI_MS })
    await sayfa.waitForFunction(
      () => {
        const resim = document.querySelector('#qrcode img') as HTMLImageElement | null
        return !!resim && resim.complete && resim.naturalWidth > 0
      },
      { timeout: SAYFA_SURESI_MS }
    )
    const metin = await sayfa.evaluate(() => document.body.innerText)
    if (!metin.includes(belge) || !metin.toLowerCase().includes(ettn.toLowerCase())) {
      throw new Error('yazdırılacak sayfada belge numarası ya da ETTN görünmüyor')
    }
    const pdf = Buffer.from(
      await sayfa.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
        timeout: SAYFA_SURESI_MS,
      })
    )
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('PDF üretilemedi')
    if (pdf.length < 5_000 || pdf.length > 9_500_000) throw new Error(`PDF boyu beklenmedik (${pdf.length} bayt)`)
    const n = sayfaSayisi(pdf)
    if (n < 1 || n > 3) throw new Error(`PDF ${n} sayfa çıktı`)
    return pdf
  } finally {
    await sayfa.close().catch(() => {})
  }
}
