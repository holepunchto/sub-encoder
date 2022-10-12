const isOptions = require('is-options')
const codecs = require('codecs')
const b = require('b4a')

const SEP = b.alloc(1)
const EMPTY = b.alloc(0)
const MAX = b.from([0xff])

module.exports = class SubEncoder {
  constructor (prefix, opts) {
    if (isOptions(prefix)) {
      opts = prefix
      prefix = null
    }
    this.prefix = prefix || null
    this.keyEncoding = keyEncoding(this.prefix, opts)
  }

  encodeKey (key) {
    return this.keyEncoding.encode(key)
  }

  decodeKey (key) {
    return this.keyEncoding.decode(key)
  }

  encodeRange (opts = {}) {
    return encRange(this.keyEncoding, opts, !!this.prefix)
  }

  sub (prefix, opts) {
    if (typeof prefix === 'string') {
      prefix = b.from(prefix)
    }
    return new SubEncoder(this.prefix ? b.concat([this.prefix, SEP, prefix]) : prefix, opts)
  }
}

function keyEncoding (prefix, opts) {
  const userEncoding = codecs(opts && opts.keyEncoding)
  return {
    encode (k) {
      if (userEncoding) k = userEncoding.encode(k)
      if (prefix) k = b.concat([prefix, SEP, k])
      return k
    },
    decode (k) {
      if (prefix) k = k.subarray(b.byteLength(prefix) + 1)
      if (userEncoding) k = userEncoding.decode(k)
      return k
    }
  }
}

function encRange (keyEncoding, opts, sub) {
  opts = { ...opts, keyEncoding }
  if (sub && !opts.gt && !opts.gte) opts.gt = EMPTY
  if (sub && !opts.lt && !opts.lte) opts.lte = MAX
  return opts
}
