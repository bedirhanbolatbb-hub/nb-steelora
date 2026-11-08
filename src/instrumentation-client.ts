/**
 * Tarayıcı tarafı Sentry — GECİKMELİ yükleme (8 Kas 2026, ana sayfa hızı).
 *
 * ÖLÇÜM: Sentry SDK'sı (iz kırıntıları, sayfa geçişi ve web-vitals izleme
 * kodu dahil) ilk yükteki en büyük JS dosyasının ~150 KB'lık (açık) kısmıydı.
 * Telefonda bu betikler ana sayfanın en büyük görseliyle (LCP) bant
 * genişliğini paylaşıyordu; PageSpeed mobil LCP 3,0–3,2 sn.
 *
 * ŞİMDİ: SDK sayfa yüklenip tarayıcı boşta kalınca iner ve başlar. Hatalar
 * yine kaybolmaz: o ana kadar olanlar (React 19 hidrasyon hataları dahil —
 * bunları window "error" olayıyla bildirir) bir kuyrukta bekler, SDK
 * başlayınca Sentry'ye gönderilir. Kuyruk en fazla 20 olay tutar. SDK
 * inemezse (ağ, reklam engelleyici) sayfa etkilenmez.
 *
 * Oturum tekrarı (replay) ve performans izleme AÇILMADI: ikisi de ekranı ve
 * kişisel veriyi Sentry'ye taşır, ayrıca istemciye ciddi JS yükler.
 * `onRouterTransitionStart` dışa aktarılmıyor: yalnız sayfa geçişi izlemesi
 * (tracing) içindir ve izleme kapalı (tracesSampleRate 0).
 */
const bekleyen: unknown[] = []

function hataDinle(olay: ErrorEvent) {
  if (bekleyen.length < 20) bekleyen.push(olay.error ?? new Error(olay.message))
}

function redDinle(olay: PromiseRejectionEvent) {
  if (bekleyen.length < 20) bekleyen.push(olay.reason)
}

function baslat() {
  // Paketin tamamı değil, yalnız init + captureException (lib/izleme/sentryIstemci).
  import('@/lib/izleme/sentryIstemci')
    .then(({ sentryBaslat }) => {
      window.removeEventListener('error', hataDinle)
      window.removeEventListener('unhandledrejection', redDinle)
      sentryBaslat(bekleyen.splice(0))
    })
    .catch(() => {
      // SDK inmediyse sessiz kal: hata gözcüsü sayfayı asla bozmaz.
    })
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', hataDinle)
  window.addEventListener('unhandledrejection', redDinle)
  const zamanla = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(baslat, { timeout: 4000 })
    else setTimeout(baslat, 2000)
  }
  if (document.readyState === 'complete') zamanla()
  else window.addEventListener('load', zamanla, { once: true })
}
