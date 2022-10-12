# sub-encoder
Generate sub encodings for key/value stores

### Usage
```js
const enc = new SubEncoder({ keyEncoding: 'utf-8' })
const subA = enc.sub('sub-a')
const subB = enc.sub('sub-b', { keyEncoding: 'binary' }) // subs support custom key encodings

await bee.put(enc.encodeKey('k1'), 'b')
await bee.put(subA.encodeKey('a1'), 'a1')
await bee.put(subB.encodeKey('b1'), 'b1')

// k1
await bee.get(enc.encodeKey('k1'))
// a1
await bee.get(subA.encodeKey('a1'))

// also supports read streams
for await (const node of bee.createReadStream(subA.encodeRange())) {
  // Iterates everything in the A sub
}

// The range options will be encoded properly too
for await (const node of bee.createReadStream(subB.encodeRange({ lt: 'b2' })) {
}
```

### License
MIT
