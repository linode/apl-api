import { expect } from 'chai'
import { Db } from './db'

describe('Db', () => {
  let testDb: Db
  beforeEach(() => {
    testDb = new Db(null)
  })

  it('can store with id', (done) => {
    const v = testDb.createItem('teams', { name: 'n1', k: '1' }, undefined, '1')
    expect(v).to.deep.equal({ name: 'n1', k: '1', id: '1' })
    done()
  })

  it('can store without id', (done) => {
    const v = testDb.createItem('teams', { name: 'n1', k: '1' })
    expect(v).to.equal({ name: 'n1', teamId: 'n1', k: '1' }).and.have('id')
    done()
  })

  it('cannot store resource with duplicated name', (done) => {
    testDb.createItem('teams', {}, { name: 'n1' })

    expect(() => testDb.createItem('teams', {}, { name: 'n1' })).to.throw()
    done()
  })

  it('can store relationships', (done) => {
    const v = testDb.createItem('services', { teamId: 't1', serviceId: 'n1' }, { name: 'n1', k: '1' })
    expect(v).to.deep.equal({ name: 'n1', teamId: 't1', serviceId: 'n1', k: '1' })
    done()
  })

  it.skip('can remove item', (done) => {
    testDb.createItem('teams', { teamId: 'n1' }, { name: 'n1', k: '1' })
    testDb.createItem('teams', { teamId: 'n2' }, { name: 'n2', k: '1' })

    testDb.deleteItem('teams', { teamId: 'n1' })
    expect(() => testDb.getItem('teams', { teamId: 'n1' })).to.throw()

    const v = testDb.getItem('teams', { teamId: 'n2' })
    expect(v).to.not.be.undefined
    done()
  })

  it('can update item', (done) => {
    testDb.createItem('teams', { teamId: 'n1' }, { name: 'n1', k: '1' })
    testDb.updateItem('teams', { teamId: 'n1' }, { name: 'n1', k: '2' })

    const v = testDb.getItem('teams', { teamId: 'n1' })
    expect(v).to.deep.equal({ name: 'n1', k: '2', teamId: 'n1' })
    done()
  })

  it('can obtain collection', (done) => {
    testDb.createItem('teams', { teamId: 'n1' }, { name: 'n1', k: '1' })
    testDb.createItem('teams', { teamId: 'n2' }, { name: 'n2', k: '1' })
    const v = testDb.getCollection('teams', {})
    expect(v).to.have.lengthOf(2)
    done()
  })

  it('can obtain service from a given team', (done) => {
    testDb.createItem('teams', { teamId: 't1' }, { name: 't1', t: '1' })
    testDb.createItem('services', { teamId: 't1', serviceId: 's1' }, { name: 's1', s: '1' })

    const v = testDb.getItem('services', { teamId: 't1', serviceId: 's1' })
    expect(v).to.deep.equal({ teamId: 't1', serviceId: 's1', name: 's1', s: '1' })
    done()
  })

  it('can obtain services from a given team', (done) => {
    testDb.createItem('teams', { teamId: 't1' }, { name: 't1', t: '1' })
    testDb.createItem('teams', { teamId: 't2' }, { name: 't2', t: '2' })
    testDb.createItem('services', { teamId: 't1', serviceId: 's1' }, { name: 's1', s: '1' })
    testDb.createItem('services', { teamId: 't2', serviceId: 's1' }, { name: 's2', s: '2' })
    testDb.createItem('services', { teamId: 't2', serviceId: 's2' }, { name: 's1', s: '1' })

    const v = testDb.getCollection('services', { teamId: 't2' })
    expect(v).to.have.lengthOf(2)
    done()
  })

  it.skip('throws error if item does not exist', (done) => {
    expect(() => testDb.getItem('teams', { teamId: 'n1' })).to.throw()
    done()
  })
})
