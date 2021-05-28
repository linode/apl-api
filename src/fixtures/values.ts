export default {
  cluster: [
    {
      id: '1f4e8330-8e85-4da0-9a6d-488c8e192c90',
      apiName: 'onprem',
      apiServer: 'apiServer.onprem.example.com',
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
        secrets: [],
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
        secrets: [],
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
        secrets: ['mysecret-generic'],
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
  secrets: [
    {
      type: 'generic',
      teamId: 'otomi',
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9A',
      name: 'mysecret-generic',
      entries: ['dd', 'ee', 'ff'],
    },
    {
      type: 'generic',
      teamId: 'dev',
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9C',
      name: 'dev-generic',
      entries: ['aa', 'bb', 'cc'],
    },
  ],
  settings: {
    alerts: {
      drone: 'slack',
      groupInterval: '5m',
      receivers: ['slack', 'email'],
      repeatInterval: '3h',
    },
    azure: {
      appgw: {
        isManaged: true,
      },
      diskType: 'Standard_LRS',
      resourceGroup: 'somevalue',
      subscriptionId: 'somevalue',
      tenantId: 'somevalue',
      monitor: {
        clientId: 'somesecretvalue',
      },
    },
    customer: {
      name: 'demo',
    },
    dns: {
      zones: ['example.com', 'onprem.example.com'],
      domain: 'onprem.example.com',
      aws: {
        region: 'eu-central-1',
      },
    },
    home: {
      receivers: ['slack'],
      slack: {
        channel: 'mon-otomi',
        channelCrit: 'mon-otomi-crit',
      },
    },
    oidc: {
      adminGroupID: 'someAdminGroupID',
      clientID: 'someClientID',
      issuer: 'https://login.microsoftonline.com/xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      scope: 'openid email profile',
      teamAdminGroupID: 'xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      tenantID: 'xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    otomi: {
      hasCloudLB: false,
      isHomeMonitored: true,
      isManaged: true,
      isMultitenant: true,
      mode: 'ce',
      teamPrefix: 'team-',
      addons: {
        conftest: {
          enabled: true,
        },
      },
      additionalClusters: [
        {
          name: 'dev',
          domainSuffix: 'dev.eks.otomi.cloud',
          provider: 'aws',
        },
        {
          name: 'demo',
          domainSuffix: 'demo.eks.otomi.cloud',
          provider: 'aws',
        },
      ],
    },
    smtp: {
      from: 'no-reply@doma.in',
      hello: 'doma.in',
    },
  },
}
