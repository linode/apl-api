const expect = require('chai').expect
const otomi = require('./otomi-stack')
const yaml = require('js-yaml')
const fs = require('fs')
const db = require('./db')
const _ = require('lodash')

describe('Load and dump values', function () {
  let otomiStack = undefined
  beforeEach(function () {
    const d = db.init()
    otomiStack = new otomi.OtomiStack(null, d)
  })

  it('should load values to db and convert them back', function (done) {
    const expectedValues = yaml.safeLoad(fs.readFileSync('./test/team.yaml', 'utf8'))
    const values = _.cloneDeep(expectedValues)
    const cluster = { cloudName: 'aws', cluster: 'dev', id: 'aws/dev', dnsZones: ['otomi.cloud'] }
    otomiStack.loadTeamsValues(values.teamConfig.teams, cluster)

    const expectedTeam = {
      teamId: 'team1',
      name: 'team1',
      cicd: {
        enabled: true,
        type: 'drone',
      },
      password: 'somepassworddd',
      clusters: ['aws/dev'],
    }
    const expectedService = {
      teamId: 'team1',
      clusterId: 'aws/dev',
      ingress: {
        domain: 'otomi.cloud',
        hasSingleSignOn: false,
        hasCert: false,
        certArn: undefined,
        subdomain: 'hello.team-team1.dev',
      },
      spec: {
        annotations: [{ name: 'autoscaling.knative.dev/minScale', value: '1' }],
        env: [{ name: 'RED', value: 'KUBES' }],
        image: {
          repository: 'otomi/helloworld-nodejs',
          tag: '1.1.3',
        },
      },
      name: 'hello',
    }

    const expectedService2 = {
      teamId: 'team1',
      clusterId: 'aws/dev',
      name: 'hello-predeployed-ksvc',
      ingress: {
        domain: 'otomi.cloud',
        hasSingleSignOn: true,
        hasCert: false,
        certArn: undefined,
        subdomain: 'hello-predeployed-ksvc.team-team1.dev',
      },
      spec: {
        predeployed: true,
      },
    }

    const expectedService3 = {
      teamId: 'team1',
      clusterId: 'aws/dev',
      name: 'hello-ksvc-internal',
      ingress: {
        internal: true,
      },
      spec: {
        predeployed: true,
      },
    }

    const expectedService4 = {
      teamId: 'team1',
      clusterId: 'aws/dev',
      name: 'hello-svc',
      ingress: {
        domain: 'otomi.cloud',
        hasSingleSignOn: true,
        hasCert: false,
        certArn: undefined,
        subdomain: 'hello-svc.team-team1.dev',
      },
      spec: {
        name: 'hello-svc',
      },
    }

    let data = otomiStack.getTeam('team1')
    expect(data).to.deep.equal(expectedTeam)

    data = otomiStack.getService('team1', 'hello', 'aws/dev')
    expect(data).to.deep.equal(expectedService)

    data = otomiStack.getService('team1', 'hello-predeployed-ksvc', 'aws/dev')
    expect(data).to.deep.equal(expectedService2)

    data = otomiStack.getService('team1', 'hello-ksvc-internal', 'aws/dev')
    expect(data).to.deep.equal(expectedService3)

    data = otomiStack.getService('team1', 'hello-svc', 'aws/dev')
    expect(data).to.deep.equal(expectedService4)

    const dbValues = otomiStack.convertTeamsToValues(cluster)
    expect(dbValues).to.deep.equal(expectedValues)
    done()
  })
})

describe('Data validation', function () {
  let otomiStack = undefined
  beforeEach(function () {
    const d = db.init()
    otomiStack = new otomi.OtomiStack(null, d)
  })

  it('should indicate duplicated subdomain', function (done) {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc1 = { serviceId: 's/B', ingress: { domain: 'a.com', subdomain: 'b' } }

    otomiStack.db.createItem('services', { teamId: 'A' }, svc)

    const duplicated = otomiStack.isDomainDuplicated(svc1)
    expect(duplicated).to.be.true
    done()
  })
  it('should not indicate duplicated subdomain', function (done) {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const svc1 = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'c' } }
    const duplicated = otomiStack.isDomainDuplicated(svc1)
    expect(duplicated).to.be.false
    done()
  })
  it('should not indicate duplicated subdomain (existing service is updated)', function (done) {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const svc1 = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    const duplicated = otomiStack.isDomainDuplicated(svc1)
    expect(duplicated).to.be.false
    done()
  })
})
