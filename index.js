const codecs = require('codecs')
const b = require('b4a')

const SEP = b.alloc(1)
const SEP_BUMPED = b.from([0x1])

module.exports = class SubEncoder {
  constructor (prefix, encoding) {
    this.userEncoding = codecs(encoding)
    this.prefix = typeof prefix === 'string' ? b.from(prefix) : (prefix || null)
    this.lt = this.prefix && b.concat([this.prefix.subarray(0, this.prefix.byteLength - 1), SEP_BUMPED])
  }

  _encodeRangeUser (r) {
    if (this.userEncoding.encodeRange) return this.userEncoding.encodeRange(r)

    return {
      gt: r.gt && this.userEncoding.encode(r.gt),
      gte: r.gte && this.userEncoding.encode(r.gte),
      lte: r.lte && this.userEncoding.encode(r.lte),
      lt: r.lt && this.userEncoding.encode(r.lt)
    }
  }

  _addPrefix (key) {
    return this.prefix ? b.concat([this.prefix, key]) : key
  }

  encode (key) {
    return this._addPrefix(this.userEncoding.encode(key))
  }

  encodeRange (range) {
    const r = this._encodeRangeUser(range)

    if (r.gt) r.gt = this._addPrefix(r.gt)
    else if (r.gte) r.gte = this._addPrefix(r.gte)
    else if (this.prefix) r.gte = this.prefix

    if (r.lt) r.lt = this._addPrefix(r.lt)
    else if (r.lte) r.lte = this._addPrefix(r.lte)
    else if (this.prefix) r.lt = this.lt

    return r
  }

  decode (key) {
    return this.userEncoding.decode(this.prefix ? key.subarray(this.prefix.byteLength) : key)
  }

  sub (prefix, encoding) {
    const prefixBuf = typeof prefix === 'string' ? b.from(prefix) : prefix
    return new SubEncoder(createPrefix(prefixBuf, this.prefix), compat(encoding))
  }
}

function createPrefix (prefix, parent) {
  if (prefix && parent) return b.concat([parent, prefix, SEP])
  if (prefix) return b.concat([prefix, SEP])
  if (parent) return b.concat([parent, SEP])
  return SEP
}

function compat (enc) {
  if (enc && enc.keyEncoding) return enc.keyEncoding
  return enc
}
