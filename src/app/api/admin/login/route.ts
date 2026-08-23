import { NextResponse } from 'next/server'
import { sabitZamanEsit } from '@/lib/admin/requireAdmin'
import { panelCerezDegeri } from '@/lib/admin/panelOturumu'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'

/**
 * Panel girişi (Faz 27'de sertleştirildi).
 *
 * ÖNCEKİ DURUM üç kusur taşıyordu:
 *  1. Deneme sınırı yoktu. Panelin arkasında bütün sipariş verileri, üye
 *     listesi ve tam veritabanı dökümü indirme var; tek statik parolaya
 *     sınırsız deneme yapılabiliyordu.
 *  2. Karşılaştırma `===` ile yapılıyordu (sabit zamanlı değil).
 *  3. Çerezin DEĞERİ sırrın kendisiydi. Çerez bir kez sızarsa (günlük, yedek,
 *     tarayıcı eklentisi) sır da sızmış olur ve tek tek oturum iptali mümkün
 *     değildir — sırrı değiştirmek TÜM oturumları düşürür.
 *
 * (3) için çerez artık sırdan TÜRETİLMİŞ bir özet taşıyor. Sır artık çerezde
 * düz hâlde durmuyor; özetten sır geri hesaplanamaz. Oturum iptali hâlâ sırrı
 * değiştirmekten geçiyor — imzalı ve süreli oturum jetonu bir sonraki adım,
 * BB kararına bırakıldı (rapor).
 */

const AZAMI_DENEME = 5
const PENCERE_SN = 15 * 60

export async function POST(request: Request) {
  // Sınır İP başına: aynı ağdan sınırsız deneme yapılamasın.
  const sinir = await hizSiniri(`panel-giris:${istekKimligi(request)}`, AZAMI_DENEME, PENCERE_SN)
  if (!sinir.gecer) return cokFazlaIstek(sinir.bekleSaniye)

  const govde = await request.json().catch(() => null)
  const password = typeof govde?.password === 'string' ? govde.password : ''
  const gizli = process.env.ADMIN_SECRET_TOKEN

  if (!gizli || !sabitZamanEsit(password, gizli)) {
    // Yanıt tek tip: "parola yanlış" ile "sır yapılandırılmamış" ayrımı
    // dışarıya sızmasın.
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_token', await panelCerezDegeri(gizli), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax: panel bağlantısına dışarıdan tıklanınca oturum korunsun diye.
    // Yan etkili GET uçları Faz 27'de POST'a çevrildi, bu yüzden Lax'in
    // getirdiği CSRF yüzeyi kapandı.
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
