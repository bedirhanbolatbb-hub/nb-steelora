/**
 * Trendyol'a yüklenen fatura dosyasını geri okuyup doğrulama (14 Kas 2026).
 *
 * Yükleme sonrası pakette "fatura var" görmek, DOĞRU dosyanın DOĞRU pakete
 * gittiğini kanıtlamaz. Bu modül Trendyol'un sakladığı PDF'i (paketin
 * invoiceLink adresi) indirir, içindeki görünür metni çıkarır ve şunlara bakar:
 *   - içinde TEK bir GİB belge numarası var ve o, yüklediğimiz belge,
 *   - ETTN görünüyorsa yüklediğimiz belgenin ETTN'i,
 *   - 1–3 sayfa, "İMZASIZ" filigranı yok.
 * Kişisel veri okunmaz/loglanmaz: dönen değer yalnız tamam/neden.
 *
 * PDF çözümü yalnız bizim ürettiğimiz biçim için yeterli (Chromium/Skia:
 * nesne akışı yok, Type0/Identity-H fontlar, ToUnicode haritaları, Flate
 * sıkıştırma). Çözülemeyen dosya "doğrulanamadı" sayılır — kapalı başarısızlık.
 * Aynı yöntem 14 Kas'ta tarayıcıda 8 gerçek Trendyol dosyasında denendi.
 */
import { inflateSync } from 'zlib'

export type DosyaDogrulama = { tamam: true } | { tamam: false; neden: string; belirsiz: boolean }

const EN_FAZLA_BAYT = 10 * 1024 * 1024
const BELGE = /GIB\d{13}/g
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

interface Nesne {
  govde: string
  bas: number
}

function nesneler(L: string): Map<string, Nesne> {
  const m = new Map<string, Nesne>()
  const re = /(\d+) 0 obj([\s\S]*?)endobj/g
  let x: RegExpExecArray | null
  while ((x = re.exec(L))) m.set(x[1], { govde: x[2], bas: x.index + x[0].indexOf(x[2]) })
  return m
}

function akis(buf: Buffer, objs: Map<string, Nesne>, no: string): string | null {
  const o = objs.get(no)
  if (!o) return null
  const g = o.govde
  const s = g.indexOf('stream')
  if (s < 0) return null
  let ds = s + 6
  if (g[ds] === '\r') ds++
  if (g[ds] === '\n') ds++
  const sozluk = g.slice(0, s)
  let uz = NaN
  const lm = sozluk.match(/\/Length\s+(\d+)(\s+0\s+R)?/)
  if (lm) uz = lm[2] ? parseInt(objs.get(lm[1])?.govde.trim() ?? '', 10) : parseInt(lm[1], 10)
  if (!Number.isFinite(uz) || uz <= 0) uz = g.lastIndexOf('endstream') - ds
  // /Length kadar alınır: arkadaki satır sonu açmayı bozar.
  const bayt = buf.subarray(o.bas + ds, o.bas + ds + uz)
  if (!/FlateDecode/.test(sozluk)) return bayt.toString('latin1')
  try {
    return inflateSync(bayt).toString('latin1')
  } catch {
    return null
  }
}

function cmapCoz(t: string): Map<string, string> {
  const map = new Map<string, string>()
  const uni = (h: string) => {
    let s = ''
    for (let i = 0; i < h.length; i += 4) s += String.fromCharCode(parseInt(h.slice(i, i + 4), 16))
    return s
  }
  for (const blk of t.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const p of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) map.set(p[1].toUpperCase(), uni(p[2]))
  for (const blk of t.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
    for (const p of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const lo = parseInt(p[1], 16)
      const hi = parseInt(p[2], 16)
      const d = parseInt(p[3], 16)
      const w = p[1].length
      if (hi - lo > 0xffff) continue
      for (let c = lo; c <= hi; c++) map.set(c.toString(16).toUpperCase().padStart(w, '0'), String.fromCodePoint(d + (c - lo)))
    }
  return map
}

function sozlukIci(govde: string, anahtar: string, objs: Map<string, Nesne>): string {
  // "/Font <<...>>" ya da "/Font 12 0 R"
  const ref = govde.match(new RegExp(`/${anahtar}\\s+(\\d+) 0 R`))
  if (ref) return objs.get(ref[1])?.govde ?? ''
  const i = govde.search(new RegExp(`/${anahtar}\\s*<<`))
  if (i < 0) return ''
  const j = govde.indexOf('<<', i)
  let derinlik = 0
  for (let k = j; k < govde.length - 1; k++) {
    if (govde[k] === '<' && govde[k + 1] === '<') {
      derinlik++
      k++
    } else if (govde[k] === '>' && govde[k + 1] === '>') {
      derinlik--
      k++
      if (derinlik === 0) return govde.slice(j + 2, k - 1)
    }
  }
  return ''
}

/** Bizim biçimdeki (Chromium/Skia) bir PDF'in görünür metni ve sayfa sayısı. */
export function pdfMetni(buf: Buffer): { metin: string; sayfa: number } {
  const L = buf.toString('latin1')
  const objs = nesneler(L)
  const sayfalar = [...objs.entries()].filter(([, o]) => /\/Type\s*\/Page(?![s\w])/.test(o.govde))
  let metin = ''
  for (const [, sayfa] of sayfalar) {
    const kaynak = sozlukIci(sayfa.govde, 'Resources', objs) || sayfa.govde
    const fontBlok = sozlukIci(kaynak, 'Font', objs)
    const fontlar = new Map<string, Map<string, string>>()
    for (const f of fontBlok.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+) 0 R/g)) {
      const tu = (objs.get(f[2])?.govde ?? '').match(/\/ToUnicode\s+(\d+) 0 R/)
      const t = tu ? akis(buf, objs, tu[1]) : null
      if (t) fontlar.set(f[1], cmapCoz(t))
    }
    const cr = sayfa.govde.match(/\/Contents\s+(?:\[([^\]]+)\]|(\d+) 0 R)/)
    const icerikler = cr ? (cr[2] ? [cr[2]] : [...cr[1].matchAll(/(\d+) 0 R/g)].map((x) => x[1])) : []
    for (const no of icerikler) {
      const c = akis(buf, objs, no)
      if (!c) continue
      let aktif: Map<string, string> | null = null
      const tok = /\/([^\s/[\]<>()]+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>|\bT\*|\bTd\b|\bTD\b|\bET\b/g
      let t: RegExpExecArray | null
      while ((t = tok.exec(c))) {
        if (t[1] !== undefined) aktif = fontlar.get(t[1]) ?? null
        else if (t[2] !== undefined) {
          if (!aktif) continue
          const h = t[2].toUpperCase()
          for (let i = 0; i < h.length; i += 4) metin += aktif.get(h.slice(i, i + 4)) ?? ''
        } else metin += ' '
      }
    }
    metin += '\n'
  }
  return { metin, sayfa: sayfalar.length }
}

