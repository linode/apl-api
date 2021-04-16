import { expect } from 'chai'
import { merge } from 'lodash'
import OtomiStack from './otomi-stack'
import { Repo } from './repo'
import expectedDbState from './fixtures/values'
import secretSettings from './fixtures/secret-settings'
import { getObjectPaths } from './utils'

describe('Work with values', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
    otomiStack.repo = new Repo('./test', undefined, undefined, undefined, undefined, undefined)
  })

  it('can load from configuration to database', () => {
    otomiStack.loadValues()
    const dbState = otomiStack.db.db.getState()
    expectedDbState.settings = merge(expectedDbState.settings, secretSettings)
    expect(dbState).to.deep.equal(expectedDbState)
  })
  it('can save database state to configuration files', () => {
    const results = {}
    function writeFileStub(path, data): void {
      results[path] = data
    }
    otomiStack.db.db.setState(expectedDbState)
    otomiStack.secretPaths = getObjectPaths(secretSettings)
    otomiStack.repo.writeFile = writeFileStub
    otomiStack.saveValues()
    // eslint-disable-next-line no-restricted-syntax
    for (const [path, data] of Object.entries(results)) {
      const expectedData = otomiStack.repo.readFile(path)
      expect(data, path).to.have.any.keys(expectedData)
    }
  })
})
