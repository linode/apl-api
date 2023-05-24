import { expect } from 'chai'
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

describe('License tests', () => {
  it('should throw exception on provided license', () => {
    expect(() => {
      checkLicense('post', 'teams', noLicense, '')
    }).to.throw('no license found')
  })
  it('should throw exception on invalid license', () => {
    expect(() => {
      checkLicense('post', 'teams', invalidLicense, '')
    }).to.throw('license is not valid')
  })
  it('should check if license has team capabilities', (done) => {
    checkLicense('post', 'teams', validLicense, { teams: ['', ''] })
    done()
  })
  it('should check if license has workloads capabilities', (done) => {
    checkLicense('post', 'workloads', validLicense, { workloads: ['', ''] })
    done()
  })
  it('should check if license has service capabilities', (done) => {
    checkLicense('post', 'services', validLicense, { services: ['', ''] })
    done()
  })
  it('should throw exception on license team capabilities', () => {
    validLicense.body!.capabilities.teams = 2
    expect(() => {
      checkLicense('post', 'teams', validLicense, { teams: ['', '', ''] })
    }).to.throw('maximum number of teams are reached for this license')
  })
  it('should throw exception on license workloads capabilities', () => {
    validLicense.body!.capabilities.workloads = 2
    expect(() => {
      checkLicense('post', 'workloads', validLicense, { workloads: ['', ''] })
    }).to.throw('maximum number of workloads are reached for this license')
  })
  it('should throw exception on license services capabilities', () => {
    validLicense.body!.capabilities.services = 2
    expect(() => {
      checkLicense('post', 'services', validLicense, { services: ['', ''] })
    }).to.throw('maximum number of services are reached for this license')
  })
})
