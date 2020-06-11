import './test-init'
import { expect } from 'chai'
import fs from 'fs'
import yaml from 'js-yaml'
import cloneDeep from 'lodash/cloneDeep'
import * as k8s from '@kubernetes/client-node'
import sinon from 'sinon'
import OtomiStack from './otomi-stack'

describe('Load and dump values', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
  })

  it('should load values to db and convert them back', (done) => {
    // this.skip('New method signatur for getService needs implementation')
    const expectedValues = yaml.safeLoad(fs.readFileSync('./test/team.yaml', 'utf8'))
    const values = cloneDeep(expectedValues)
    const cluster = { cloudName: 'aws', cluster: 'dev', id: 'aws/dev', dnsZones: ['otomi.cloud'] }
    otomiStack.loadTeamsValues(values.teamConfig.teams, cluster)

    const expectedTeam = {
      id: 'team1',
      cicd: {
        enabled: true,
        type: 'drone',
      },
      password: 'somepassworddd',
      clusters: ['aws/dev'],
    }
    const expectedService = {
      id: 'id1',
      teamId: 'team1',
      clusterId: 'aws/dev',
      ingress: {
        domain: 'otomi.cloud',
        hasSingleSignOn: false,
        hasCert: false,
        certArn: undefined,
        subdomain: 'hello.team-team1.dev',
        path: '/bla',
        forwardPath: false,
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
      id: 'id2',
      teamId: 'team1',
      clusterId: 'aws/dev',
      name: 'hello-predeployed-ksvc',
      ingress: {
        domain: 'otomi.cloud',
        hasSingleSignOn: true,
        hasCert: false,
        certArn: undefined,
        subdomain: 'hello-predeployed-ksvc.team-team1.dev',
        path: undefined,
        forwardPath: false,
      },
      ksvc: {
        serviceType: 'ksvcPredeployed',
      },
    }

    const expectedService3 = {
      id: 'id3',
      teamId: 'team1',
      clusterId: 'aws/dev',
      name: 'hello-ksvc-internal',
      internal: true,
      ksvc: {
        serviceType: 'ksvcPredeployed',
      },
    }

    const expectedService4 = {
      id: 'id4',
      teamId: 'team1',
      clusterId: 'aws/dev',
      name: 'hello-svc',
      ingress: {
        domain: 'otomi.cloud',
        hasSingleSignOn: true,
        hasCert: false,
        certArn: undefined,
        subdomain: 'hello-svc.team-team1.dev',
        path: undefined,
        forwardPath: false,
      },
      ksvc: {
        serviceType: 'svcPredeployed',
      },
    }

    let data = otomiStack.getTeam('team1')
    expect(data).to.deep.equal(expectedTeam)

    data = otomiStack.getService('id1')
    expect(data).to.deep.equal(expectedService)

    data = otomiStack.getService('id2')
    expect(data).to.deep.equal(expectedService2)

    data = otomiStack.getService('id3')
    expect(data).to.deep.equal(expectedService3)

    data = otomiStack.getService('id4')
    expect(data).to.deep.equal(expectedService4)

    const dbValues = otomiStack.convertTeamsToValues(cluster)
    expect(dbValues).to.deep.equal(expectedValues)
    done()
  })
})

describe('Data validation', () => {
  let otomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
  })

  it('should throw exception on duplicated domain', (done) => {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc1 = { ...svc }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const check = otomiStack.checkPublicUrlInUse(svc1)
    expect(check).to.be.throw
    done()
  })
  it('should throw exception on duplicated url with path', (done) => {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    const svc1 = { ...svc }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const check = otomiStack.checkPublicUrlInUse(svc1)
    expect(check).to.be.throw
    done()
  })
  it('should not throw exception on unique url', (done) => {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const svc1 = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'c' } }
    const check = otomiStack.checkPublicUrlInUse(svc1)
    expect(check).to.be.undefined
    done()
  })
})

