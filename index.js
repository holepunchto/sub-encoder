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

    this.lt = this.prefix && b.concat([this.prefix.subarray(0, this.prefix.byteLength - 1), SEP_BUMPED])
  }

  _userEncodeRange (r) {
    if (this.userEncoding.encodeRange) return this.userEncoding.encodeRange(r)

    return {
      gt: r.gt && this.userEncoding.encode(r.gt),
      gte: r.gte && this.userEncoding.encode(r.gte),
      lte: r.lte && this.userEncoding.encode(r.lte),
      lt: r.lt && this.userEncoding.encode(r.lt)
    }
  }

  _prefix (key) {
    return this.prefix ? b.concat([this.prefix, key]) : key
  }

  encode (key) {
    return this._prefix(this.userEncoding.encode(key))
  }

  encodeRange (range) {
    const r = this._userEncodeRange(range)

    if (r.gt) r.gt = this._prefix(r.gt)
    else if (r.gte) r.gte = this._prefix(r.gte)
    else if (this.prefix) r.gte = this.prefix

    if (r.lt) r.lt = this._prefix(r.lt)
    else if (r.lte) r.lte = this._prefix(r.lte)
    else if (this.prefix) r.lt = this.lt

    return r
  }

  decode (key) {
    if (this.prefix) key = key.subarray(this.prefix.byteLength)
    return this.userEncoding.decode(key)
  }

  sub (prefix, opts) {
    return new SubEncoder(prefix, {
      ...opts,
      _parent: this.prefix,
      _sub: true
    })
  }
}
