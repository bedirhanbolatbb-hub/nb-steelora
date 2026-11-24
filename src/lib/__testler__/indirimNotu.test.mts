import { indirimNotu } from '@/lib/sepet/indirimNotu'
let g=0,k=0
const e=(ad:string,a:unknown,b:unknown)=>{const ok=a===b;console.log(`  ${ok?'✓':'✗'} ${ad}${ok?'':` → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`}`);ok?g++:k++}
const tl=(n:number)=>`₺${n.toFixed(2).replace('.',',')}`

e('indirim yok', indirimNotu({ satirSayisi: 0, toplam: 0 }, tl), null)
e('tek satır: toplam yinelenmez', indirimNotu({ satirSayisi: 1, toplam: 124.98 }, tl), null)
e('iki satır: toplam yazılır', indirimNotu({ satirSayisi: 2, toplam: 162.47 }, tl), 'Toplam indiriminiz: ₺162,47')
e('tek satır + tavan', indirimNotu({ satirSayisi: 1, toplam: 100, tavanUygulandi: true }, tl), 'İndirim tavanı uygulandı')
e('iki satır + tavan', indirimNotu({ satirSayisi: 2, toplam: 100, tavanUygulandi: true }, tl), 'Toplam indiriminiz: ₺100,00 · indirim tavanı uygulandı')
e('tek satır + kupon düşmedi', indirimNotu({ satirSayisi: 1, toplam: 50, kuponDusmedi: true }, tl), 'En avantajlı kampanya uygulandı; indirimler toplanmaz')
e('hepsi', indirimNotu({ satirSayisi: 3, toplam: 50, tavanUygulandi: true, kuponDusmedi: true }, tl), 'Toplam indiriminiz: ₺50,00 · indirim tavanı uygulandı · en avantajlı kampanya uygulandı; indirimler toplanmaz')
e('kupon düşmedi ama indirim yok: not yok', indirimNotu({ satirSayisi: 0, toplam: 0, kuponDusmedi: true }, tl), null)
console.log(`\n  ${g} geçti, ${k} kaldı`); process.exit(k?1:0)
