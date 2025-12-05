import { AplKind } from '../otomi-models'

export interface FileMap {
  envDir: string
  kind: AplKind
  pathGlob: string
  pathTemplate: string // e.g., 'env/teams/{teamId}/workloads/{name}.yaml'
  name: string
}

export function getFileMaps(envDir: string): Map<AplKind, FileMap> {
  const maps = new Map<AplKind, FileMap>()

  maps.set('AplApp', {
    kind: 'AplApp',
    envDir,
    pathGlob: `${envDir}/env/apps/*.{yaml,yaml.dec}`,
    pathTemplate: 'env/apps/{name}.yaml',
    name: 'apps',
  })

  maps.set('AplAlertSet', {
    kind: 'AplAlertSet',
    envDir,
    pathGlob: `${envDir}/env/settings/*alerts.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/alerts.yaml',
    name: 'alerts',
  })

  maps.set('AplCluster', {
    kind: 'AplCluster',
    envDir,
    pathGlob: `${envDir}/env/settings/cluster.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/cluster.yaml',
    name: 'cluster',
  })

  maps.set('AplDatabase', {
    kind: 'AplDatabase',
    envDir,
    pathGlob: `${envDir}/env/databases/*.{yaml,yaml.dec}`,
    pathTemplate: 'env/databases/{name}.yaml',
    name: 'databases',
  })

  maps.set('AplDns', {
    kind: 'AplDns',
    envDir,
    pathGlob: `${envDir}/env/settings/*dns.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/dns.yaml',
    name: 'dns',
  })

  maps.set('AplIngress', {
    kind: 'AplIngress',
    envDir,
    pathGlob: `${envDir}/env/settings/ingress.yaml`,
    pathTemplate: 'env/settings/ingress.yaml',
    name: 'ingress',
  })

  maps.set('AplKms', {
    kind: 'AplKms',
    envDir,
    pathGlob: `${envDir}/env/settings/*kms.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/kms.yaml',
    name: 'kms',
  })

  maps.set('AplObjectStorage', {
    kind: 'AplObjectStorage',
    envDir,
    pathGlob: `${envDir}/env/settings/*obj.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/obj.yaml',
    name: 'obj',
  })

  maps.set('AplIdentityProvider', {
    kind: 'AplIdentityProvider',
    envDir,
    pathGlob: `${envDir}/env/settings/*oidc.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/oidc.yaml',
    name: 'oidc',
  })

  maps.set('AplCapabilitySet', {
    kind: 'AplCapabilitySet',
    envDir,
    pathGlob: `${envDir}/env/settings/*otomi.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/otomi.yaml',
    name: 'otomi',
  })

  maps.set('AplBackupCollection', {
    kind: 'AplBackupCollection',
    envDir,
    pathGlob: `${envDir}/env/settings/*platformBackups.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/platformBackups.yaml',
    name: 'platformBackups',
  })

  maps.set('AplSmtp', {
    kind: 'AplSmtp',
    envDir,
    pathGlob: `${envDir}/env/settings/*smtp.{yaml,yaml.dec}`,
    pathTemplate: 'env/settings/smtp.yaml',
    name: 'smtp',
  })

  maps.set('AplUser', {
    kind: 'AplUser',
    envDir,
    pathGlob: `${envDir}/env/users/*.{yaml,yaml.dec}`,
    pathTemplate: 'env/users/{name}.yaml',
    name: 'users',
  })

  maps.set('AplVersion', {
    kind: 'AplVersion',
    envDir,
    pathGlob: `${envDir}/env/settings/versions.yaml`,
    pathTemplate: 'env/settings/versions.yaml',
    name: 'versions',
  })

  maps.set('AplTeamCodeRepo', {
    kind: 'AplTeamCodeRepo',
    envDir,
    pathGlob: `${envDir}/env/teams/*/codeRepos/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/codeRepos/{name}.yaml',
    name: 'codeRepos',
  })

  maps.set('AplTeamBuild', {
    kind: 'AplTeamBuild',
    envDir,
    pathGlob: `${envDir}/env/teams/*/builds/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/builds/{name}.yaml',
    name: 'builds',
  })

  maps.set('AplTeamWorkload', {
    kind: 'AplTeamWorkload',
    envDir,
    pathGlob: `${envDir}/env/teams/*/workloads/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/workloads/{name}.yaml',
    name: 'workloads',
  })

  maps.set('AplTeamWorkloadValues', {
    kind: 'AplTeamWorkloadValues',
    envDir,
    pathGlob: `${envDir}/env/teams/*/workloadValues/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/workloadValues/{name}.yaml',
    name: 'workloadValues',
  })

  maps.set('AplTeamService', {
    kind: 'AplTeamService',
    envDir,
    pathGlob: `${envDir}/env/teams/*/services/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/services/{name}.yaml',
    name: 'services',
  })

  maps.set('AplTeamSecret', {
    kind: 'AplTeamSecret',
    envDir,
    pathGlob: `${envDir}/env/teams/*/sealedsecrets/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/sealedsecrets/{name}.yaml',
    name: 'sealedsecrets',
  })

  maps.set('AkamaiKnowledgeBase', {
    kind: 'AkamaiKnowledgeBase',
    envDir,
    pathGlob: `${envDir}/env/teams/*/knowledgebases/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/knowledgebases/{name}.yaml',
    name: 'knowledgebases',
  })

  maps.set('AkamaiAgent', {
    kind: 'AkamaiAgent',
    envDir,
    pathGlob: `${envDir}/env/teams/*/agents/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/agents/{name}.yaml',
    name: 'agents',
  })

  maps.set('AplTeamNetworkControl', {
    kind: 'AplTeamNetworkControl',
    envDir,
    pathGlob: `${envDir}/env/teams/*/netpols/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/netpols/{name}.yaml',
    name: 'netpols',
  })

  maps.set('AplTeamSettingSet', {
    kind: 'AplTeamSettingSet',
    envDir,
    pathGlob: `${envDir}/env/teams/*/*settings{.yaml,.yaml.dec}`,
    pathTemplate: 'env/teams/{teamId}/settings.yaml',
    name: 'settings',
  })

  maps.set('AplTeamTool', {
    kind: 'AplTeamTool',
    envDir,
    pathGlob: `${envDir}/env/teams/*/*apps{.yaml,.yaml.dec}`,
    pathTemplate: 'env/teams/{teamId}/apps.yaml',
    name: 'apps',
  })

  maps.set('AplTeamPolicy', {
    kind: 'AplTeamPolicy',
    envDir,
    pathGlob: `${envDir}/env/teams/*/policies/*.yaml`,
    pathTemplate: 'env/teams/{teamId}/policies/{name}.yaml',
    name: 'policies',
  })

  return maps
}
export function getFileMapForKind(kind: AplKind): FileMap {
  return getFileMaps('').get(kind)!
}

export function getResourceFilePath(kind: AplKind, name: string, teamId?: string): string {
  const fileMap = getFileMapForKind(kind)
  if (!fileMap) {
    throw new Error(`Unknown kind: ${kind}`)
  }

  return fileMap.pathTemplate.replace('{teamId}', teamId || '').replace('{name}', name)
}

// Derive secret file path from main file path
// e.g., 'env/teams/demo/settings.yaml' -> 'env/teams/demo/secrets.settings.yaml'
// e.g., 'env/apps/harbor.yaml' -> 'env/apps/secrets.harbor.yaml'
export function getSecretFilePath(mainFilePath: string): string {
  const parts = mainFilePath.split('/')
  const filename = parts[parts.length - 1]
  const dir = parts.slice(0, -1).join('/')

  return `${dir}/secrets.${filename}`
}

// Get all FileMap entries that are settings (env/settings/*)
export function getSettingsFileMaps(envDir: string): Map<string, FileMap> {
  const allMaps = getFileMaps(envDir)
  const settingsMaps = new Map<string, FileMap>()

  for (const [, fileMap] of allMaps.entries()) {
    if (fileMap.pathTemplate.startsWith('env/settings/')) {
      settingsMaps.set(fileMap.name, fileMap)
    }
  }

  return settingsMaps
}
