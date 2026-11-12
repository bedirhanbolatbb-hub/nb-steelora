# NB Steelora — Tosla İşim kartla ödeme (dal: tosla-odeme)

Durum (13 Kas 2026 gece): KOD HAZIR, deneme ortamında doğrulandı, CANLIDA DEĞİL.
Dal asıl depoya yalnız DAL olarak kaydedildi; main'e birleştirilmedi.

Çalışma kopyası: VM içinde $HOME/nbs-tosla. Asıl depo $HOME/mnt/nb-steelora'da
başka oturumun işleri sürdüğü için main'e ve çalışma ağacına dokunulmadı.

Bekleyen dış koşul: Kübra Yılmaz (Tosla) — nbsteelora.com aynı üye işyerine
eklenebilir mi, yoksa ayrı başvuru mu (12 Kas 20.22'de soruldu).

## Akış
1. Ödeme ekranı: kart açıksa iki yol (kart öne gelir), kapalıysa bugünkü gibi
   yalnız havale/EFT + Trendyol bağlantısı. "Açık mı" sorusunun TEK cevabı
   lib/tosla/client `kartOdemesiAcikMi()` (TOSLA_ODEME_ACIK=evet VE kimlik tam).
2. /api/payment/initialize: sepet + kampanya + kimlik SUNUCUDA; bekleyen sipariş
   açılır (metadata.odeme_yontemi='kart', metadata.kart izi); Tosla threeDPayment
   → oturum; müşteri YALNIZ *.tosla.com adresine yönlenir. Kart bilgisi siteye
   hiç gelmez. Sepet burada boşaltılmaz (ödeme yarıda kalırsa yeniden dener).
3. Tosla → POST /api/payment/tosla-donus. İmza kaydı + karar SORGUDAN: durum,
   tutar (kuruşu kuruşuna), para birimi. Ödendiyse sipariş 'paid', mevcut
   odemeSonrasiIsle + bildirimler (havale ile ortak zincir), teşekkür sayfası
   ödemeyi yeniden doğrulayıp sepeti boşaltır.
4. Dönüşü gelmeyen ödeme: günlük rapor (/api/health/rapor) Tosla'ya yeniden
   sorar; 24 saatte tamamlanmayan deneme "tamamlanmadı" kapanır.
5. İptal/iade/kalem iptali: karar TOSLA'NIN KAYDINA göre (önce sorgu). Hiç iade
   yoksa + tam tutar + aynı gün → iptal (void); değilse iade (refund). Tosla'da
   kalan tutar ile sipariş toplamı uyuşmazsa iade DURUR (çift iade olmaz).
6. Ödeme sürerken panelden iptal edilmiş siparişe para gelirse BB'ye uyarı
   e-postası gider (iade Tosla İşim panelinden).

## Yapılanlar
- [x] lib/tosla/client.ts (KarPanel portu) + ortak.ts (tarayıcıda da çalışan kısım)
- [x] lib/tosla/kartOdemesi.ts: karar, tamamlama, süpürge, iade kuralları
- [x] initialize → Tosla, tosla-donus ucu, başarısız/kontrol sayfası
- [x] iptal / iade / kalem iptali → Tosla (eski iyzico siparişleri eski yoldan)
- [x] ödeme ekranı: Kart / Havale seçimi; havale indirimi yalnız havalede
- [x] sepet ve sepet paneli: kart açıkken toplam kart tutarı, havale bilgi satırı
- [x] 409 TUTAR_DEGISTI: ekrandaki özet kendiliğinden yenilenir (iki yolda da)
- [x] teşekkür sayfası: kart ödemesini doğrular, sepeti boşaltır
- [x] metinler: ön bilgilendirme, mesafeli satış, KVKK, gizlilik (Aköde/Tosla),
      SSS ve llms.txt (karta göre), sürüm: sözleşme 2026-11-12.1, KVKK v1.4
- [x] panel: "Kart ödemesi (Tosla)" bloğu, iptal/iade yazıları, yönetici e-postası
- [x] analiz: Tosla dönüşü iç kaynak sayılır
- [x] testler: src/lib/tosla/__testler__/tosla.test.mts (65/65)
- [x] deneme ortamı (herkese açık test üye işyeri, kart girilmeden): oturum
      açıldı, ödeme sayfası 200, sorgu 'bekliyor' + tutar 12345 kuruş, ödenmemiş
      siparişte iade reddedildi, bilinmeyen sipariş 'bulunamadi'

## Canlıya alma (Tosla "tamam" dedikten sonra)
1. Tosla nbsteelora.com için üye işyeri bilgilerini verir.
2. BB, NB Steelora'nın Vercel ortam değişkenlerine girer (Claude GİRMEZ):
   TOSLA_CLIENT_ID · TOSLA_API_USER · TOSLA_API_PASS · TOSLA_ORTAM=canli.
   TOSLA_ODEME_ACIK henüz YAZILMAZ (kart kapalı kalır).
3. Dal main'e birleştirilir (VS Code eşitleme / GitHub Actions; Vercel CLI yok).
   Birleştirme GÜNÜ 12.11.2026 değilse: lib/legal/sozlesme.ts SOZLESME_SURUMU
   ve lib/legal/surum.ts'deki iki yürürlük tarihi o güne çekilir. Panelde KVKK
   sürüm/yürürlük alanı doluysa o da güncellenir (panel değeri önceliklidir).
4. Kart kapalıyken canlı kontrol: ödeme ekranı bugünküyle aynı, sözleşme
   sayfaları yeni metinle açılıyor.
5. BB TOSLA_ODEME_ACIK=evet yazar → yeni yayın.
6. Gerçek küçük bir deneme alışverişi (BB'nin kendi kartıyla), panelde
   "Ödendi" görülür, ardından panelden iptal → para karta geri döner.
7. Tripwire: aktif ürün sayısı · siparişler · /urunler kartları.
