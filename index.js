const isOptions = require('is-options')
const codecs = require('codecs')
const b = require('b4a')

const SEP = b.alloc(1)
const SEP_BUMPED = b.from([0x1])
const GTE_DEFAULT = b.alloc(0)
const LT_DEFAULT = b.alloc(0)

module.exports = class SubEncoder {
  constructor (prefix, opts) {
    if (!opts && isOptions(prefix)) {
      opts = prefix
      prefix = null
    }
    if (typeof prefix === 'string') {
      prefix = b.from(prefix)
    }
    this.userEncoding = codecs(opts && opts.keyEncoding)

    const parent = opts && opts._parent
    const sub = opts && opts._sub
    if (prefix && parent) {
      this.prefix = b.concat([parent, prefix, SEP])
    } else if (prefix) {
      this.prefix = b.concat([prefix, SEP])
    } else if (parent) {
      this.prefix = b.concat([parent, SEP])
    } else if (sub) {
      this.prefix = SEP
    } else {
      this.prefix = null
    }
  }

  encode (key) {
    if (key === LT_DEFAULT) return b.concat([this.prefix.subarray(0, this.prefix.byteLength - 1), SEP_BUMPED])
    if (key === GTE_DEFAULT) return this.prefix
    if (this.userEncoding) key = this.userEncoding.encode(key)
    if (this.prefix) key = b.concat([this.prefix, key])
    return key
  }

  decode (key) {
    if (this.prefix) key = key.subarray(this.prefix.byteLength)
    if (this.userEncoding) key = this.userEncoding.decode(key)
    return key
  }

  range (opts = {}) {
    opts = { ...opts, keyEncoding: this }
    if (this.prefix && !opts.gt && !opts.gte) opts.gte = GTE_DEFAULT
    if (this.prefix && !opts.lt && !opts.lte) opts.lt = LT_DEFAULT
    return opts
  }

  sub (prefix, opts) {
    return new SubEncoder(prefix, {
      ...opts,
      _parent: this.prefix,
      _sub: true
    })
  }
}
