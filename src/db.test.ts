import Db from 'src/db'
jest.mock('src/otomi-stack')

describe('Db', () => {
  let testDb: Db

  beforeEach(() => {
    testDb = new Db()
  })

  test('can store with id', () => {
    const v = testDb.createItem('teams', { name: 'n1', k: '1' }, undefined, '1')
    expect(v).toEqual({ name: 'n1', k: '1', id: '1' })
  })

  test('can store without id', () => {
    const v = testDb.createItem('teams', { name: 'n1', k: '1' })
    expect(v).toMatchObject({ name: 'n1', k: '1' })
    // @ts-ignore
    expect(v.id).toBeDefined()
  })

  test('cannot store resource with existing selector', () => {
    testDb.createItem('teams', { name: 'n1' })
    expect(() => testDb.createItem('teams', { name: 'n1' }, { name: 'n1' })).toThrow()
  })

  test('can remove item', () => {
    testDb.createItem('teams', { name: 'name1', k: 'a' }, undefined, '1')
    testDb.createItem('teams', { name: 'name2', k: 'b' }, undefined, '2')

    testDb.deleteItem('teams', { id: '1' })
    expect(() => testDb.getItem('teams', { id: '1' })).toThrow()

    const v = testDb.getItem('teams', { id: '2' })
    expect(v).not.toBeUndefined()
  })

  test('can update item', () => {
    testDb.createItem('teams', { name: 'n1', k: '1' }, undefined, '1')
    testDb.updateItem('teams', { name: 'n1', k: '2' }, { id: '1' })
    const v = testDb.getItem('teams', { id: '1' })
    expect(v).toEqual({ name: 'n1', k: '2', id: '1' })
  })

  test('can obtain item', () => {
    testDb.createItem('teams', { name: 'n1', k: '1' }, undefined, '1')
    const v = testDb.getItem('teams', { name: 'n1' })
    expect(v).toEqual({ name: 'n1', k: '1', id: '1' })
  })

  test('can obtain collection', () => {
    testDb.createItem('teams', { name: 'n1', k: '1' })
    testDb.createItem('teams', { name: 'n2', k: '1' })
    const v = testDb.getCollection('teams')
    expect(v.length).toBe(2)
  })

  test('can obtain collection by selector', () => {
    testDb.createItem('teams', { name: 'n1', k: '1' })
    testDb.createItem('teams', { name: 'n2', k: '1' })
    const v = testDb.getCollection('teams', { k: '1' })
    expect(v.length).toBe(2)
    const v2 = testDb.getCollection('teams', { name: 'n1' })
    expect(v2.length).toBe(1)
  })

  test('throws error if item does not exist', () => {
    expect(() => testDb.getItem('teams', { teamId: 'n1' })).toThrow()
  })
})
