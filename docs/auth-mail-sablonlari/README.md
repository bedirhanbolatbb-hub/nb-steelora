# Supabase Auth mailleri — Resend SMTP kurulumu ve şablonlar

Şu an şifre sıfırlama ve e-posta doğrulama mailleri **Supabase'in varsayılan
gönderici adresinden** (`noreply@mail.app.supabase.io`) gidiyor. Müşteride
dolandırıcılık hissi yaratan kısım bu. Aşağıdaki adımlar maili
`NB Steelora <siparis@nbsteelora.com>` adresinden gönderir.

> Kimlik bilgileri (API anahtarı, SMTP parolası) **kodda saklanmaz** — yalnız
> Supabase panelindeki alanlara girilir.

---

## 1. Resend'de SMTP bilgilerini al

1. https://resend.com → doğru hesapla giriş yap (nbsteelora.com'un **doğrulanmış**
   olduğu hesap — sipariş maillerinde kullanılan anahtar şu an başka bir hesaba ait).
2. Sol menü → **Domains** → `nbsteelora.com` satırının **Verified** olduğunu doğrula.
   Değilse önce domain doğrulamasını tamamla.
3. Sol menü → **API Keys** → **Create API Key**
   - Name: `supabase-auth-smtp`
   - Permission: **Sending access**
   - Domain: `nbsteelora.com`
   - Oluşan anahtarı kopyala (yalnız bir kez gösterilir) — bu, SMTP **parolası** olacak.

Resend'in SMTP bilgileri sabittir:

| Alan | Değer |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) — alternatif `587` (STARTTLS) |
| Kullanıcı adı | `resend` |
| Parola | yukarıda oluşturduğun **API anahtarı** |

---

## 2. Supabase'de SMTP'yi bağla

**Supabase Dashboard → Project: nb-steelora → Authentication → Emails → SMTP Settings**
(bazı sürümlerde: Project Settings → Authentication → SMTP Settings)

1. **Enable Custom SMTP** anahtarını **aç**.
2. Alanları şöyle doldur:

| Alan | Yazılacak değer |
|---|---|
| Sender email | `siparis@nbsteelora.com` |
| Sender name | `NB Steelora` |
| Host | `smtp.resend.com` |
| Port number | `465` |
| Username | `resend` |
| Password | *(Resend API anahtarı)* |
| Minimum interval between emails | `60` (saniye, varsayılan kalabilir) |

3. **Save** de.

> Port 465 çalışmazsa `587` dene; ikisi de Resend tarafından destekleniyor.

### Rate limit (isteğe bağlı ama önerilir)
**Authentication → Rate Limits → Email sent**: varsayılan saatte 30'dur; Resend
bağlandıktan sonra ihtiyaca göre yükseltilebilir.

---

## 3. Şablonları yapıştır

**Authentication → Emails → Templates** altında her şablon için:

1. İlgili sekmeyi seç (**Reset Password** / **Confirm signup**).
2. **Subject** alanına aşağıdaki konu satırını yaz.
3. **Message body (HTML)** alanına ilgili `.html` dosyasının **tamamını** yapıştır.
4. **Save** de.

| Supabase sekmesi | Konu (Subject) | Dosya |
|---|---|---|
| Reset Password | `Şifre Sıfırlama — NB Steelora` | [`sifre-sifirlama.html`](./sifre-sifirlama.html) |
| Confirm signup | `E-posta Adresinizi Doğrulayın — NB Steelora` | [`eposta-dogrulama.html`](./eposta-dogrulama.html) |

### Şablonlardaki bağlantı biçimi — önemli
Her iki şablon da Supabase'in `{{ .TokenHash }}` değişkenini kullanır ve
bağlantıyı sitenin `/auth/callback` ucuna yollar:

```
https://www.nbsteelora.com/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/auth/sifremi-sifirla
```

Bunun sebebi: varsayılan `{{ .ConfirmationURL }}` bağlantısı, maili **isteği
başlatan tarayıcıdan başka bir cihazda** açıldığında çalışmıyor (PKCE doğrulayıcısı
o tarayıcıda kalıyor). `token_hash` biçimi telefonda açılsa bile çalışır.
`/auth/callback` her iki biçimi de kabul edecek şekilde yazıldı, yani şablonları
yapıştırmadan önce de sistem çalışmaya devam eder.

---

## 4. Yönlendirme adreslerini beyaz listeye al

**Authentication → URL Configuration**

- **Site URL**: `https://www.nbsteelora.com`
- **Redirect URLs** listesine ekle (yoksa):
  - `https://www.nbsteelora.com/auth/callback`
  - `https://www.nbsteelora.com/**`

---

## 5. Doğrulama (5 dakika)

1. Siteden **Şifremi unuttum** → kendi adresine bağlantı iste.
2. Gelen mailde **gönderen** `NB Steelora <siparis@nbsteelora.com>` görünmeli.
3. Bağlantıya tıkla → yeni şifre ekranı açılmalı (artık "Bağlantı geçersiz" değil).
4. Yeni şifreyi kaydet → giriş sayfasına yönlendirilmeli ve yeni şifreyle girilebilmeli.
5. Resend → **Logs** ekranında mailin `delivered` göründüğünü doğrula.

Sorun çıkarsa: Supabase → **Logs → Auth Logs** ekranında SMTP hatası görünür
(kimlik doğrulama hatası genelde yanlış API anahtarı ya da doğrulanmamış domain demektir).
