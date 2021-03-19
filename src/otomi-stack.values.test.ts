import { expect } from 'chai'
import OtomiStack from './otomi-stack'
import { Repo } from './repo'

const expectedDbState = {
  teams: [
    {
      name: 'otomi',
      id: 'otomi',
      clusters: ['aws/dev', 'onprem/dev'],
      azureMonitor: {},
      password: 'linux123',
      oidc: {
        groupMapping: '0efd2f6d-fb8b-49a9-9507-54cd6e92c348',
      },
      alerts: {
        email: {
          critical: 'test@doma.in',
        },
        msteams: {},
        slack: {},
      },
    },
    {
      alerts: {},
      clusters: ['onprem/dev'],
      id: 'dev',
      name: 'dev',
      oidc: {},
      password: 'linux1234',
    },
  ],
  services: [
    {
      enabled: true,
      name: 'servant1',
      id: 'fb88a85d-49e6-4c20-98ed-11b3ceff540e',
      clusterId: 'onprem/dev',
      teamId: 'otomi',
      ksvc: {
        scaleToZero: false,
        image: {
          repository: 'otomi/helloworld-nodejs',
          tag: '1.2.8',
        },
        env: [
          {
            name: 'TARGET',
            value: 'master, I am servant 1',
          },
          {
            name: 'INFORMANT',
            value: 'http://informant.team-otomi.svc.cluster.local',
          },
        ],
        resources: {
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
        },
        annotations: [],
        serviceType: 'ksvc',
      },
      ingress: {
        certArn: undefined,
        hasCert: false,
        hasSingleSignOn: false,
        domain: 'onprem.example.com',
        subdomain: 'master',
        useDefaultSubdomain: false,
        path: '/servant-1',
        forwardPath: false,
      },
    },
    {
      enabled: true,
      name: 'hello',
      id: 'f818a64d-25a4-46e0-9eaf-769b78866031',
      clusterId: 'onprem/dev',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'svcPredeployed',
      },
      ingress: {
        certArn: undefined,
        hasCert: false,
        hasSingleSignOn: false,
        domain: 'onprem.example.com',
        path: undefined,
        subdomain: 'hello.team-otomi.dev',
        useDefaultSubdomain: false,
        forwardPath: false,
      },
    },
    {
      enabled: true,
      name: 'servant2',
      id: 'f818a64d-25a4-46e0-9eaf-769b7886603d',
      clusterId: 'onprem/dev',
      teamId: 'otomi',
      ksvc: {
        scaleToZero: false,
        image: {
          repository: 'otomi/helloworld-nodejs',
          tag: '1.2.8',
        },
        env: [
          {
            name: 'TARGET',
            value: 'master, I am servant 2',
          },
        ],
        resources: {
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
        },
        annotations: [],
        serviceType: 'ksvc',
      },
      ingress: {
        certArn: undefined,
        hasCert: false,
        hasSingleSignOn: false,
        domain: 'onprem.example.com',
        subdomain: 'master',
        useDefaultSubdomain: false,
        path: '/servant-2',
        forwardPath: false,
      },
    },
    {
      enabled: true,
      name: 'informant',
      id: '2f18da9a-e659-479d-9d65-2ca82503f43c',
      internal: true,
      clusterId: 'onprem/dev',
      teamId: 'otomi',
      ksvc: {
        scaleToZero: false,
        image: {
          repository: 'otomi/helloworld-nodejs',
          tag: '1.2.10',
        },
        env: [
          {
            name: 'TARGET',
            value: 'head servant, I have a version number',
          },
        ],
        resources: {
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
        },
        annotations: [],
        serviceType: 'ksvc',
      },
    },
  ],
  clouds: [],
  clusters: [
    {
      enabled: true,
      cloud: 'aws',
      name: 'dev',
      dnsZones: ['eks.example.com'],
      domain: 'dev.eks.example.com',
      k8sVersion: 1.16,
      otomiVersion: 'v0.11.18',
      hasKnative: true,
      region: 'eu-central-1',
      id: 'aws/dev',
    },
    {
      enabled: false,
      cloud: 'google',
      name: 'dev',
      dnsZones: ['gke.example.com'],
      domain: 'dev.gke.example.com',
      k8sVersion: 1.17,
      otomiVersion: 'master',
      hasKnative: true,
      region: 'europe-west4',
      id: 'google/dev',
    },
    {
      enabled: false,
      cloud: 'azure',
      name: 'dev',
      dnsZones: ['aks.example.com'],
      domain: 'dev.aks.example.com',
      k8sVersion: 1.17,
      otomiVersion: 'latest',
      hasKnative: true,
      region: 'westeurope',
      id: 'azure/dev',
    },
    {
      enabled: true,
      cloud: 'onprem',
      name: 'dev',
      dnsZones: ['onprem.example.com', 'example.com'],
      domain: 'dev.onprem.example.com',
      k8sVersion: 1.18,
      otomiVersion: 'v0.11.18',
      hasKnative: true,
      region: 'local',
      id: 'onprem/dev',
    },
  ],
  secrets: [
    {
      clusterId: 'aws/dev',
      entries: ['aa', 'bb', 'cc'],
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf95',
      name: 'mysecret-generic',
      teamId: 'otomi',
      type: 'generic',
    },
    {
      clusterId: 'aws/dev',
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf96',
      name: 'mysecret-registry',
      teamId: 'otomi',
      type: 'docker-registry',
    },
    {
      ca: 'ca.crt',
      clusterId: 'aws/dev',
      crt: 'tls.crt',
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf97',
      key: 'tls.key',
      name: 'mysecret-tls',
      teamId: 'otomi',
      type: 'tls',
    },
    {
      clusterId: 'aws/dev',
      entries: ['HELLO'],
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf98',
      name: 'hello-otomi',
      teamId: 'otomi',
      type: 'generic',
    },
    {
      clusterId: 'onprem/dev',
      entries: ['dd', 'ee', 'ff'],
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9A',
      name: 'mysecret-generic',
      teamId: 'otomi',
      type: 'generic',
    },
  ],
}

describe('Work with values', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
    otomiStack.repo = new Repo('./test', undefined, undefined, undefined, undefined, undefined)
  })

  it('can load from configuration to database', () => {
    otomiStack.loadValues()
    const dbState = otomiStack.db.db.getState()
    expect(dbState).to.deep.equal(expectedDbState)
  })
  it('can save database state to configuration files', () => {
    const results = {}
    function writeFileStub(path, data) {
      results[path] = data
    }
    otomiStack.db.db.setState(expectedDbState)
    otomiStack.repo.writeFile = writeFileStub
    otomiStack.saveValues()
    for (const [path, data] of Object.entries(results)) {
      const expectedData = otomiStack.repo.readFile(path)
      expect(data, path).to.deep.equal(expectedData)
    }
  })
})

describe('settings() methods', () => {
  describe('loadSettings()', () => {
    it('is not empty', () => {
      const otomi = new OtomiStack()
      otomi.repo = new Repo('./test', undefined, undefined, undefined, undefined, undefined)
      const data = otomi.loadSettings()
      expect(data).to.not.be.equal({})
    })
  })
})