describe('Secret creation', () => {
  const teamId = 'testtt'
  const namespace = `team-${teamId}`
  const name = 'somesecreettt'
  const server = 'eu.gcr.io'
  const data = { username: 'someusernameee', password: 'somepassworddd' }

  const secret = {
    ...new k8s.V1Secret(),
    metadata: { ...new k8s.V1ObjectMeta(), name },
    type: 'docker-registry',
    data: {
      '.dockerconfigjson': Buffer.from(JSON.stringify(data)).toString('base64'),
    },
  }
  const secretPromise = Promise.resolve({
    response: undefined,
    body: secret,
  })
  const saNew = { ...new k8s.V1ServiceAccount(), name: 'default' }
  const saNewEmpty = { ...saNew, imagePullSecrets: [] }
  const saWithOtherSecret = { ...saNew, imagePullSecrets: [{ name: 'bla' }] }
  const saCombinedWithOtherSecret = { ...saNew, imagePullSecrets: [{ name: 'bla' }, { name }] }
  const saWithExistingSecret = { ...saNew, imagePullSecrets: [{ name }] }
  const newServiceAccountPromise = Promise.resolve({
    response: undefined,
    body: cloneDeep(saNew),
  })
  const newEmptyServiceAccountPromise = Promise.resolve({
    response: undefined,
    body: cloneDeep(saNewEmpty),
  })
  const withOtherSecretServiceAccountPromise = Promise.resolve({
    response: undefined,
    body: cloneDeep(saWithOtherSecret),
  })
  const withExistingSecretServiceAccountPromise = Promise.resolve({
    response: undefined,
    body: cloneDeep(saWithExistingSecret),
  })

  let otomiStack: OtomiStack = new OtomiStack()
  let client: k8s.CoreV1Api

  beforeEach(() => {
    otomiStack = new OtomiStack()
    client = otomiStack.getApiClient()
  })

  it('should create a valid pull secret and attach it to an SA without pullsecrets', async () => {
    sinon.stub(client, 'createNamespacedSecret').returns(secretPromise)
    sinon.stub(client, 'readNamespacedServiceAccount').returns(newServiceAccountPromise)
    const patchSpy = sinon.stub(client, 'patchNamespacedServiceAccount').returns(undefined)
    await otomiStack.createPullSecret(teamId, name, server, data.password, data.username)
    expect(patchSpy).to.have.been.calledWith('default', namespace, saWithExistingSecret)
  })

  it('should create a valid pull secret and attach it to an SA that has an empty pullsecrets array', async () => {
    sinon.stub(client, 'createNamespacedSecret').returns(secretPromise)
    sinon.stub(client, 'readNamespacedServiceAccount').returns(newEmptyServiceAccountPromise)
    const patchSpy = sinon.stub(client, 'patchNamespacedServiceAccount').returns(undefined)
    await otomiStack.createPullSecret(teamId, name, server, data.password, data.username)
    expect(patchSpy).to.have.been.calledWith('default', namespace, saWithExistingSecret)
  })

  it('should create a valid pull secret and attach it to an SA that already has a pullsecret', async () => {
    sinon.stub(client, 'createNamespacedSecret').returns(secretPromise)
    sinon.stub(client, 'readNamespacedServiceAccount').returns(withOtherSecretServiceAccountPromise)
    const patchSpy = sinon.stub(client, 'patchNamespacedServiceAccount').returns(undefined)
    await otomiStack.createPullSecret(teamId, name, server, data.password, data.username)
    expect(patchSpy).to.have.been.calledWith('default', namespace, saCombinedWithOtherSecret)
  })

  it('should throw exception on secret creation for existing name', () => {
    sinon.stub(client, 'createNamespacedSecret').throws(409)
    const check = otomiStack.createPullSecret(teamId, name, server, data.password, data.username)
    return expect(check).to.eventually.be.rejectedWith(`Secret '${name}' already exists in namespace 'team-${teamId}'`)
  })

  it('should delete an existing pull secret successfully', async () => {
    sinon.stub(client, 'readNamespacedServiceAccount').returns(withExistingSecretServiceAccountPromise)
    const patchSpy = sinon.stub(client, 'patchNamespacedServiceAccount').returns(undefined)
    const deleteSpy = sinon.stub(client, 'deleteNamespacedSecret').returns(undefined)
    await otomiStack.deletePullSecret(teamId, name)
    expect(patchSpy).to.have.been.calledWith('default', namespace, saNewEmpty)
    expect(deleteSpy).to.have.been.calledWith(name, namespace)
  })
})
