# sub-encoder
Generate sub encodings for key/value stores

### Usage
```js
const enc = new SubEncoder({ keyEncoding: 'utf-8' })
const subA = enc.sub('sub-a')
const subB = enc.sub('sub-b', { keyEncoding: 'binary' }) // subs support custom key encodings

await bee.put('k1', 'b', { keyEncoding: enc })
await bee.put('a1', 'a1', { keyEncoding: subA })
await bee.put('b1', 'b1', { keyEncoding: subB })

// k1
await bee.get('k1', { keyEncoding: enc })
// a1
await bee.get('a1', { keyEncoding: subA })

// also supports read streams
for await (const node of bee.createReadStream(subA.range())) {
  // Iterates everything in the A sub
}

// The range options will be encoded properly too
for await (const node of bee.createReadStream(subB.range({ lt: 'b2' })) {
}
```

### License
MIT
