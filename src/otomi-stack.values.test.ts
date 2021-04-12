import { expect } from 'chai'
import OtomiStack from './otomi-stack'
import { Repo } from './repo'

const expectedDbState = {
  cluster: [
    {
      id: '1f4e8330-8e85-4da0-9a6d-488c8e192c90',
      apiName: 'onprem',
      apiServer: 'apiServer.onprem.example.com',
      dnsZones: ['onprem.example.com', 'example.com'],
      domain: 'onprem.example.com',
      k8sVersion: '1.19',
      name: 'dev',
      otomiVersion: 'master',
      provider: 'onprem',
      region: 'eu-central-1',
    },
  ],
  teams: [
    {
      name: 'otomi',
      id: 'otomi',
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
      id: 'dev',
      name: 'dev',
      oidc: {},
      password: 'linux1234',
    },
  ],
  services: [
    {
      name: 'servant1',
      id: 'fb88a85d-49e6-4c20-98ed-11b3ceff540e',
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
      name: 'hello',
      id: 'f818a64d-25a4-46e0-9eaf-769b78866031',
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
      name: 'servant2',
      id: 'f818a64d-25a4-46e0-9eaf-769b7886603d',
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
      name: 'informant',
      id: '2f18da9a-e659-479d-9d65-2ca82503f43c',
      internal: true,
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
      cloud: 'onprem',
      name: 'dev',
      domain: 'dev.onprem.example.com',
      enabled: true,
      id: '9a777336-72c0-4dee-9885-55b9ce85c9c2',
    },
  ],
  secrets: [
    {
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
