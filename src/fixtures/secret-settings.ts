export default {
  alerts: {
    slack: {
      url: 'https://hooks.slack.com/services/id',
    },
    email: {
      nonCritical: 'admins@yourdoma.in',
      critical: 'admins@yourdoma.in',
    },
  },
  azure: {
    monitor: {
      clientSecret: 'somesecretvalue',
    },
  },
  google: {
    cloudDnsKey:
      '{\n  "type": "service_account",\n  "project_id": "project_id-cloud",\n  "private_key_id": "private_key_id",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n private_key ----END PRIVATE KEY-----\\n",\n  "client_email": "client_email",\n  "client_id": "client_id",\n  "auth_uri": "https://accounts.google.com/o/oauth2/auth",\n  "token_uri": "https://oauth2.googleapis.com/token",\n  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",\n  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/dnsmanager%40otomi-cloud.iam.gserviceaccount.com"\n}\n',
  },
  home: {
    slack: {
      url: 'https://hooks.slack.com/services/id',
    },
    email: {
      critical: 'admins@yourdoma.in',
    },
  },
  oidc: {
    clientSecret: 'somesecretvalue',
  },
  otomi: {
    pullSecret: 'c29tZXNlY3JldHZhbHVlCg==',
  },
  smtp: {
    authUsername: 'no-reply@doma.in',
    smarthost: 'smtp-relay.gmail.com:587',
    authPassword: 'somesecretvalue',
  },
}
