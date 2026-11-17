# NB Steelora — Tosla İşim kartla ödeme (dal: tosla-odeme)

Durum (17 Kas 2026 10.58): KOD CANLIDA (main b00f108), KART AÇIK (deneme alışverişi bekleniyor); önceki durum 16 Kas 20.45: KART KAPALI — Tosla
nbsteelora.com üye işyerinin banka tanımlarını henüz bitirmedi. Ayrıntı en altta
"16 Kasım 2026 — canlıya alma denemesi". Tekrar açma adımları orada.
(13 Kas: kod hazırdı, deneme ortamında doğrulandı; dal 16 Kas'ta main'e birleşti.)

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

## 16 Kasım 2026 — canlıya alma denemesi
- Tosla 16 Kas 11.45'te sanal POS başvurusunu onayladı; 12.11'de ilk banka tanımı
  tamamlandı, 18.02'de diğer banka tanımları sürüyordu (Tosla e-postaları).
- Adım 2: BB dört değişkeni Vercel'e girdi (Production). Adım 3: dal main'e
  birleşti (b00f108), VS Code eşitlemesiyle gönderildi, Deploy #354 yayında.
  Sürüm tarihleri 16.11.2026'ya çekildi (sözleşme 2026-11-16.1, KVKK v1.4).
- Adım 4: kart kapalıyken canlı kontrol temiz (ödeme ekranı eskisi gibi,
  sözleşme sayfaları yeni metinle, panel KVKK alanı ezmiyor, konsol hatası yok).
- Adım 5: TOSLA_ODEME_ACIK=evet eklendi (Config), Deploy #354 GitHub'dan
  "Re-run all jobs" ile yeniden yayınlandı (deploy.yml'de elle tetikleme yok;
  belge commit'i yayın tetiklemiyor). Kart seçeneği göründü.
- Adım 6: BB'nin iki denemesi Tosla'nın 3D adımında düştü: "3D Secure doğrulama
  esnasında bir problem ile karşılaşıldı .NotEnrolled.T2" (Tosla işlem no
  2000000003343658). Karttan çekim yok, stok düşmedi; akışımız doğru çalıştı
  (dönüş → Tosla'ya sorgu → başarısız sayfası, sipariş "yarım kalan").
  Teşhis: üye işyeri tarafı — KarPanel'in Tosla üye işyeri 12 Kas'ta canlı kartı
  sorunsuz almıştı; nbsteelora.com'un banka tanımları sürüyor.
- Kart KAPATILDI: TOSLA_ODEME_ACIK silindi, Deploy #354 yeniden yayınlandı.
  (Not: Vercel'de değişken DÜZENLEMEK e-postaya gelen kodu istiyor; silip yeniden
  eklemek istemiyor.)

### Tekrar açma (Tosla "tanımlar tamamlandı" dedikten sonra)
1. Vercel → Environment Variables → Add: TOSLA_ODEME_ACIK = evet (Config, Production).
2. GitHub Actions → son "Deploy to Vercel" koşusu → Re-run all jobs (BB'nin Chrome'u).
3. Ödeme sayfasında "Kart ile öde" görünür → BB'nin kendi kartıyla küçük deneme
   (NBH008 ₺299,92) → panelde "Ödendi" → panelden iptal (aynı gün: iptal, sonra: iade).
4. Tripwire: aktif ürün 412 / pasif 108 / tümü 520 · siparişler · /urunler ilk sayfa 24 kart
   · NBH008 stoğu 10 (deneme sonrası iptalle geri gelmeli).

## 17 Kasım 2026 — kart yeniden açıldı
- Tosla 17 Kas sabahı telefonla "tanımlar tamamlandı, bağlayabilirsiniz" dedi.
- 10.55: TOSLA_ODEME_ACIK = evet (Config, Production) eklendi. İlk denemede alanlar
  iki kez yazılıp "TOSLA_ODEME_ACIKTOSLA_ODEME_ACIK" adıyla kaydedildi (uygulama okumaz,
  etkisiz); hemen silinip doğrusu eklendi. Ders: Kaydet'ten önce alan değerlerini
  sayfadan oku, ekran görüntüsüne güvenme.
- Deploy #354 (koşu 43912874578) 4. kez "Re-run all jobs" → başarılı (1 dk 40 sn).
- Canlı: alt bilgi "Visa, Mastercard ve Troy kartlarla ödeme alınır.", llms.txt kartı anıyor.
- Tripwire (deneme öncesi): Aktif 412 / Pasif 108 / Tümü 520 · /urunler 24 kart · NBH008 stok 10.
- Sıradaki: BB'nin deneme alışverişi (NBH008 ₺299,92) → "Ödendi" → panelden iptal → tripwire.
