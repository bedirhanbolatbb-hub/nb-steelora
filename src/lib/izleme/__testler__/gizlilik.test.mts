import { GIZLENDI, derinTemizle, metniTemizle, olayiTemizle } from '../gizlilik.ts'

/**
 * Sentry gizlilik süzgeci testleri.
 *
 * Bu süzgeç sessizce bozulursa kimse fark etmez: hata kayıtları çalışmaya
 * devam eder, yalnız içlerinde müşteri e-postası olur. Bu yüzden her kural
 * ayrı ayrı sınanır.
 */
const sonuc: string[] = []
const kontrol = (ad: string, kosul: boolean, deger: unknown) => {
  if (!kosul) {
    console.error(`✗ ${ad}\n   görülen: ${JSON.stringify(deger)}`)
    process.exit(1)
  }
  sonuc.push(`${ad} → ${JSON.stringify(deger)}`)
}

// ── Serbest metin ──
{
  const m = metniTemizle('celiknalan72@gmail.com için sipariş bulunamadı')
  kontrol('e-posta serbest metinden silinir', !m.includes('@gmail.com') && m.includes(GIZLENDI), m)

  const t = metniTemizle('Müşteri telefonu 0505 198 46 46 ulaşılamadı')
  kontrol('telefon silinir', !/\d{3}\s?\d{2}\s?\d{2}/.test(t), t)

  const k = metniTemizle('kart 4155 6500 1234 5678 reddedildi')
  kontrol('kart numarası silinir', !k.includes('5678'), k)

  const i = metniTemizle('IBAN TR33 0006 1005 1978 6457 8413 26 hatalı')
  kontrol('IBAN silinir', !i.includes('6457'), i)

  kontrol('masum metin bozulmaz',
    metniTemizle('Sipariş NBS-1787569943108 kargoya verildi') ===
      'Sipariş NBS-1787569943108 kargoya verildi',
    metniTemizle('Sipariş NBS-1787569943108 kargoya verildi'))
}

// ── Anahtar adına göre ──
{
  const t = derinTemizle({
    email: 'a@b.com', adres: 'Akdeniz Mah. No:3', telefon: '05051984646',
    ad_soyad: 'Nalan Bolat', cvc: '123', authorization: 'Bearer xyz',
    siparisNo: 'NBS-1787569943108', tutar: 1154.72,
  }) as Record<string, unknown>
  for (const k of ['email', 'adres', 'telefon', 'ad_soyad', 'cvc', 'authorization'])
    kontrol(`${k} anahtarı gizlenir`, t[k] === GIZLENDI, t[k])
  kontrol('sipariş no ve tutar KORUNUR (hata ayıklama için gerekli)',
    t.siparisNo === 'NBS-1787569943108' && t.tutar === 1154.72, [t.siparisNo, t.tutar])
}

// ── Kısa anahtar yanlış eşleşmesin ──
{
  const t = derinTemizle({ created_at: '2026-08-27', admin_id: 'x1', ad: 'Nalan' }) as Record<string, unknown>
  kontrol("'ad' kuralı created_at/admin_id'yi vurmaz",
    t.created_at === '2026-08-27' && t.admin_id === 'x1' && t.ad === GIZLENDI, t)
}

// ── İç içe ve dizi ──
{
  const t = derinTemizle({ siparis: { musteri: { email: 'x@y.com' }, kalemler: [{ not: 'a@b.com sordu' }] } }) as any
  kontrol('iç içe nesnede gizlenir', t.siparis.musteri.email === GIZLENDI, t.siparis.musteri.email)
  kontrol('dizi içindeki metin temizlenir', !t.siparis.kalemler[0].not.includes('@b.com'), t.siparis.kalemler[0].not)
}

// ── Döngüsel referans çökertmemeli ──
{
  const a: any = { ad: 'x' }; a.kendisi = a
  const t = derinTemizle(a) as any
  kontrol('döngüsel referans çökertmez', t.kendisi === GIZLENDI, t.kendisi)
}

// ── Sentry olayı ──
{
  const olay = olayiTemizle({
    message: 'Ödeme başarısız: musteri@ornek.com',
    user: { id: '42', email: 'musteri@ornek.com', ip_address: '1.2.3.4' },
    request: {
      url: 'https://x/hesabim?eposta=musteri@ornek.com',
      query_string: 'eposta=musteri@ornek.com',
      headers: { cookie: 'admin_token=gizli' },
      cookies: { admin_token: 'gizli' },
    },
  } as any) as any
  kontrol('user alanı TAMAMEN düşer', !('user' in olay), Object.keys(olay))
  kontrol('çerez ve başlıklar düşer',
    !('cookies' in olay.request) && !('headers' in olay.request), Object.keys(olay.request))
  kontrol('sorgu dizgisi temizlenir', !olay.query_string?.includes('@') && !olay.request.query_string.includes('@'), olay.request.query_string)
  kontrol('url temizlenir', !olay.request.url.includes('@ornek.com'), olay.request.url)
  kontrol('mesaj temizlenir', !olay.message.includes('@ornek.com'), olay.message)
}

console.log(`✓ ${sonuc.length}/${sonuc.length} gizlilik testi geçti`)
sonuc.forEach((s) => console.log('   ' + s))
