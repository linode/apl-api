/* eslint-disable @typescript-eslint/ban-ts-ignore */
import './test-init'
import { expect } from 'chai'
import cloneDeep from 'lodash/cloneDeep'
import * as k8s from '@kubernetes/client-node'
import sinon from 'sinon'
import OtomiStack from './otomi-stack'
import { Repo } from './repo'

describe('Settings', () => {
  const otomi = new OtomiStack()
  otomi.repo = new Repo('./test', undefined, undefined, undefined, undefined, undefined)

  it('should assign a dummy payload', () => {
    const settings = otomi.getSettings()
    const payload: any = {
      ...settings,
      alerts: {
        drone: 'someTeamChat',
      },
    }

    expect(otomi.editSettings(payload)).to.deep.equal(payload)
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
    // @ts-ignore
    sinon.stub(client, 'createNamespacedSecret').returns(secretPromise)
    // @ts-ignore
    sinon.stub(client, 'readNamespacedServiceAccount').returns(newServiceAccountPromise)
    // @ts-ignore
    const patchSpy = sinon.stub(client, 'patchNamespacedServiceAccount').returns(undefined)
    await otomiStack.createPullSecret({ teamId, name, server, password: data.password, username: data.username })
    expect(patchSpy).to.have.been.calledWith('default', namespace, saWithExistingSecret)
  })

  it('should create a valid pull secret and attach it to an SA that has an empty pullsecrets array', async () => {
    // @ts-ignore
    sinon.stub(client, 'createNamespacedSecret').returns(secretPromise)
    // @ts-ignore
    sinon.stub(client, 'readNamespacedServiceAccount').returns(newEmptyServiceAccountPromise)
    // @ts-ignore
    const patchSpy = sinon.stub(client, 'patchNamespacedServiceAccount').returns(undefined)
    await otomiStack.createPullSecret({ teamId, name, server, password: data.password, username: data.username })
    expect(patchSpy).to.have.been.calledWith('default', namespace, saWithExistingSecret)
  })

  it('should create a valid pull secret and attach it to an SA that already has a pullsecret', async () => {
    // @ts-ignore
    sinon.stub(client, 'createNamespacedSecret').returns(secretPromise)
    // @ts-ignore
    sinon.stub(client, 'readNamespacedServiceAccount').returns(withOtherSecretServiceAccountPromise)
    // @ts-ignore
    const patchSpy = sinon.stub(client, 'patchNamespacedServiceAccount').returns(undefined)
    await otomiStack.createPullSecret({ teamId, name, server, password: data.password, username: data.username })
    expect(patchSpy).to.have.been.calledWith('default', namespace, saCombinedWithOtherSecret)
  })

  it('should throw exception on secret creation for existing name', () => {
    sinon.stub(client, 'createNamespacedSecret').throws(409)
    const check = otomiStack.createPullSecret({
      teamId,
      name,
      server,
      password: data.password,
      username: data.username,
    })
    return expect(check).to.eventually.be.rejectedWith(`Secret '${name}' already exists in namespace 'team-${teamId}'`)
  })

  it('should delete an existing pull secret successfully', async () => {
    // @ts-ignore
    sinon.stub(client, 'readNamespacedServiceAccount').returns(withExistingSecretServiceAccountPromise)
    // @ts-ignore
    const patchSpy = sinon.stub(client, 'patchNamespacedServiceAccount').returns(undefined)
    // @ts-ignore
    const deleteSpy = sinon.stub(client, 'deleteNamespacedSecret').returns(undefined)
    await otomiStack.deletePullSecret(teamId, name)
    expect(patchSpy).to.have.been.calledWith('default', namespace, saNewEmpty)
    expect(deleteSpy).to.have.been.calledWith(name, namespace)
  })
})
