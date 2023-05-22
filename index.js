const isOptions = require('is-options')
const codecs = require('codecs')
const b = require('b4a')

const SEP = b.alloc(1)
const SEP_BUMPED = b.from([0x1])

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
    if (this.userEncoding) key = this.userEncoding.encode(key)
    if (this.prefix) key = b.concat([this.prefix, key])
    return key
  }

  encodeRange ({ gt, gte, lte, lt }) {
    if (gt) gt = this.encode(gt)
    else if (gte) gte = this.encode(gte)
    else if (this.prefix) gte = this.prefix

    if (lt) lt = this.encode(lt)
    else if (lte) lte = this.encode(lte)
    else if (this.prefix) lt = b.concat([this.prefix.subarray(0, this.prefix.byteLength - 1), SEP_BUMPED])

    return { gt, gte, lte, lt }
  }

  decode (key) {
    if (this.prefix) key = key.subarray(this.prefix.byteLength)
    if (this.userEncoding) key = this.userEncoding.decode(key)
    return key
  }

  sub (prefix, opts) {
    return new SubEncoder(prefix, {
      ...opts,
      _parent: this.prefix,
      _sub: true
    })
  }
}
