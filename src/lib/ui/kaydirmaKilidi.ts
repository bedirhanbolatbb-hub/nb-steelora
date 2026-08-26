/**
 * Açık katman varken arka planın kaymasını engeller (Faz 11B).
 *
 * ÖLÇÜLEN KUSUR: `document.body.style.overflow = 'hidden'` yazılıyordu ama
 * hiçbir şey yapmıyordu. Sebep: globals.css'te `html { overflow-x: clip }`
 * var. Kök elemanın overflow'u `visible` olmaktan çıktığı anda, body'nin
 * overflow'unun görüntü alanına YAYILMASI (viewport propagation) devre dışı
 * kalıyor — kaydırılan eleman artık `html` oluyor ve body'ye konan kilit
 * okunmuyor bile.
 *
 * Ölçüm (390px, mobil menü açık, gerçek dokunmatik sürükleme):
 * scrollY 400 → 1220. Yani menü açıkken arka sayfa 820px kayıyordu.
 *
 * Çözüm: kilidi KÖK elemana da koymak. Kapanışta satır içi biçim silinir,
 * CSS'teki `overflow-x: clip` geri gelir.
 *
 * Sayaç tutuluyor: sepet paneli, arama kutusu ve mobil menü arka arkaya ya da
 * iç içe açılıp kapanabiliyor; ilk kapanan diğerinin kilidini düşürmemeli.
 */

let sayac = 0

export function kaydirmaKilidiAc(): void {
  if (typeof document === 'undefined') return
  sayac += 1
  if (sayac > 1) return
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
}

export function kaydirmaKilidiKapat(): void {
  if (typeof document === 'undefined') return
  sayac = Math.max(0, sayac - 1)
  if (sayac > 0) return
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
}

/** React efektlerinde doğrudan kullanılır: açıkken kilitler, temizlikte bırakır. */
export function kaydirmaKilidi(acik: boolean): () => void {
  if (!acik) return () => {}
  kaydirmaKilidiAc()
  return kaydirmaKilidiKapat
}
