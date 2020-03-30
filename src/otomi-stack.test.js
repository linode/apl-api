const expect = require('chai').expect;
const otomi = require('./otomi-stack')
const yaml = require('js-yaml');
const fs = require('fs');
const db = require('./db');
const _ = require('lodash')

describe("Load and dump values", function () {
  let otomiStack = undefined
  beforeEach(function () {
    const d = db.init()
    otomiStack = new otomi.OtomiStack(null, d)
  })

  it("should load values to db and convert them back", function (done) {
    const expectedValues = yaml.safeLoad(fs.readFileSync('./test/team.yaml', 'utf8'))
    const values = _.cloneDeep(expectedValues)
    const cluster = { cloudName: 'aws', clusterName: 'dev', id: 'dev/aws' }
    otomiStack.loadTeamsValues(values.teamConfig.teams, cluster)

    const expectedTeam = {
      teamId: 'team1',
      name: 'team1',
      cicd: {
        enabled: true,
        type: 'drone'
      },
      password: 'somepassworddd',
      clusters: ['dev/aws'],
    }
    const expectedService = {
      teamId: 'team1',
      serviceId: 'team1/hello',
      clusterId: 'dev/aws',
      ingress: {
        hasSingleSignOn: false,
        hasCert: false,
        certArn: undefined
      },
      spec: {
        annotations: [{ name: 'autoscaling.knative.dev/minScale', value: '1' }],
        env: [{ name: 'RED', value: 'KUBES' }],
      },
      image: {
        repository: 'otomi/helloworld-nodejs',
        tag: '1.1.3'
      },
      logo: { name: 'kubernetes' },
      name: 'hello',

    }

    const expectedService2 = {
      teamId: 'team1',
      serviceId: 'team1/hello-predeployed-ksvc',
      clusterId: 'dev/aws',
      name: 'hello-predeployed-ksvc',
      ingress: {
        hasSingleSignOn: true,
        hasCert: false,
        certArn: undefined
      },
      spec: {
        predeployed: true,
      },
    }

    const expectedService3 = {
      teamId: 'team1',
      serviceId: 'team1/hello-ksvc-internal',
      clusterId: 'dev/aws',
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
      serviceId: 'team1/hello-svc',
      clusterId: 'dev/aws',
      name: 'hello-svc',
      ingress: {
        hasSingleSignOn: true,
        hasCert: false,
        certArn: undefined
      },
      spec: {
        name: 'hello-svc',
      },
    }

    let data = otomiStack.getTeam('team1')
    expect(data).to.deep.equal(expectedTeam)

    data = otomiStack.getService('team1', 'hello')
    expect(data).to.deep.equal(expectedService)

    data = otomiStack.getService('team1', 'hello-predeployed-ksvc')
    expect(data).to.deep.equal(expectedService2)

    data = otomiStack.getService('team1', 'hello-ksvc-internal')
    expect(data).to.deep.equal(expectedService3)

    data = otomiStack.getService('team1', 'hello-svc')
    expect(data).to.deep.equal(expectedService4)

    const dbValues = otomiStack.convertDbToValues(cluster)
    expect(dbValues).to.deep.equal(expectedValues)
    done()
  });

  it("should set password", function (done) {
    let team = { password: undefined }
    otomiStack.setPasswordIfNotExist(team)
    expect(16).to.be.equal(team.password.length)
    done()
  });

  it("should not set password", function (done) {
    let team = { password: 'abcd' }
    otomiStack.setPasswordIfNotExist(team)
    expect(team.password).to.be.equal('abcd')
    done()
  });

});
