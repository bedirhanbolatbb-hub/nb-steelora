/** 21 Kas 2026 · banka yanıtının Türkçe açıklaması. */
import { bankaYanitiAciklamasi as a } from '../bankaYaniti.ts'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : ` → ${JSON.stringify(bulunan)}`}`)
  ok ? gecti++ : kaldi++
}
const basla = (s: string | null, on: string) => (s ?? '').startsWith(on)

esit('müşterinin gördüğü mesaj (kod yok)', basla(a(null, 'Transaction is not valid.'), 'Bankanız işlemi geçersiz saydı'), true)
esit('kod 12', basla(a('12', null), 'Bankanız işlemi geçersiz saydı'), true)
esit('kod mesajdan önce gelir', basla(a('51', 'Transaction is not valid.'), 'Kartınızın kullanılabilir limiti'), true)
esit('3D mesajı', basla(a(null, '3D Secure doğrulama esnasında bir problem ile karşılaşıldı .NotEnrolled.T2'), '3D Secure doğrulaması'), true)
esit('do not honour', basla(a(null, 'Do not honour'), 'Bankanız işlemi onaylamadı'), true)
esit('bilinmeyen → null', a('77', 'Some other text'), null)
esit('boş → null', a(null, null), null)
esit('boşluklu kod', basla(a(' 57 ', null), 'Kartınız bu işleme kapalı'), true)

console.log(`\n${gecti} geçti, ${kaldi} kaldı`)
if (kaldi > 0) process.exit(1)
