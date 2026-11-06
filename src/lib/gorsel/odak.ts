/**
 * Ürün odağı — fotoğrafta takının nerede durduğunu bulur (Faz 35 · vitrin kadrajı).
 *
 * ── Neden ──
 * Katalogdaki fotoğrafların tamamı 1200×1800; takı karenin küçük bir parçasını
 * kaplıyor (saten zeminde bileklik, büstte küpe). Kartta 4:5'e kırpılınca ürün
 * telefonda birkaç milimetre kalıyordu. Yeni çekim yapılmadan ürünü büyütmenin
 * tek yolu kadrajı ürüne göre kurmak.
 *
 * ── Nasıl ──
 * Yapay zekâ modeli YOK (sunucuda ağır, ücretli ya da lisanslı). Takıyı zeminden
 * ayıran iki fiziksel ipucu yeterli çıktı (6 Kas 2026, 18 fotoğraflık örneklem):
 *   1. İnce yapı: zincir, taş, metal kenarı küçük ölçekli parlak/koyu ayrıntıdır.
 *      Saten kıvrımı ve büst yüzeyi büyük ölçeklidir. Morfolojik "top-hat"
 *      (ayrıntı − ayrıntısız hâli) yalnız küçük ölçekli yapıyı bırakır.
 *   2. Sıcak metal rengi: altın kaplama ve renkli taşlar doygun sarı-turuncu;
 *      gri saten ve beyaz büst doygunluksuz. Pembe kutu bu aralığın dışında.
 * İki ipucu toplanır, en güçlü bölgeler kalır, tek tük parazit atılır; kalan
 * kütlenin ağırlıklı yüzdelikleri ürün kutusudur. Güvenilir odak yoksa null
 * döner ve kart bugünkü ortadan kırpıma düşer — en kötü durum "değişiklik yok".
 *
 * Bu dosya saf hesaptır (sharp'a bağlı değil): ham RGB alır, kesir döner.
 * Böylece sunucu ucu da test de aynı fonksiyonu çalıştırır.
 */

export type Kutu = { x0: number; y0: number; x1: number; y1: number }
export type Kirpim = { left: number; top: number; width: number; height: number }

const SICAK_TON_ALT = 18
const SICAK_TON_UST = 62

function cekirdek(sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3))
  const k = new Float32Array(2 * r + 1)
  let s = 0
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma))
    k[i + r] = v
    s += v
  }
  for (let i = 0; i < k.length; i++) k[i] /= s
  return k
}

function bulanik(src: Float32Array, W: number, H: number, sigma: number): Float32Array {
  const k = cekirdek(sigma)
  const r = (k.length - 1) / 2
  const ara = new Float32Array(W * H)
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const satir = y * W
    for (let x = 0; x < W; x++) {
      let s = 0
      for (let i = -r; i <= r; i++) {
        const xx = x + i < 0 ? 0 : x + i >= W ? W - 1 : x + i
        s += src[satir + xx] * k[i + r]
      }
      ara[satir + x] = s
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0
      for (let i = -r; i <= r; i++) {
        const yy = y + i < 0 ? 0 : y + i >= H ? H - 1 : y + i
        s += ara[yy * W + x] * k[i + r]
      }
      out[y * W + x] = s
    }
  }
  return out
}

/** (2r+1)×(2r+1) kare penceride en küçük ya da en büyük değer (ayrık, iki geçiş). */
function pencere(src: Float32Array, W: number, H: number, r: number, enBuyuk: boolean): Float32Array {
  const ara = new Float32Array(W * H)
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const satir = y * W
    for (let x = 0; x < W; x++) {
      let m = src[satir + x]
      for (let i = -r; i <= r; i++) {
        const xx = x + i < 0 ? 0 : x + i >= W ? W - 1 : x + i
        const v = src[satir + xx]
        if (enBuyuk ? v > m : v < m) m = v
      }
      ara[satir + x] = m
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let m = ara[y * W + x]
      for (let i = -r; i <= r; i++) {
        const yy = y + i < 0 ? 0 : y + i >= H ? H - 1 : y + i
        const v = ara[yy * W + x]
        if (enBuyuk ? v > m : v < m) m = v
      }
      out[y * W + x] = m
    }
  }
  return out
}

function yuzdelik(src: Float32Array, q: number): number {
  const s = Float32Array.from(src).sort()
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]
}

/**
 * Ürün kutusunu bulur.
 * @param rgb  ham RGB (ya da RGBA, `kanal` ile) — analiz boyutunda (≈240 px en)
 * @returns kaynağın kesri olarak kutu (0–1) ya da güvenilir odak yoksa null
 */
