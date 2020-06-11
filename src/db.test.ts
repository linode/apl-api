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
    expect(v).to.include({ name: 'n1', k: '1' }).to.haveOwnProperty('id')
    done()
  })

  it('cannot store resource with existing selector', (done) => {
    testDb.createItem('teams', { name: 'n1' })

    expect(() => testDb.createItem('teams', { name: 'n1' }, { name: 'n1' })).to.throw()
    done()
  })

  it('can remove item', (done) => {
    testDb.createItem('teams', { name: 'name1', k: 'a' }, undefined, '1')
    testDb.createItem('teams', { name: 'name2', k: 'b' }, undefined, '2')

    testDb.deleteItem('teams', { id: '1' })
    expect(() => testDb.getItem('teams', { id: '1' })).to.throw()

    const v = testDb.getItem('teams', { id: '2' })
    expect(v).to.not.be.undefined
    done()
  })

  it('can update item', (done) => {
    testDb.createItem('teams', { name: 'n1', k: '1' }, undefined, '1')
    testDb.updateItem('teams', { name: 'n1', k: '2' }, { id: '1' })

    const v = testDb.getItem('teams', { id: '1' })
    expect(v).to.deep.equal({ name: 'n1', k: '2', id: '1' })
    done()
  })

  it('can obtain item', (done) => {
    testDb.createItem('teams', { name: 'n1', k: '1' }, undefined, '1')
    const v = testDb.getItem('teams', { name: 'n1' })
    expect(v).to.deep.equal({ name: 'n1', k: '1', id: '1' })
    done()
  })

  it('can obtain collection', (done) => {
    testDb.createItem('teams', { name: 'n1', k: '1' })
    testDb.createItem('teams', { name: 'n2', k: '1' })
    const v = testDb.getCollection('teams')
    expect(v).to.have.lengthOf(2)
    done()
  })

  it('can obtain collection by selector', (done) => {
    testDb.createItem('teams', { name: 'n1', k: '1' })
    testDb.createItem('teams', { name: 'n2', k: '1' })
    const v = testDb.getCollection('teams', { k: '1' })
    expect(v).to.have.lengthOf(2)
    const v2 = testDb.getCollection('teams', { name: 'n1' })
    expect(v2).to.have.lengthOf(1)
    done()
  })

  it('throws error if item does not exist', (done) => {
    expect(() => testDb.getItem('teams', { teamId: 'n1' })).to.throw()
    done()
  })
})
