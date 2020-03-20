const expect = require('chai').expect
const otomi = require('./otomi-stack')
const yaml = require('js-yaml')
const fs = require('fs')
const db = require('./db')
const _ = require('lodash')

describe('Load and dump values', function() {
  let otomiStack = undefined
  beforeEach(function() {
    const d = db.init()
    otomiStack = new otomi.OtomiStack(null, d)
  })

  it('should load values to db and convert them back', function(done) {
    const expectedValues = yaml.safeLoad(fs.readFileSync('./test/team.yaml', 'utf8'))
    const values = _.cloneDeep(expectedValues)
    const cluster = { cloud: 'aws', cluster: 'dev', id: 'dev/aws' }
    otomiStack.loadTeamsValues(values.teamConfig.teams, cluster)
    const expectedTeam = {
      teamId: 'team1',
      name: 'team1',
      cicd: {
        enabled: true,
        type: 'drone',
      },
      password: 'somepassworddd',
      clusters: ['dev/aws'],
    }
    const expectedService = {
      teamId: 'team1',
      serviceId: 'team1/hello',
      clusterId: 'dev/aws',

      image: {
        repository: 'otomi/helloworld-nodejs',
        tag: '1.1.3',
      },
      isPublic: true,
      logo: { name: 'kubernetes' },
      name: 'hello',
      serviceType: {
        ksvc: {
          annotations: [{ name: 'autoscaling.knative.dev/minScale', value: '1' }],
          env: [{ name: 'RED', value: 'KUBES' }],
        },

        svc: 'svc_data',
      },
    }

    let data = otomiStack.getTeam('team1')
    expect(data).to.deep.equal(expectedTeam)

    data = otomiStack.getService('team1', 'hello')
    expect(data).to.deep.equal(expectedService)

    const dbValues = otomiStack.convertDbToValues(cluster)
    expect(dbValues).to.deep.equal(expectedValues)
    done()
  })

  it('should set password', function(done) {
    let team = { password: undefined }
    otomiStack.setPasswordIfNotExist(team)
    expect(16).to.be.equal(team.password.length)
    done()
  })

  it('should not set password', function(done) {
    let team = { password: 'abcd' }
    otomiStack.setPasswordIfNotExist(team)
    expect(team.password).to.be.equal('abcd')
    done()
  })
})
