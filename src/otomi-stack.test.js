import { expect } from 'chai'
import fs from 'fs'
import yaml from 'js-yaml'
import cloneDeep from 'lodash/cloneDeep'
import OtomiStack from './otomi-stack'

describe('Load and dump values', function () {
  let otomiStack
  beforeEach(function () {
    otomiStack = new OtomiStack()
  })

  it('should load values to db and convert them back', function (done) {
    // this.skip('New method signatur for getService needs implementation')
    const expectedValues = yaml.safeLoad(fs.readFileSync('./test/team.yaml', 'utf8'))
    const values = cloneDeep(expectedValues)
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
      serviceId: 'aws/dev/team1/hello',
      teamId: 'team1',
      clusterId: 'aws/dev',
      ingress: {
        domain: 'otomi.cloud',
        hasSingleSignOn: false,
        hasCert: false,
        certArn: undefined,
        subdomain: 'hello.team-team1.dev',
      },
      ksvc: {
        serviceType: 'ksvc',
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
      serviceId: 'aws/dev/team1/hello-predeployed-ksvc',
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
      ksvc: {
        serviceType: 'ksvcPredeployed',
      },
    }

    const expectedService3 = {
      serviceId: 'aws/dev/team1/hello-ksvc-internal',
      teamId: 'team1',
      clusterId: 'aws/dev',
      name: 'hello-ksvc-internal',
      internal: true,
      ksvc: {
        serviceType: 'ksvcPredeployed',
      },
    }

    const expectedService4 = {
      serviceId: 'aws/dev/team1/hello-svc',
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
      ksvc: {
        serviceType: 'svcPredeployed',
      },
    }

    let data = otomiStack.getTeam('team1')
    expect(data).to.deep.equal(expectedTeam)

    data = otomiStack.getService('aws/dev/team1/hello')
    expect(data).to.deep.equal(expectedService)

    data = otomiStack.getService('aws/dev/team1/hello-predeployed-ksvc')
    expect(data).to.deep.equal(expectedService2)

    data = otomiStack.getService('aws/dev/team1/hello-ksvc-internal')
    expect(data).to.deep.equal(expectedService3)

    data = otomiStack.getService('aws/dev/team1/hello-svc')
    expect(data).to.deep.equal(expectedService4)

    const dbValues = otomiStack.convertTeamsToValues(cluster)
    expect(dbValues).to.deep.equal(expectedValues)
    done()
  })
})

describe('Data validation', function () {
  let otomiStack
  beforeEach(function () {
    otomiStack = new OtomiStack()
  })

  it('should indicate duplicated subdomain', function (done) {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc1 = { serviceId: 's/B', ingress: { domain: 'a.com', subdomain: 'b' } }

    otomiStack.db.createItem('services', { teamId: 'A' }, svc)

    const duplicated = otomiStack.isPublicUrlInUse(svc1)
    expect(duplicated).to.be.true
    done()
  })
  it('should not indicate duplicated subdomain', function (done) {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const svc1 = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'c' } }
    const duplicated = otomiStack.isPublicUrlInUse(svc1)
    expect(duplicated).to.be.false
    done()
  })
  it('should not indicate that public URL already exist (existing service is updated)', function (done) {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const svc1 = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    const duplicated = otomiStack.isPublicUrlInUse(svc1)
    expect(duplicated).to.be.false
    done()
  })
})
