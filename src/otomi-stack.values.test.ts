import { expect } from 'chai'
import OtomiStack from './otomi-stack'
import { Repo } from './repo'

const expectedDbState = {
  teams: [
    {
      name: 'otomi',
      id: 'otomi',
      clusters: ['aws/dev', 'onprem/dev'],
      azure: {},
      password: 'linux123',
      oidc: {
        groupMapping: '0efd2f6d-fb8b-49a9-9507-54cd6e92c348',
      },
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
      hasKnative: true,
      region: 'local',
      id: 'onprem/dev',
    },
  ],
  secrets: [
    {
      name: 'generic-example',
      type: 'generic',
      entries: [
        {
          key: 'keyyyy',
          value: 'valueeee',
        },
        {
          key: 'ke2',
          value: 'val2',
        },
      ],
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf95',
      teamId: 'otomi',
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
