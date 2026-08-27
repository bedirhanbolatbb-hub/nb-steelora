import { strict as assert } from 'node:assert'
import { duzMetin } from '../emails/send.ts'
const m = duzMetin('<div><h2>Merhaba</h2><p>Sipariş <a href="https://x.io/t">Takip et</a>.</p><style>p{color:red}</style></div>')
assert.ok(m.includes('Merhaba'))
assert.ok(m.includes('Takip et: https://x.io/t'))
assert.ok(!m.includes('<'))
assert.ok(!m.includes('color'))
console.log('✓ duzMetin 4/4 —', JSON.stringify(m))
