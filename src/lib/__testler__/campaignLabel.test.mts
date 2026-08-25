import { kampanyaEtiketi } from '@/lib/campaignLabel'
let g=0,k=0
const e=(ad:string,a:unknown,b:unknown)=>{const ok=a===b;console.log(`  ${ok?'✓':'✗'} ${ad}${ok?'':` → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`}`);ok?g++:k++}

e('canlıdaki kampanya', kampanyaEtiketi('TÜM ÜRÜNLERDE SEPETTE %30 İNDİRİM 🚀'), 'Tüm ürünlerde sepette %30 indirim')
e('emoji temizlenir', kampanyaEtiketi('Yaz İndirimi 🌞'), 'Yaz İndirimi')
e('ünlem temizlenir', kampanyaEtiketi('Kaçırmayın!!!'), 'Kaçırmayın')
e('normal ad korunur', kampanyaEtiketi('Hoş Geldin İndirimi'), 'Hoş Geldin İndirimi')
e('kod korunur', kampanyaEtiketi('NB30 KAMPANYASI BAŞLADI'), 'NB30 kampanyası başladı')
e('yüzde korunur', kampanyaEtiketi('SEPETTE %30 İNDİRİM'), 'Sepette %30 indirim')
e('bağlaç küçük kalır', kampanyaEtiketi('KOLYE VE KÜPELERDE İNDİRİM'), 'Kolye ve küpelerde indirim')
e('boş', kampanyaEtiketi(''), '')
e('null', kampanyaEtiketi(null), '')
e('tek kelime bağırma', kampanyaEtiketi('İNDİRİM'), 'İNDİRİM')
e('Türkçe İ', kampanyaEtiketi('İKİNCİ SİPARİŞ KUPONU'), 'İkinci sipariş kuponu')
e('emoji yok kalır', kampanyaEtiketi('Kış Seçkisi'), 'Kış Seçkisi')
console.log(`\n  ${g} geçti, ${k} kaldı`); process.exit(k?1:0)
