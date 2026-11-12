# NB Steelora — Tosla İşim kartla ödeme (12 Kas 2026, dal: tosla-odeme)

Çalışma kopyası: VM içinde $HOME/nbs-tosla (asıl depo $HOME/mnt/nb-steelora'ya
dokunulmaz; o depoda başka oturumun işleri sürüyor). Hazır olunca dal asıl
depoya `git push $HOME/mnt/nb-steelora tosla-odeme` ile taşınır, main'e
yeniden temellenir.

Bekleyen dış koşul: Kübra Yılmaz (Tosla) — nbsteelora.com aynı üye işyerine
eklenebilir mi, yoksa ayrı başvuru mu (12 Kas 20.22'de soruldu).

## Akış (KarPanel'deki çalışan akışın aynısı)
1. /api/payment/initialize: sepet + kampanya + kimlik SUNUCUDA (değişmez);
   pending sipariş açılır; Tosla threeDPayment → oturum; yanıt {yonlendir}.
   Kart bilgisi sitemize HİÇ gelmez (Tosla'nın ortak ödeme sayfası).
2. Müşteri Tosla sayfasında kartı girer, 3D'yi geçer.
3. Tosla → POST /api/payment/tosla-donus. İmza doğrulanır (kayıt), karar
   SORGUDAN (inquiry): tutar + para birimi + durum. Ödendiyse mevcut
   odemeSonrasiIsle + bildirimler (havale ile ortak zincir).
4. İptal/iade: aynı gün tam tutar → void, değilse refund (kısmi destekli).

## Kimlik (Vercel, BB girer)
TOSLA_CLIENT_ID · TOSLA_API_USER · TOSLA_API_PASS · TOSLA_ORTAM(test|canli)
TOSLA_ODEME_ACIK=evet olmadıkça kart seçeneği görünmez, uç 503 döner.

## Maddeler
- [ ] lib/tosla/client.ts (KarPanel app/lib/tosla.ts portu)
- [ ] lib/tosla/karar.ts (dönüş kararı, saf fonksiyon) + kısmi iade payı
- [ ] initialize → Tosla
- [ ] tosla-donus ucu (+ bekleyen sorgusu)
- [ ] iptal / iade / kalem iptali → Tosla
- [ ] ödeme sayfası: Kart / Havale seçimi (havale indirimi yalnız havalede)
- [ ] metinler: gizlilik (işleyen: Aköde), sözleşme ödeme maddesi, sürüm
- [ ] panel etiketleri, e-posta metni, analiz iç kaynak listesi
- [ ] testler + deneme ortamı ölçümü
