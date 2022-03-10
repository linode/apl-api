export default {
  apps: [
    {
      enabled: false,
      values: {},
      rawValues: {},
      teamId: 'admin',
      id: 'gatekeeper',
    },
    {
      enabled: true,
      values: {
        admin: 'bla',
        adminPassword: 'dida',
      },
      rawValues: {},
      teamId: 'admin',
      id: 'keycloak',
      shortcuts: [
        {
          description: 'ki',
          path: '/doki',
          title: 'o',
        },
      ],
    },
    {
      enabled: true,
      values: {
        oki: 'doki',
      },
      rawValues: {
        somesing: 'raw',
      },
      teamId: 'admin',
      id: 'loki',
    },
    {
      enabled: true,
      teamId: 'dev',
      id: 'loki',
    },
    {
      enabled: true,
      teamId: 'otomi',
      id: 'loki',
      shortcuts: [
        {
          description: 'di',
          path: '/bla',
          title: 'bla',
        },
      ],
    },
  ],
  jobs: [
    {
      enabled: true,
      env: {
        TARGET: 'job world',
      },
      id: '1c4774f5-9ee0-49af-9080-ffd494e7a06a',
      image: {
        pullPolicy: 'IfNotPresent',
        repository: 'otomi/helloworld-nodejs',
        tag: 'latest',
      },
      init: [
        {
          image: {
            pullPolicy: 'IfNotPresent',
            repository: 'otomi/nodejs-helloworld',
            tag: 'latest',
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
          securityContext: {
            runAsGroup: 1001,
            runAsNonRoot: true,
            runAsUser: 1001,
          },
        },
      ],
      name: 'aba',
      podSecurityContext: {
        runAsGroup: 1001,
        runAsNonRoot: true,
        runAsUser: 1001,
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
      runPolicy: 'OnSpecChange',
      schedule: '0 1 * * *',
      script: 'echo Hello $TARGET',
      securityContext: {
        runAsGroup: 1001,
        runAsNonRoot: true,
        runAsUser: 1001,
      },
      ttlSecondsAfterFinished: 86400,
      type: 'Job',
      teamId: 'dev',
    },
  ],
  secrets: [
    {
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9a',
      name: 'mysecret-generic',
      teamId: 'otomi',
      secret: {
        type: 'generic',
        entries: ['dd', 'ee', 'ff'],
      },
    },
    {
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9b',
      name: 'mysecret-registry',
      teamId: 'otomi',
      secret: {
        type: 'docker-registry',
      },
    },
    {
      id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9c',
      name: 'mysecret-tls',
      teamId: 'otomi',
      secret: {
        type: 'tls',
        ca: 'ca.crt',
        crt: 'tls.crt',
        key: 'tls.key',
      },
    },
  ],
  services: [
    {
      id: 'd611a6be-3898-406d-9b5a-44ee2ba14dfb',
      name: 'tlspass',
      port: 80,
      teamId: 'dev',
      ksvc: {
        args: "'-c' \"echo 'bla'\"",
        command: "'bash'",
        containerPort: 80,
        files: [
          {
            path: '/foo',
            content: 'bar',
          },
        ],
        image: {
          pullPolicy: 'IfNotPresent',
          repository: 'nginx',
          tag: 'latest',
        },
        podSecurityContext: {
          runAsUser: 1001,
        },
        resources: {
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
        },
        scaleToZero: false,
        serviceType: 'ksvc',
        annotations: [],
        env: [],
        secretMounts: [],
        secrets: [],
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
    },
    {
      id: 'fb88a85d-49e6-4c20-98ed-11b3ceff540e',
      name: 'servant1',
      teamId: 'otomi',
      ksvc: {
        env: [
          {
            name: 'INFORMANT',
            value: 'http://informant.team-otomi.svc.cluster.local',
          },
          {
            name: 'TARGET',
            value: 'master, I am servant 1',
          },
        ],
        image: {
          repository: 'otomi/helloworld-nodejs',
          tag: '1.2.8',
        },
        resources: {
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
        },
        scaleToZero: false,
        serviceType: 'ksvc',
        annotations: [],
        files: [],
        secretMounts: [],
        secrets: [],
      },
      ingress: {
        auth: false,
        certArn: undefined,
        certName: undefined,
        domain: 'onprem.example.com',
        forwardPath: false,
        hasCert: false,
        paths: ['/servant-1'],
        subdomain: 'master',
        tlsPass: false,
        type: 'public',
        useDefaultSubdomain: false,
      },
    },
    {
      id: 'f818a64d-25a4-46e0-9eaf-769b78866031',
      name: 'hello',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'svcPredeployed',
      },
      ingress: {
        auth: false,
        certArn: 'some-arn',
        certName: undefined,
        domain: 'dev.onprem.example.com',
        forwardPath: false,
        hasCert: true,
        paths: [],
        subdomain: 'hello.team-otomi',
        tlsPass: false,
        type: 'public',
        useDefaultSubdomain: true,
      },
    },
    {
      id: 'f818a64d-25a4-46e0-9eaf-769b78866032',
      name: 'hello-private',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'svcPredeployed',
      },
      ingress: {
        auth: false,
        certArn: undefined,
        certName: undefined,
        domain: 'onprem.private.net',
        forwardPath: false,
        hasCert: false,
        paths: [],
        subdomain: 'hello-private.team-otomi.dev',
        tlsPass: false,
        type: 'private',
        useDefaultSubdomain: false,
      },
    },
    {
      id: 'f818a64d-25a4-46e0-9eaf-769b78866033',
      name: 'hello-somecom',
      teamId: 'otomi',
      ksvc: {
        serviceType: 'svcPredeployed',
      },
      ingress: {
        auth: false,
        certArn: undefined,
        certName: 'bla',
        domain: 'some.com',
        forwardPath: false,
        hasCert: true,
        paths: [],
        subdomain: 'hello',
        tlsPass: false,
        type: 'public',
        useDefaultSubdomain: false,
      },
    },
    {
      id: 'f818a64d-25a4-46e0-9eaf-769b7886603d',
      name: 'servant2',
      teamId: 'otomi',
      ksvc: {
        env: [
          {
            name: 'TARGET',
            value: 'master, I am servant 2',
          },
        ],
        image: {
          repository: 'otomi/helloworld-nodejs',
          tag: '1.2.8',
        },
        resources: {
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
        },
        scaleToZero: false,
        serviceType: 'ksvc',
        annotations: [],
        files: [],
        secretMounts: [],
        secrets: [],
      },
      ingress: {
        auth: true,
        certArn: undefined,
        certName: undefined,
        domain: 'onprem.example.com',
        forwardPath: false,
        hasCert: false,
        paths: ['/servant-2'],
        subdomain: 'master',
        tlsPass: false,
        type: 'public',
        useDefaultSubdomain: false,
      },
    },
    {
      id: '2f18da9a-e659-479d-9d65-2ca82503f43c',
      name: 'informant',
      teamId: 'otomi',
      ksvc: {
        env: [
          {
            name: 'TARGET',
            value: 'head servant, I have a version number',
          },
        ],
        image: {
          repository: 'otomi/helloworld-nodejs',
          tag: '1.2.10',
        },
        resources: {
          limits: {
            cpu: '100m',
            memory: '128Mi',
          },
          requests: {
            cpu: '50m',
            memory: '64Mi',
          },
        },
        scaleToZero: false,
        secrets: ['mysecret-generic'],
        serviceType: 'ksvc',
        annotations: [],
        files: [],
        secretMounts: [],
      },
      ingress: {
        type: 'cluster',
      },
    },
  ],
  settings: {
    cluster: {
      apiName: 'onprem',
      apiServer: 'apiServer.onprem.example.com',
      domainSuffix: 'dev.onprem.example.com',
      k8sVersion: '1.19',
      name: 'dev',
      owner: 'demo',
      provider: 'onprem',
      region: 'eu-central-1',
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
    alerts: {
      drone: ['slack', 'opsgenie'],
      groupInterval: '5m',
      receivers: ['slack', 'email'],
      repeatInterval: '3h',
      email: {
        critical: 'admins@yourdoma.in',
        nonCritical: 'admins@yourdoma.in',
      },
      slack: {
        url: 'https://hooks.slack.com/services/id',
      },
    },
    azure: {
      appgw: {
        isManaged: true,
      },
      monitor: {
        clientId: 'somesecretvalue',
        clientSecret: 'somesecretvalue',
      },
    },
    dns: {
      aws: {
        region: 'eu-central-1',
      },
      zones: ['some.com', 'onprem.example.com', 'onprem.private.net'],
    },
    google: {
      cloudDnsKey:
        '{\n  "type": "service_account",\n  "project_id": "project_id-cloud",\n  "private_key_id": "private_key_id",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n private_key ----END PRIVATE KEY-----\\n",\n  "client_email": "client_email",\n  "client_id": "client_id",\n  "auth_uri": "https://accounts.google.com/o/oauth2/auth",\n  "token_uri": "https://oauth2.googleapis.com/token",\n  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",\n  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/dnsmanager%40otomi-cloud.iam.gserviceaccount.com"\n}\n',
    },
    home: {
      receivers: ['slack'],
      slack: {
        channel: 'mon-otomi',
        channelCrit: 'mon-otomi-crit',
        url: 'https://hooks.slack.com/services/id',
      },
      email: {
        critical: 'admins@yourdoma.in',
      },
    },
    kms: {
      sops: {
        google: {
          keys: 'some/key',
          project: 'some-project',
          accountJson: '{"some":"json"}',
        },
        provider: 'google',
      },
    },
    oidc: {
      adminGroupID: 'someAdminGroupID',
      clientID: 'someClientID',
      issuer: 'https://login.microsoftonline.com/xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      teamAdminGroupID: 'xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      clientSecret: 'someClientSecret',
    },
    otomi: {
      additionalClusters: [
        {
          domainSuffix: 'demo.eks.otomi.cloud',
          name: 'demo',
          provider: 'aws',
        },
      ],
      addons: {
        conftest: {
          enabled: true,
        },
      },
      globalPullSecret: {
        username: 'otomi',
        password: 'bla12345',
      },
      hasCloudLB: false,
      isHomeMonitored: true,
      isManaged: true,
      isMultitenant: true,
      version: 'latest',
    },
    smtp: {
      authPassword: 'somesecretvalue',
      authUsername: 'no-reply@doma.in',
      from: 'no-reply@doma.in',
      hello: 'doma.in',
      smarthost: 'smtp-relay.gmail.com:587',
    },
    version: 1,
  },
  teams: [
    {
      id: 'dev',
      selfService: {
        Service: ['ingress'],
        Team: ['resourceQuota'],
      },
      password: 'linux1234',
      resourceQuota: [],
      name: 'dev',
    },
    {
      id: 'otomi',
      oidc: {
        groupMapping: '0efd2f6d-fb8b-49a9-9507-54cd6e92c348',
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
      alerts: {
        email: {
          critical: 'test@doma.in',
        },
      },
      password: 'linux123',
      name: 'otomi',
    },
  ],
}