/** Metinden belge denetimi (saf; test edilebilir). */
export function metinDenetimi(
  m: { metin: string; sayfa: number },
  belge: string,
  ettn: string
): DosyaDogrulama {
  if (m.sayfa < 1 || m.sayfa > 3) return { tamam: false, neden: `${m.sayfa} sayfa`, belirsiz: false }
  if (/İMZASIZ|IMZASIZ/i.test(m.metin)) return { tamam: false, neden: 'dosyada İMZASIZ yazıyor', belirsiz: false }
  const sik = m.metin.replace(/\s+/g, '')
  const belgeler = [...new Set(sik.match(BELGE) ?? [])]
  if (belgeler.length === 0) return { tamam: false, neden: 'dosyada belge numarası okunamadı', belirsiz: false }
  if (belgeler.length > 1) return { tamam: false, neden: `dosyada ${belgeler.length} belge numarası var`, belirsiz: false }
  if (belgeler[0] !== belge) return { tamam: false, neden: `dosyadaki belge ${belgeler[0]}, beklenen ${belge}`, belirsiz: false }
  const uuidler = [...new Set(sik.toLowerCase().match(UUID) ?? [])]
  if (uuidler.length && !uuidler.includes(ettn.toLowerCase()))
    return { tamam: false, neden: 'dosyadaki ETTN yüklenen belgeninkiyle aynı değil', belirsiz: false }
  return { tamam: true }
}

function izinliAdres(link: string): boolean {
  try {
    const u = new URL(link)
    return u.protocol === 'https:' && (u.hostname === 'trendyol.com' || u.hostname.endsWith('.trendyol.com'))
  } catch {
    return false
  }
}

export type DosyaOkuma =
  | { ok: true; belgeler: string[]; ettn: string[]; sayfa: number; imzasiz: boolean; metin: { metin: string; sayfa: number } }
  | { ok: false; neden: string; belirsiz: boolean }

/**
 * Trendyol'daki dosyayı indirir ve metnini çözer. Ağ hatası/zaman aşımı
 * "belirsiz" döner (çağıran bir kez yeniden dener); bozuk/yabancı dosya kesin
 * hatadır. Dönen bilgide kişisel veri yok: yalnız belge numaraları, ETTN'ler,
 * sayfa sayısı ve filigran (metin alanı yalnız denetimde kullanılır,
 * hiçbir yere yazılmaz).
 */
export async function trendyolDosyasiniOku(link: string): Promise<DosyaOkuma> {
  if (!izinliAdres(link)) return { ok: false, neden: 'fatura bağlantısı Trendyol adresi değil', belirsiz: false }
  let yanit: Response
  try {
    yanit = await fetch(link, {
      cache: 'no-store',
      redirect: 'follow',
      headers: { 'User-Agent': `${process.env.TRENDYOL_SUPPLIER_ID} - SelfIntegration`, Accept: 'application/pdf,*/*' },
      signal: AbortSignal.timeout(20_000),
    })
  } catch (e) {
    return { ok: false, neden: `dosya indirilemedi (${(e as Error).name})`, belirsiz: true }
  }
  if (!yanit.ok)
    return { ok: false, neden: `dosya indirilemedi (HTTP ${yanit.status})`, belirsiz: yanit.status === 429 || yanit.status >= 500 }
  const buf = Buffer.from(await yanit.arrayBuffer())
  if (buf.length > EN_FAZLA_BAYT) return { ok: false, neden: 'dosya beklenenden büyük', belirsiz: false }
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') return { ok: false, neden: 'dosya PDF değil', belirsiz: false }
  let m: { metin: string; sayfa: number }
  try {
    m = pdfMetni(buf)
  } catch {
    return { ok: false, neden: 'dosyanın metni çözülemedi', belirsiz: false }
  }
  const sik = m.metin.replace(/\s+/g, '')
  return {
    ok: true,
    belgeler: [...new Set(sik.match(BELGE) ?? [])],
    ettn: [...new Set(sik.toLowerCase().match(UUID) ?? [])],
    sayfa: m.sayfa,
    imzasiz: /İMZASIZ|IMZASIZ/i.test(m.metin),
    metin: m,
  }
}

/** Yükleme sonrası denetim: Trendyol'daki dosya yüklediğimiz belge mi. */
export async function yuklenenDosyayiDogrula(link: string, belge: string, ettn: string): Promise<DosyaDogrulama> {
  const o = await trendyolDosyasiniOku(link)
  if (!o.ok) return { tamam: false, neden: o.neden, belirsiz: o.belirsiz }
  return metinDenetimi(o.metin, belge, ettn)
}
