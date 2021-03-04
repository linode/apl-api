import { expect } from 'chai'
import { removeBlankAttributes, getObjectPaths, getPublicUrl } from './utils'

describe('Utils', () => {
  it('should retrieve host part from service domain', (done) => {
    const x = getPublicUrl('aa.bb.cc.dd.ee', null, null, { dnsZones: ['dd.ee'] })
    expect(x.subdomain).to.equal('aa.bb.cc')
    done()
  })

  it('should retrieve only domain', (done) => {
    const x = getPublicUrl('my.custom.domain', null, null, { dnsZones: ['dd.ee'] })
    expect(x.subdomain).to.be.empty
    expect(x.domain).to.equal('my.custom.domain')
    done()
  })
  it('should retrieve default host if service domain not defined', (done) => {
    const x = getPublicUrl(undefined, 'aa', 'bb', { name: 'dev', dnsZones: ['dd.ee'] })
    expect(x.subdomain).to.equal('aa.team-bb.dev')
    expect(x.domain).to.equal('dd.ee')
    done()
  })
  it('should retrieve host and domain part from service domai (many dnsZones)n', (done) => {
    const x = getPublicUrl('aa.bb.cc.dd.ee', 'aa', 'bb', { dnsZones: ['cc.dd.ee', 'dd.ee', 'bb.cc.dd.ee'] })
    expect(x.subdomain).to.equal('aa')
    expect(x.domain).to.equal('bb.cc.dd.ee')
    done()
  })

  it('should retrieve all object paths', (done) => {
    const obj = {
      a: 1,
      b: { bb: 2 },
      c: [{ ee: { fff: 3 } }, { ee: { fff: 4 } }],
      d: { dd: [1, 2] },
    }
    const paths = getObjectPaths(obj)
    expect(paths).to.have.members(['a', 'b.bb', 'c[0].ee.fff', 'c[1].ee.fff', 'd.dd[0]', 'd.dd[1]'])
    done()
  })

  it('should clean blank object attributes', (done) => {
    const obj = {
      a: 1,
      b: { bb: null },
      c: [{ ca: { fff: undefined } }, { cb: { fff: 4 } }],
      d: { dd: [1, 2] },
      e: null,
      f: {},
      g: [],
      h: '',
      i: undefined,
      j: { aa: {}, bb: 1 },
      k: { aa: [], bb: 1 },
      l: { aa: null, bb: 1 },
      m: { aa: undefined, bb: 1 },
      n: { aa: '', bb: 1 },
    }

    const expectedObj = {
      a: 1,
      c: [{ cb: { fff: 4 } }],
      d: { dd: [1, 2] },
      j: { bb: 1 },
      k: { bb: 1 },
      l: { bb: 1 },
      m: { bb: 1 },
      n: { bb: 1 },
    }
    const cleanedObject = removeBlankAttributes(obj)
    expect(cleanedObject).to.deep.equal(expectedObj)
    done()
  })
})
