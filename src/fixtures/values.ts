export default {
  apps: [
    {
      id: 'gatekeeper',
      teamId: 'admin',
      enabled: false,
      values: {},
      rawValues: {},
    },
    {
      id: 'keycloak',
      teamId: 'admin',
      enabled: true,
      values: {
        bla: 'dida',
      },
      rawValues: {},
      shortcuts: [
        {
          title: 'o',
          description: 'ki',
          path: '/doki',
        },
      ],
    },
    {
      id: 'loki',
      teamId: 'admin',
      enabled: true,
      values: {
        oki: 'doki',
      },
      rawValues: {
        somesing: 'raw',
      },
    },
    {
      id: 'loki',
      teamId: 'otomi',
      enabled: true,
      shortcuts: [
        {
          title: 'bla',
          description: 'di',
          path: '/bla',
        },
      ],
    },
    {
      enabled: true,
      id: 'loki',
      teamId: 'dev',
    },
  ],
  jobs: [
    {
      type: 'Job',
      name: 'aba',
      enabled: true,
      env: {
        TARGET: 'job world',
      },
      runPolicy: 'OnSpecChange',
      schedule: '0 1 * * *',
      script: 'echo Hello $TARGET',
      ttlSecondsAfterFinished: 86400,
      init: [
        {
          image: {
            repository: 'otomi/nodejs-helloworld',
            tag: 'latest',
            pullPolicy: 'IfNotPresent',
          },
          securityContext: {
            runAsUser: 1001,
            runAsGroup: 1001,
            runAsNonRoot: true,
          },
          resources: {
            limits: {
              cpu: '50m',
              memory: '64Mi',
            },
            requests: {
              cpu: '50m',
              memory: '64Mi',
            },
          },
        },
      ],
      podSecurityContext: {
        runAsUser: 1001,
        runAsGroup: 1001,
        runAsNonRoot: true,
      },
      image: {
        repository: 'otomi/helloworld-nodejs',
        tag: 'latest',
        pullPolicy: 'IfNotPresent',
      },
      securityContext: {
        runAsUser: 1001,
        runAsGroup: 1001,
        runAsNonRoot: true,
      },
      resources: {
        limits: {
          cpu: '50m',
          memory: '64Mi',
        },
        requests: {
          cpu: '50m',
          memory: '64Mi',
        },
      },
      teamId: 'dev',
      id: '1c4774f5-9ee0-49af-9080-ffd494e7a06a',
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
      resourceQuota: [
        {
          name: 'services.loadbalancers',
          value: '0',
        },
      ],
      selfService: {
        Team: ['resourceQuota'],
      },
    },
    {
      alerts: {},
      id: 'dev',
      name: 'dev',
      oidc: {},
      password: 'linux1234',
      resourceQuota: [],
      selfService: {
        Service: ['ingress'],
        Team: ['resourceQuota'],
      },
    },
  ],

  services: [
    {
      name: 'servant1',
      id: 'fb88a85d-49e6-4c20-98ed-11b3ceff540e',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'ksvc',
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
        secretMounts: [],
        files: [],
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
      },
      ingress: {
        certArn: undefined,
        certName: undefined,
        domain: 'onprem.example.com',
        forwardPath: false,
        hasCert: false,
        auth: false,
        paths: ['/servant-1'],
        subdomain: 'master',
        useDefaultSubdomain: false,
        tlsPass: false,
        type: 'public',
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
        certArn: 'some-arn',
        certName: undefined,
        domain: 'dev.onprem.example.com',
        forwardPath: false,
        hasCert: true,
        auth: false,
        paths: [],
        subdomain: 'hello.team-otomi',
        type: 'public',
        tlsPass: false,
        useDefaultSubdomain: true,
      },
    },
    {
      name: 'hello-private',
      id: 'f818a64d-25a4-46e0-9eaf-769b78866032',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'svcPredeployed',
      },
      ingress: {
        certArn: undefined,
        certName: undefined,
        domain: 'onprem.private.net',
        forwardPath: false,
        hasCert: false,
        auth: false,
        paths: [],
        subdomain: 'hello-private.team-otomi.dev',
        useDefaultSubdomain: false,
        tlsPass: false,
        type: 'private',
      },
    },
    {
      name: 'hello-somecom',
      id: 'f818a64d-25a4-46e0-9eaf-769b78866033',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'svcPredeployed',
      },
      ingress: {
        certArn: undefined,
        certName: 'bla',
        domain: 'some.com',
        forwardPath: false,
        hasCert: true,
        auth: false,
        paths: [],
        subdomain: 'hello',
        useDefaultSubdomain: false,
        tlsPass: false,
        type: 'public',
      },
    },
    {
      name: 'servant2',
      id: 'f818a64d-25a4-46e0-9eaf-769b7886603d',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'ksvc',
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
        secretMounts: [],
        files: [],
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
      },
      ingress: {
        certArn: undefined,
        certName: undefined,
        domain: 'onprem.example.com',
        forwardPath: false,
        hasCert: false,
        auth: true,
        paths: ['/servant-2'],
        subdomain: 'master',
        useDefaultSubdomain: false,
        tlsPass: false,
        type: 'public',
      },
    },
    {
      name: 'informant',
      id: '2f18da9a-e659-479d-9d65-2ca82503f43c',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'ksvc',
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
        files: [],
        secrets: ['mysecret-generic'],
        secretMounts: [],
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
      },
      ingress: {
        type: 'cluster',
      },
    },
    {
      name: 'tlspass',
      id: 'd611a6be-3898-406d-9b5a-44ee2ba14dfb',
      teamId: 'dev',
      ksvc: {
        containerPort: 80,
        serviceType: 'ksvc',
        scaleToZero: false,
        image: {
          pullPolicy: 'IfNotPresent',
          repository: 'nginx',
          tag: 'latest',
        },
        env: [],
        files: [{ path: '/foo', content: 'bar' }],
        secrets: [],
        secretMounts: [],
        podSecurityContext: {
          runAsUser: 1001,
        },
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
        command: "'bash'",
        args: "'-c' \"echo 'bla'\"",
      },
      ingress: {
        auth: false,
        certArn: undefined,
        certName: undefined,
        domain: 'dev.onprem.example.com',
        forwardPath: false,
        hasCert: false,
        paths: [],
        subdomain: 'tlspass.team-dev',
        tlsPass: true,
        type: 'public',
        useDefaultSubdomain: true,
      },
      port: 80,
    },
  ],

  secrets: [
    {
      teamId: 'otomi',
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9a',
      name: 'mysecret-generic',
      secret: {
        type: 'generic',
        entries: ['dd', 'ee', 'ff'],
      },
    },
    {
      teamId: 'otomi',
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9b',
      name: 'mysecret-registry',
      secret: {
        type: 'docker-registry',
      },
    },
    {
      teamId: 'otomi',
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9c',
      name: 'mysecret-tls',
      secret: {
        type: 'tls',
        key: 'tls.key',
        crt: 'tls.crt',
        ca: 'ca.crt',
      },
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
      monitor: {
        clientId: 'somesecretvalue',
      },
    },
    cluster: {
      apiName: 'onprem',
      apiServer: 'apiServer.onprem.example.com',
      domainSuffix: 'dev.onprem.example.com',
      k8sVersion: '1.19',
      owner: 'demo',
      name: 'dev',
      provider: 'onprem',
      region: 'eu-central-1',
    },
    dns: {
      zones: ['some.com', 'onprem.example.com', 'onprem.private.net'],
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
    kms: {
      sops: {
        provider: 'google',
        google: {
          keys: 'some/key',
          accountJson: '{"some":"json"}',
          project: 'some-project',
        },
      },
    },
    oidc: {
      adminGroupID: 'someAdminGroupID',
      clientID: 'someClientID',
      clientSecret: 'someClientSecret',
      issuer: 'https://login.microsoftonline.com/xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      teamAdminGroupID: 'xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    otomi: {
      version: 'latest',
      hasCloudLB: false,
      isHomeMonitored: true,
      isManaged: true,
      isMultitenant: true,
      addons: {
        conftest: {
          enabled: true,
        },
      },
      additionalClusters: [
        {
          name: 'demo',
          domainSuffix: 'demo.eks.otomi.cloud',
          provider: 'aws',
        },
      ],
    },
    policies: {
      'banned-image-tags': {
        enabled: true,
        tags: ['latest'],
      },
      'container-limits': {
        cpu: '2',
        enabled: false,
        memory: '2000Mi',
      },
      'psp-allowed-repos': {
        enabled: false,
        repos: ['harbor.demo.gke.otomi.cloud', 'harbor.demo.aks.otomi.cloud', 'harbor.demo.eks.otomi.cloud'],
      },
      'psp-allowed-users': {
        enabled: true,
        fsGroup: {
          ranges: [
            {
              max: 65535,
              min: 1,
            },
          ],
          rule: 'MayRunAs',
        },
        runAsGroup: {
          ranges: [
            {
              max: 65535,
              min: 1,
            },
          ],
          rule: 'MayRunAs',
        },
        runAsUser: {
          rule: 'MustRunAsNonRoot',
        },
        supplementalGroups: {
          ranges: [
            {
              max: 65535,
              min: 1,
            },
          ],
          rule: 'MayRunAs',
        },
      },
      'psp-apparmor': {
        allowedProfiles: ['runtime/default'],
        enabled: false,
      },
      'psp-capabilities': {
        allowedCapabilities: ['NET_BIND_SERVICE', 'NET_RAW'],
        enabled: false,
        requiredDropCapabilities: ['ALL'],
      },
      'psp-forbidden-sysctls': {
        enabled: true,
        forbiddenSysctls: ['*'],
      },
      'psp-host-filesystem': {
        allowedHostPaths: [
          {
            pathPrefix: '/tmp/',
            readOnly: false,
          },
        ],
        enabled: true,
      },
      'psp-host-networking-ports': {
        enabled: true,
      },
      'psp-host-security': {
        enabled: true,
      },
      'psp-privileged': {
        enabled: true,
      },
      'psp-seccomp': {
        allowedProfiles: ['runtime/default'],
        enabled: false,
      },
      'psp-selinux': {
        enabled: true,
        seLinuxContext: 'RunAsAny',
      },
    },
    smtp: {
      from: 'no-reply@doma.in',
      hello: 'doma.in',
    },
  },
}
