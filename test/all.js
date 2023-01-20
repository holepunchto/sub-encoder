const test = require('brittle')

const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const ram = require('random-access-memory')
const b = require('b4a')

const SEP = b.alloc(1)

const SubEncoder = require('..')

test('simple sub key encoding', t => {
  const enc = new SubEncoder()
  const sub1 = enc.sub('a')
  const sub2 = sub1.sub('b')

  const key = b.alloc(1).fill(1)
  const k1 = enc.encode(key)
  const k2 = sub1.encode(key)
  const k3 = sub2.encode(key)

  t.alike(k1, key)
  t.alike(k2, b.concat([b.from('a'), SEP, key]))
  t.alike(k3, b.concat([b.from('a'), SEP, b.from('b'), SEP, key]))

  t.alike(key, enc.decode(k1))
  t.alike(key, sub1.decode(k2))
  t.alike(key, sub2.decode(k3))
})

test('sub key encoding with hyperbee', async t => {
  const bee = new Hyperbee(new Hypercore(ram))
  const enc = new SubEncoder()

  const sub1 = enc.sub('hello', { keyEncoding: 'utf-8' })
  const sub2 = enc.sub('world')

  await bee.put('a', b.from('a'), { keyEncoding: sub1 })
  await bee.put('b', b.from('b'), { keyEncoding: sub2 })

  const n1 = await bee.get('a', { keyEncoding: sub1 })
  const n2 = await bee.get('b', { keyEncoding: sub2 })

  t.is(n1.key, 'a')
  t.alike(n1.value, b.from('a'))
  t.alike(n2.key, b.from('b'))
  t.alike(n2.value, b.from('b'))
})

test('sub range encoding with hyperbee', async t => {
  const bee = new Hyperbee(new Hypercore(ram), { valueEncoding: 'utf-8' })

  const enc = new SubEncoder({ keyEncoding: 'utf-8' })
  const subA = enc.sub('sub-a', { keyEncoding: 'utf-8' })
  const subB = enc.sub('sub-b', { keyEncoding: 'utf-8' })
  const subC = enc.sub('sub-c', { keyEncoding: 'utf-8' })

  await bee.put(enc.encode('d1'), 'd2')
  await bee.put(subA.encode('a1'), 'a1')
  await bee.put(subB.encode('b1'), 'b1')
  await bee.put(subB.encode('b2'), 'b2')
  await bee.put(subB.encode('b3'), 'b3')
  await bee.put(subC.encode('c1'), 'c1')

  {
    const range = enc.range({ lt: 'sub' })
    const nodes = await collect(bee.createReadStream(range))
    t.is(nodes.length, 1)
    t.is(nodes[0].key, 'd1')
  }

  {
    const range = subA.range()
    const nodes = await collect(bee.createReadStream(range))
    t.is(nodes.length, 1)
    t.is(nodes[0].key, 'a1')
  }

  {
    const range = subB.range({ gt: 'b1', lt: 'b3' })
    const nodes = await collect(bee.createReadStream(range))
    t.is(nodes.length, 1)
    t.is(nodes[0].key, 'b2')
  }
})

test('sub range diff encoding with hyperbee', async t => {
  const bee = new Hyperbee(new Hypercore(ram), { valueEncoding: 'utf-8' })

  const enc = new SubEncoder({ keyEncoding: 'utf-8' })
  const subA = enc.sub('sub-a', { keyEncoding: 'utf-8' })
  const subB = enc.sub('sub-b', { keyEncoding: 'utf-8' })
  const subC = enc.sub('sub-c', { keyEncoding: 'utf-8' })

  await bee.put(enc.encode('d1'), 'd2')
  await bee.put(subA.encode('a1'), 'a1')
  await bee.put(subB.encode('b1'), 'b1')
  await bee.put(subB.encode('b2'), 'b2')
  await bee.put(subB.encode('b3'), 'b3')
  await bee.put(subC.encode('c1'), 'c1')

  {
    const range = enc.range({ lt: 'sub' })
    const nodes = await collect(bee.createDiffStream(0, range))
    t.is(nodes.length, 1)
    t.is(nodes[0].left.key, 'd1')
  }

  {
    const range = subA.range()
    const nodes = await collect(bee.createDiffStream(0, range))
    t.is(nodes.length, 1)
    t.is(nodes[0].left.key, 'a1')
  }

  {
    const range = subB.range({ gt: 'b1', lt: 'b3' })
    const nodes = await collect(bee.createDiffStream(0, range))
    t.is(nodes.length, 1)
    t.is(nodes[0].left.key, 'b2')
  }
})

test('supports the empty sub', async t => {
  const bee = new Hyperbee(new Hypercore(ram))
  const enc = new SubEncoder()

  const sub1 = enc.sub('1', { keyEncoding: 'utf-8' })
  const sub2 = enc.sub('2', { keyEncoding: 'utf-8' })
  const sub3 = enc.sub()

  await bee.put('', b.from('a'), { keyEncoding: sub1 })
  await bee.put('', b.from('b'), { keyEncoding: sub2 })
  await bee.put(b.alloc(1), b.from('c'), { keyEncoding: sub3 })

  const n3 = await collect(bee.createReadStream(sub3.range()))

  t.is(n3.length, 1)
  t.alike(n3[0].key, b.alloc(1))
})

test('can read out the empty key in subs', async t => {
  const bee = new Hyperbee(new Hypercore(ram))
  const enc = new SubEncoder()

  const sub1 = enc.sub('1', { keyEncoding: 'utf-8' })
  const sub2 = enc.sub('2', { keyEncoding: 'utf-8' })
  const sub3 = enc.sub('3', { keyEncoding: 'binary' })

  await bee.put('', b.from('a'), { keyEncoding: sub1 })
  await bee.put('', b.from('b'), { keyEncoding: sub2 })
  await bee.put(b.alloc(1), b.from('c'), { keyEncoding: sub3 })

  const n1 = await collect(bee.createReadStream(sub1.range()))
  const n2 = await collect(bee.createReadStream(sub2.range()))
  const n3 = await collect(bee.createReadStream(sub3.range()))

  t.is(n1[0].key, '')
  t.is(n2[0].key, '')
  t.alike(n3[0].key, b.alloc(1))
})

async function collect (ite) {
  const res = []
  for await (const node of ite) {
    res.push(node)
  }
  return res
}