export function urunKutusu(rgb: Uint8Array, W: number, H: number, kanal = 3): Kutu | null {
  const n = W * H
  const L = new Float32Array(n)
  const doygun = new Float32Array(n)
  for (let i = 0, p = 0; i < n; i++, p += kanal) {
    const r = rgb[p] / 255
    const g = rgb[p + 1] / 255
    const b = rgb[p + 2] / 255
    L[i] = 0.299 * r + 0.587 * g + 0.114 * b
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    const sat = (mx - mn) / (mx + 1e-6)
    let ton = 0
    const d = mx - mn + 1e-6
    if (mx === r) ton = ((((g - b) / d) % 6) + 6) % 6
    else if (mx === g) ton = (b - r) / d + 2
    else ton = (r - g) / d + 4
    ton = (ton * 60) % 360
    const sicak = ton > SICAK_TON_ALT && ton < SICAK_TON_UST
    doygun[i] = sicak && mx > 0.3 && sat > 0.18 ? sat : 0
  }

  // 1. İnce yapı: beyaz + siyah top-hat (7×7 pencere)
  const Ls = bulanik(L, W, H, 0.6)
  const acilis = pencere(pencere(Ls, W, H, 3, false), W, H, 3, true)
  const kapanis = pencere(pencere(Ls, W, H, 3, true), W, H, 3, false)
  const tepe = new Float32Array(n)
  for (let i = 0; i < n; i++) tepe[i] = Ls[i] - acilis[i] + (kapanis[i] - Ls[i])
  const ayrinti = bulanik(tepe, W, H, 1.5)
  // 2. Sıcak metal rengi
  const renk = bulanik(doygun, W, H, 1.5)

  const qa = yuzdelik(ayrinti, 0.998) + 1e-9
  const qr = yuzdelik(renk, 0.998) + 1e-9
  const S = new Float32Array(n)
  const kenar = Math.floor(W * 0.03)
  let enYuksek = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (x < kenar || y < kenar || x >= W - kenar || y >= H - kenar) continue
      const v = 0.7 * Math.min(1, ayrinti[i] / qa) + 0.6 * Math.min(1, renk[i] / qr)
      S[i] = v
      if (v > enYuksek) enYuksek = v
    }
  }
  if (enYuksek <= 0) return null

  const esik = Math.max(yuzdelik(S, 0.975), 0.3 * enYuksek)
  const M = new Uint8Array(n)
  for (let i = 0; i < n; i++) if (S[i] >= esik) M[i] = 1

  // Tek tük parazitleri at: maske 3 px genişletilip bileşenlere ayrılır,
  // en büyük kütlenin %18'inden küçük bileşenler düşer.
  const genis = pencere(Float32Array.from(M), W, H, 3, true)
  const etiket = new Int32Array(n)
  const kutle: number[] = [0]
  let sayi = 0
  const kuyruk = new Int32Array(n)
  for (let i = 0; i < n; i++) {
    if (genis[i] < 0.5 || etiket[i]) continue
    sayi++
    let bas = 0
    let son = 0
    kuyruk[son++] = i
    etiket[i] = sayi
    let k = 0
    while (bas < son) {
      const j = kuyruk[bas++]
      if (M[j]) k += S[j]
      const x = j % W
      const komsular = [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]
      for (const m of komsular) {
        if (m < 0 || m >= n || etiket[m] || genis[m] < 0.5) continue
        etiket[m] = sayi
        kuyruk[son++] = m
      }
    }
    kutle.push(k)
  }
  const enBuyukKutle = Math.max(...kutle)
  if (enBuyukKutle <= 0) return null

  const xs: number[] = []
  const ys: number[] = []
  const ws: number[] = []
  for (let i = 0; i < n; i++) {
    if (!M[i] || kutle[etiket[i]] < 0.18 * enBuyukKutle) continue
    xs.push(i % W)
    ys.push(Math.floor(i / W))
    ws.push(S[i])
  }
  if (xs.length < 4) return null

  const agirlikliYuzdelik = (v: number[], q: number) => {
    const sira = v.map((_, i) => i).sort((a, b) => v[a] - v[b])
    let toplam = 0
    for (const i of sira) toplam += ws[i]
    let birikim = 0
    for (const i of sira) {
      birikim += ws[i]
      if (birikim / toplam >= q) return v[i]
    }
    return v[sira[sira.length - 1]]
  }

  return {
    x0: agirlikliYuzdelik(xs, 0.03) / W,
    x1: (agirlikliYuzdelik(xs, 0.97) + 1) / W,
    y0: agirlikliYuzdelik(ys, 0.03) / H,
    y1: (agirlikliYuzdelik(ys, 0.97) + 1) / H,
  }
}

/**
 * Ürün kutusundan kart kadrajı (piksel).
 * @param oran  kadrajın en/boy oranı (4:5 = 0.8)
 * @param pay   ürün kutusunun çevresine bırakılan boşluk çarpanı
 * @param enKucuk  kadraj en az kaynağın bu kadarı geniş olur (aşırı yakınlaşma
 *                 ve bulanık büyütme sınırı)
 */
export function kadrajHesapla(
  kutu: Kutu | null,
  kaynakEn: number,
  kaynakBoy: number,
  oran: number,
  pay: number,
  enKucuk: number
): Kirpim {
  const tamEn = Math.min(kaynakEn, kaynakBoy * oran)
  if (!kutu) {
    // Odak bulunamadı: bugünkü davranış — ortadan kırpım.
    const h = tamEn / oran
    return {
      left: Math.round((kaynakEn - tamEn) / 2),
      top: Math.round((kaynakBoy - h) / 2),
      width: Math.round(tamEn),
      height: Math.round(h),
    }
  }
  const bw = (kutu.x1 - kutu.x0) * kaynakEn
  const bh = (kutu.y1 - kutu.y0) * kaynakBoy
  const cx = ((kutu.x0 + kutu.x1) / 2) * kaynakEn
  const cy = ((kutu.y0 + kutu.y1) / 2) * kaynakBoy
  let cw = Math.max(bw * pay, bh * pay * oran, kaynakEn * enKucuk)
  let ch = cw / oran
  if (ch > kaynakBoy) {
    ch = kaynakBoy
    cw = ch * oran
  }
  if (cw > kaynakEn) {
    cw = kaynakEn
    ch = cw / oran
  }
  const left = Math.min(Math.max(cx - cw / 2, 0), kaynakEn - cw)
  const top = Math.min(Math.max(cy - ch / 2, 0), kaynakBoy - ch)
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.max(1, Math.min(Math.round(cw), kaynakEn - Math.round(left))),
    height: Math.max(1, Math.min(Math.round(ch), kaynakBoy - Math.round(top))),
  }
}
