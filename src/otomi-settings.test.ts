import { expect } from 'chai'
import { mergeLikeHelm, diffLikeHelm } from './otomi-settings'

describe('Settings utils', () => {
  it('should properly merge two objects', () => {
    const o1 = { a: { b: ['B', 'B'] }, c: 'C', d: 'D' }
    const o2 = { a: { b: ['BB'] }, d: 'DD', e: 'E' }
    const oExpected = { a: { b: ['BB'] }, c: 'C', d: 'DD', e: 'E' }
    const o3 = mergeLikeHelm(o1, o2)
    expect(o3).to.deep.equal(oExpected)
  })

  it('should properly diff two objects', () => {
    const o2 = { a: { b: ['BB1', 'BB2'] }, d: 'DD', e: 'E' }
    const o3 = { a: { b: ['BB3'] }, c: 'C', d: 'DD', e: 'E' }
    const oExpected = { a: { b: ['BB3'] }, c: 'C' }
    const o = diffLikeHelm(o2, o3)
    expect(o).to.deep.equal(oExpected)
  })
})

// describe('Load settings', () => {
//   it('should load default settings', () => {
//     // empty
//   })
//   it('should load cloud specific settings', () => {
//     // empty
//   })
//   it('should load cluster specific settings', () => {
//     // empty
//   })
// })

// describe('Save settings', () => {
//   it('should save default settings', () => {
//     // empty
//   })
//   it('should save cloud specific that are not present in default one', () => {
//     // empty
//   })
//   it('should get cluster specific that are not present in cloud specific and default ones', () => {
//     // empty
//   })
// })

// describe('Load settings', () => {
//   it('should load default settings', () => {
//     // empty
//   })
//   it('should get cloud specific settings', () => {
//     // empty
//   })
//   it('should get cluster specific settings', () => {
//     // empty
//   })
// })
