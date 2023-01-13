export default {
  alerts: {
    drone: ['slack'],
    email: {
      critical: 'admins@yourdoma.in',
      nonCritical: 'admins@yourdoma.in',
    },
    groupInterval: '5m',
    receivers: ['slack', 'email'],
    repeatInterval: '3h',
    slack: {
      url: 'https://hooks.slack.com/services/id',
    },
  },
  apps: {
    alertmanager: {},
    argocd: {},
    'cert-manager': {
      customRootCA:
        '-----BEGIN CERTIFICATE-----\nMIIDdDCCAlygAwIBAgIBATANBgkqhkiG9w0BAQUFADBuMRUwEwYDVQQDEwxyZWRr\ndWJlcy5jb20xCzAJBgNVBAYTAk5MMRAwDgYDVQQIEwdVdHJlY2h0MRAwDgYDVQQH\nEwdVdHJlY2h0MQ4wDAYDVQQKEwVPdG9taTEUMBIGA1UECxMLU2VsZi1TaWduZWQw\nHhcNMjExMTAzMTAxOTAyWhcNMzExMTAzMTAxOTAyWjBuMRUwEwYDVQQDEwxyZWRr\ndWJlcy5jb20xCzAJBgNVBAYTAk5MMRAwDgYDVQQIEwdVdHJlY2h0MRAwDgYDVQQH\nEwdVdHJlY2h0MQ4wDAYDVQQKEwVPdG9taTEUMBIGA1UECxMLU2VsZi1TaWduZWQw\nggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQD4quPwHrharZhmqVQx/75N\nM7Vp3ZmSd3gR2u8Dc1PkmEa6W9CiheVAB5KCzdN5sWaOlFKTy5sHg/zvyYZjvNGX\nxaHCa4i6OyRgiTOC4NCrxuN5010G0vAxYaM1aIFcqObXuLcaK6miOybDLRfDxoHl\ng/TKqdiPOMEb2ZgphFxL7oYXjkobOggH+wzwwMIc/1nA3eBjEPsIkQehmb0R0Kxw\nK5VHPCvbPQb3USVqUs+NmsuCxmqkTtI32WqR0IuNAVqjaD9oNqcsKBgUOPYLYXM8\nxsTzIn0QPysJIKUCRn1quHwvCQc1RnQBB8UG6iJboVdRe0GNS13vu5ikhoCb0oyV\nAgMBAAGjHTAbMAwGA1UdEwQFMAMBAf8wCwYDVR0PBAQDAgL0MA0GCSqGSIb3DQEB\nBQUAA4IBAQBJWHPGnTqXME/MGwG2nAG/JqiCQ0ZOOyKgwN97wrQIlbra2BaUT1K4\ntMDOjZlft1Luipg/IkzzMXt4eAmqGMxLIweqbve6aLm8KTpHkLdxLm3VPnhK8zzg\nysRRRjtkMo9KUOSvrS2dFsY+fQnbGUzpRcK8RrzM6CpgIaf29neP1xLUWQuUsy5y\nyKCb6OQ9vaJBf/uvz73rQq0ym4Kx0FCFssshaja6lbz/jqCJmppdZE5pe5jvMVVv\nae5UQLbva0JyLY8Rc1vSY/epIHMLrV90GEagSkF/ejgF3uh8cliLuUYFAFyU8TnN\nFWG+enMJfR04aWjp8M3MQ1IoCPVxoXxI\n-----END CERTIFICATE-----\n',
      customRootCAKey:
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEA+Krj8B64Wq2YZqlUMf++TTO1ad2Zknd4EdrvA3NT5JhGulvQ\nooXlQAeSgs3TebFmjpRSk8ubB4P878mGY7zRl8WhwmuIujskYIkzguDQq8bjedNd\nBtLwMWGjNWiBXKjm17i3Giupojsmwy0Xw8aB5YP0yqnYjzjBG9mYKYRcS+6GF45K\nGzoIB/sM8MDCHP9ZwN3gYxD7CJEHoZm9EdCscCuVRzwr2z0G91ElalLPjZrLgsZq\npE7SN9lqkdCLjQFao2g/aDanLCgYFDj2C2FzPMbE8yJ9ED8rCSClAkZ9arh8LwkH\nNUZ0AQfFBuoiW6FXUXtBjUtd77uYpIaAm9KMlQIDAQABAoIBAQCTsIuotdYwpSH6\n9172Qzq3h5qbwe3QO/yoPivvFLQi9P4s+RM1M+kw2k5+Odj8UgzjadyRwz/UeuPj\nVwHmguLJDaxBWLTgRvgYDeT2Oqg1He9FD/AUeXwHGEJjGiqa6gYQ4bh+Zqhdnlwr\nV8DhmijUNEdThwUEK2UmMVpabi6TOW/dfO6sbnOHYwx326qF3LhYcUrmdeowEGLT\nUhxdXJQQUsfD+zft6dcPnqucIxd5OEsn3L8/pcumOxHUGFBHDMuB5nTpcZyDxKaN\njoC0zQy0BDQIMN1F7wNRukSiSYqvRvmvztF2Ka0yEWAdvBBXVVN8nKQw69oGoe9B\nEQ5HSkKBAoGBAP0KnCE19jW9jq1CWFkFwd1BALWA3GOuxJqSX6M5APM+JRBR4UOZ\nAUOogvGlrc1ns58q7oNoc1CHiMHd2lNFgfqWqopfVz1Tt9qHqU6VoJnkmJlJRriE\n57F08RTjslTFzYEsE9zMlL1xa5pq1aGAFB0/mYuxopRw39mS14ugxF1pAoGBAPuT\nMFLfp2wttGe2WhVepOnhD13sEMGCS6GE16jinjP3qAWIPM/Wdy+Ab8n+KWQkYPLw\nUsQVi+41LWFIexjzdrq9rG5LQbZdjDCyR4eomDGZhc0Vtsu79NbVrnSmjH8w6psa\nDXB1uN9/VcCzae/hRpk2Q6zFiMcPE8utUU5RvFRNAoGBAJ19+wsYoPN11dW0k3Rl\nBvKEwMI3P/SzFB74t5nJovPCXCM6MzB1jLnlqgppCjHsN3n7qJQVcKBQmye+w2JM\nwseK+v5AtPWwo5/aC+CjdGAUTX4qg1/ZKLPkiyBrT9U/f9bD7mDg3DrE2yozEGAC\nbYJ+0TyHBR/K2Sh8Irf/CfjxAoGBAM4wuwCRkpUVeLEwQfEV2zBdZ8zg+HLBqd8+\nE8u1wVhyeOHf4YevDYx/RiBWEfKj5ln3Ir7XshKQvxrm3w16Liur3bGgOMGRNp+K\n3xmO0v6EB6gpTeL5sBiMlinBf5GXtBFfbvhnZBi6Mrx30DHtf4F/ekQWup37+4uK\nCAOa9jJZAoGAYbU4CoCxktBECxAVAjtpvYW5176cxiitd75s1ANhXGiOH1A6/y6H\nrnZ+fMAuvPjrDXbtmqJsq0RXq1E07ng4ZDIjN+0pShVFQdakJRFo1y+d3b82lBYX\nEZrfMBCWVj31dXeGEHfVvOpwrQ5ffTzs2lVmTh7Ft61gs4TJ7gNTDbE=\n-----END RSA PRIVATE KEY-----\n',
      email: 'test@test.local',
      issuer: 'letsencrypt',
    },
    drone: {
      sharedSecret: 'somesecretvalue',
      sourceControl: {
        github: {
          clientSecretValue: 'somesecretvalue',
        },
      },
    },
    'external-dns': {},
    gatekeeper: {},
    gitea: {
      postgresqlPassword: 'postgresqlPassword',
    },
    grafana: {
      adminPassword: 'somesecretvalue',
    },
    harbor: {
      adminPassword: 'somesecretvalue',
      persistence: {
        imageChartStorage: {
          gcs: {
            encodedkey: 'somesecretvalue',
          },
        },
      },
      secretKey: 'somesecretvalue',
    },
    httpbin: {},
    istio: {},
    jaeger: {},
    keycloak: {
      idp: {
        clientSecret: 'somsecretvalue',
      },
      postgresqlPassword: 'postgresqlPassword',
    },
    kiali: {},
    knative: {},
    kubeapps: {
      postgresqlPassword: 'postgresqlPassword',
    },
    kubeclarity: {
      databasePassword: '123jefkejoql',
    },
    loki: {
      adminPassword: 'somesecretvalue',
      storage: {
        azure: {
          account_key: 'account_key',
        },
      },
    },
    minio: {},
    prometheus: {},
    vault: {},
    velero: {
      provider: {
        azure: {
          secretContents: {
            aadClientSecret: 'somesecret',
          },
        },
      },
    },
    'ingress-nginx': {},
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
  backup: {
    platformSchedule: {
      enabled: true,
    },
  },
  cluster: {
    apiName: 'custom',
    apiServer: 'https://apiServer.onprem.example.com',
    domainSuffix: 'dev.onprem.example.com',
    k8sVersion: '1.23',
    name: 'dev',
    owner: 'demo',
    provider: 'aws',
    region: 'eu-central-1',
  },
  dns: {
    provider: {
      aws: {
        region: 'eu-central-1',
      },
    },
    zones: ['some.com', 'onprem.example.com', 'onprem.private.net'],
  },
  google: {
    cloudDnsKey:
      '{\n  "type": "service_account",\n  "project_id": "project_id-cloud",\n  "private_key_id": "private_key_id",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n private_key ----END PRIVATE KEY-----\\n",\n  "client_email": "client_email",\n  "client_id": "client_id",\n  "auth_uri": "https://accounts.google.com/o/oauth2/auth",\n  "token_uri": "https://oauth2.googleapis.com/token",\n  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",\n  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/dnsmanager%40otomi-cloud.iam.gserviceaccount.com"\n}\n',
  },
  home: {
    email: {
      critical: 'admins@yourdoma.in',
    },
    receivers: ['slack'],
    slack: {
      channel: 'mon-otomi',
      channelCrit: 'mon-otomi-crit',
      url: 'https://hooks.slack.com/services/id',
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
    additionalClusters: [
      {
        domainSuffix: 'demo.eks.otomi.cloud',
        name: 'demo',
        provider: 'aws',
      },
    ],
    adminPassword: 'okidoki',
    globalPullSecret: {
      password: 'bla12345',
      username: 'otomi',
    },
    hasCloudLB: false,
    isHomeMonitored: true,
    isMultitenant: true,
    version: 'latest',
    nodeSelector: [],
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
    auth_identity: 'no-reply@doma.in',
    auth_password: 'somesecretvalue',
    from: 'no-reply@doma.in',
    hello: 'doma.in',
    smarthost: 'smtp-relay.gmail.com:587',
  },
  teamConfig: {
    admin: {
      id: 'admin',
      jobs: [],
      password: 'NLFDctLXwd0yqq6p',
      resourceQuota: {},
      apps: {
        alertmanager: {
          shortcuts: [],
        },
        argocd: {
          shortcuts: [],
        },
        'cert-manager': {
          shortcuts: [],
        },
        drone: {
          shortcuts: [],
        },
        'external-dns': {
          shortcuts: [],
        },
        gatekeeper: {
          shortcuts: [],
        },
        gitea: {
          shortcuts: [],
        },
        grafana: {
          shortcuts: [],
        },
        harbor: {
          shortcuts: [],
        },
        httpbin: {
          shortcuts: [],
        },
        istio: {
          shortcuts: [],
        },
        jaeger: {
          shortcuts: [],
        },
        keycloak: {
          shortcuts: [],
        },
        kiali: {
          shortcuts: [],
        },
        knative: {
          shortcuts: [],
        },
        kubeapps: {
          shortcuts: [],
        },
        kubeclarity: {
          shortcuts: [],
        },
        loki: {
          shortcuts: [],
        },
        minio: {
          shortcuts: [],
        },
        prometheus: {
          shortcuts: [],
        },
        vault: {
          shortcuts: [],
        },
        velero: {
          shortcuts: [],
        },
        'ingress-nginx': {
          shortcuts: [],
        },
      },
      services: [],
      secrets: [],
    },
    dev: {
      alerts: {
        groupInterval: '5m',
        repeatInterval: '3h',
      },
      id: 'dev',
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
        },
      ],
      networkPolicy: {
        egressPublic: true,
        ingressPrivate: true,
      },
      password: 'NLFDctLXwd0yqq6Q',
      selfService: {
        Service: ['ingress'],
        Team: ['resourceQuota'],
      },
      resourceQuota: {},
      apps: {},
      services: [
        {
          id: 'd611a6be-3898-406d-9b5a-44ee2ba14dfb',
          name: 'tlspass',
          port: 80,
          ksvc: {
            args: ['-c', "echo 'bla'"],
            command: ['bash'],
            containerPort: 80,
            files: {
              '/foo': 'bar',
            },
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
            secrets: [],
            annotations: {},
            env: {},
            secretMounts: {},
          },
          ownHost: true,
          paths: [],
          tlsPass: true,
          headers: [],
          type: 'public',
        },
      ],
      secrets: [],
    },
    otomi: {
      alerts: {
        groupInterval: '5m',
        repeatInterval: '3h',
      },
      id: 'otomi',
      jobs: [],
      networkPolicy: {
        egressPublic: true,
        ingressPrivate: true,
      },
      oidc: {
        groupMapping: '0efd2f6d-fb8b-49a9-9507-54cd6e92c348',
      },
      password: 'NLFDctLXwd0yqq6W',
      resourceQuota: {
        'services.loadbalancers': '0',
      },
      selfService: {
        Service: ['ingress', 'networkPolicy'],
        Team: ['resourceQuota'],
      },
      apps: {},
      services: [
        {
          id: 'fb88a85d-49e6-4c20-98ed-11b3ceff540e',
          name: 'servant1',
          ksvc: {
            env: {
              INFORMANT: 'http://informant.team-otomi.svc.cluster.local',
              TARGET: 'master, I am servant 1',
            },
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
            secrets: [],
            annotations: {},
            files: {},
            secretMounts: {},
            command: undefined,
            args: undefined,
          },
          domain: 'master.onprem.example.com',
          paths: ['/servant-1'],
          headers: [],
          type: 'public',
        },
        {
          id: 'f818a64d-25a4-46e0-9eaf-769b78866031',
          name: 'hello',
          ownHost: true,
          hasCert: true,
          certArn: 'arn:aws:acm:eu-central-1:012345678912:certificate/123',
          paths: [],
          headers: [],
          type: 'public',
        },
        {
          id: 'f818a64d-25a4-46e0-9eaf-769b78866032',
          name: 'hello-private',
          type: 'cluster',
        },
        {
          id: 'f818a64d-25a4-46e0-9eaf-769b78866033',
          name: 'hello-somecom',
          domain: 'hello.some.com',
          hasCert: true,
          certName: 'bla',
          paths: [],
          headers: [],
          type: 'public',
        },
        {
          id: 'f818a64d-25a4-46e0-9eaf-769b7886603d',
          name: 'servant2',
          ksvc: {
            env: {
              TARGET: 'master, I am servant 2',
            },
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
            secrets: [],
            annotations: {},
            files: {},
            secretMounts: {},
            command: undefined,
            args: undefined,
          },
          domain: 'master.onprem.example.com',
          paths: ['/servant-2'],
          ingressClassName: 'net-a',
          headers: [],
          type: 'public',
        },
        {
          id: '2f18da9a-e659-479d-9d65-2ca82503f43c',
          name: 'informant',
          ksvc: {
            env: {
              TARGET: 'head servant, I have a version number',
            },
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
            annotations: {},
            files: {},
            secretMounts: {},
            command: undefined,
            args: undefined,
          },
          type: 'cluster',
        },
      ],
      secrets: [
        {
          id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9a',
          name: 'mysecret-generic',
          teamId: 'otomi',
          type: 'generic',
          entries: ['dd', 'ee', 'ff'],
        },
        {
          id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9b',
          name: 'mysecret-registry',
          teamId: 'otomi',
          type: 'docker-registry',
        },
        {
          id: 'f7f9def1-cc52-465b-9da2-87e9fec4cf9c',
          name: 'mysecret-tls',
          teamId: 'otomi',
          type: 'tls',
          ca: 'ca.crt',
          crt: 'tls.crt',
          key: 'tls.key',
        },
      ],
    },
  },
  version: 5,
}
