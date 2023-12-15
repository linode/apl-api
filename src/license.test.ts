import { expect } from 'chai'
import OtomiStack from 'src/otomi-stack'
import { checkLicense } from './license-utils'
import { License } from './otomi-models'

const validLicense: License = {
  isValid: true,
  hasLicense: true,
  jwt: '',
  body: {
    version: 1,
    key: 'abc',
    type: 'professional',
    capabilities: {
      teams: 3,
      services: 3,
      workloads: 3,
    },
  },
}
const invalidLicense: License = {
  hasLicense: true,
  isValid: false,
}
const noLicense: License = {
  hasLicense: false,
  isValid: false,
}

const capabilities = ['teams', 'services', 'workloads']

describe('License tests', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
  })
  it('should throw exception on provided license', () => {
    otomiStack.db.db.set('license', noLicense).write()
    expect(() => {
      checkLicense('post', 'teams', otomiStack)
    }).to.throw('no license found')
  })
  it('should throw exception on invalid license', () => {
    otomiStack.db.db.set('license', invalidLicense).write()
    expect(() => {
      checkLicense('post', 'teams', otomiStack)
    }).to.throw('license is not valid')
  })
  for (const capability of capabilities) {
    it(`should check if license has ${capability} capabilities`, (done) => {
      otomiStack.db.db.set('license', validLicense).write()
      otomiStack.db.db.set(capability, [{}, {}]).write()
      checkLicense('post', capability, otomiStack)
      done()
    })

    it(`should throw exception on license ${capability} capabilities`, () => {
      validLicense.body!.capabilities[capability] = 2
      otomiStack.db.db.set('license', validLicense).write()
      otomiStack.db.db.set(capability, [{}, {}, {}]).write()
      expect(() => {
        checkLicense('post', capability, otomiStack)
      }).to.throw(`maximum number of ${capability} are reached for this license`)
    })
  }
})
