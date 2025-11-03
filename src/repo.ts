import { rmSync } from 'fs'
import { rm } from 'fs/promises'
import { globSync } from 'glob'
import jsonpath from 'jsonpath'
import { cloneDeep, get, merge, omit, set } from 'lodash'
import path from 'path'
import { AplKind } from './otomi-models'
import { getDirNames, loadYaml } from './utils'

export async function getTeamNames(envDir: string): Promise<Array<string>> {
  const teamsDir = path.join(envDir, 'env', 'teams')
  return await getDirNames(teamsDir, { skipHidden: true })
}

export interface FileMap {
  envDir: string
  kind: AplKind
  jsonPathExpression: string
  pathGlob: string
  processAs: 'arrayItem' | 'mapItem'
  resourceGroup: 'team' | 'platformSettings' | 'platformApps' | 'platformDatabases' | 'platformBackups' | 'users'
  resourceDir: string
  loadToSpec: boolean
  v2: boolean
}

export function getResourceFileName(fileMap: FileMap, jsonPath: jsonpath.PathComponent[], data: Record<string, any>) {
  let fileName = 'unknown'
  if (fileMap.resourceGroup === 'team') {
    if (fileMap.processAs === 'arrayItem') {
      fileName = (fileMap.v2 ? data.metadata.name || data.metadata.id : data.name || data.id) || fileName
    } else {
      fileName = jsonPath[jsonPath.length - 1].toString()
    }
  } else {
    if (fileMap.processAs === 'arrayItem') {
      fileName = (fileMap.v2 ? data.metadata.name || data.metadata.id : data.name || data.id) || fileName
    } else {
      fileName = jsonPath[jsonPath.length - 1].toString()
    }
  }
  return fileName
}

export function getTeamNameFromJsonPath(jsonPath: jsonpath.PathComponent[]): string {
  return jsonPath[2].toString()
}

export function getResourceName(fileMap: FileMap, jsonPath: jsonpath.PathComponent[], data: Record<string, any>) {
  let resourceName = 'unknown'
  if (fileMap.processAs === 'arrayItem') {
    resourceName = (fileMap.v2 ? data.metadata.name || data.metadata.id : data.name || data.id) || resourceName
    return resourceName
  }

  // Custom workaround for teamPolicy because it is a mapItem
  if (fileMap.resourceGroup === 'team' && fileMap.kind !== 'AplTeamPolicy') {
    resourceName = getTeamNameFromJsonPath(jsonPath)
    return resourceName
  } else {
    resourceName = jsonPath[jsonPath.length - 1].toString()
    return resourceName
  }
}

export function getFilePath(
  fileMap: FileMap,
  jsonPath: jsonpath.PathComponent[],
  data: Record<string, any>,
  fileNamePrefix: string,
) {
  let filePath = ''
  const resourceName = getResourceFileName(fileMap, jsonPath, data)
  if (fileMap.resourceGroup === 'team') {
    const teamName = getTeamNameFromJsonPath(jsonPath)
    filePath = `${fileMap.envDir}/env/teams/${teamName}/${fileMap.resourceDir}/${fileNamePrefix}${resourceName}.yaml`
  } else {
    filePath = `${fileMap.envDir}/env/${fileMap.resourceDir}/${fileNamePrefix}${resourceName}.yaml`
  }
  // normalize paths like /ab/c/./test/yaml
  return path.normalize(filePath)
}

export function extractTeamDirectory(filePath: string): string {
  const match = filePath.match(/\/teams\/([^/]+)/)
  if (match === null) throw new Error(`Cannot extract team name from ${filePath} string`)
  return match[1]
}

export function getJsonPath(fileMap: FileMap, filePath: string): string {
  let { jsonPathExpression: jsonPath } = fileMap

  if (fileMap.resourceGroup === 'team') {
    const teamName = extractTeamDirectory(filePath)
    jsonPath = jsonPath.replace('teamConfig.*', `teamConfig.${teamName}`)
  }

  if (jsonPath.includes('.*')) {
    const fileName = path.basename(filePath, path.extname(filePath))
    const strippedFileName = fileName.replace(/^secrets\.|\.yaml|\.dec$/g, '')
    jsonPath = jsonPath.replace('.*', `.${strippedFileName}`)
  }
  if (jsonPath.includes('[*]')) jsonPath = jsonPath.replace('[*]', '')
  jsonPath = jsonPath.replace('$.', '')
  return jsonPath
}

export function getFileMaps(envDir: string): Array<FileMap> {
  const maps: Array<FileMap> = [
    {
      kind: 'AplApp',
      envDir,
      jsonPathExpression: '$.apps.*',
      pathGlob: `${envDir}/env/apps/*.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformApps',
      resourceDir: 'apps',
      loadToSpec: true,
      v2: false,
    },
    {
      envDir,
      kind: 'AplAlertSet',
      jsonPathExpression: '$.alerts',
      pathGlob: `${envDir}/env/settings/*alerts.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplCluster',
      envDir,
      jsonPathExpression: '$.cluster',
      pathGlob: `${envDir}/env/settings/cluster.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplDatabase',
      envDir,
      jsonPathExpression: '$.databases.*',
      pathGlob: `${envDir}/env/databases/*.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformDatabases',
      resourceDir: 'databases',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplDns',
      envDir,
      jsonPathExpression: '$.dns',
      pathGlob: `${envDir}/env/settings/*dns.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplIngress',
      envDir,
      jsonPathExpression: '$.ingress',
      pathGlob: `${envDir}/env/settings/ingress.yaml`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplKms',
      envDir,
      jsonPathExpression: '$.kms',
      pathGlob: `${envDir}/env/settings/*kms.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplObjectStorage',
      envDir,
      jsonPathExpression: '$.obj',
      pathGlob: `${envDir}/env/settings/*obj.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplIdentityProvider',
      envDir,
      jsonPathExpression: '$.oidc',
      pathGlob: `${envDir}/env/settings/*oidc.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplCapabilitySet',
      envDir,
      jsonPathExpression: '$.otomi',
      pathGlob: `${envDir}/env/settings/*otomi.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplBackupCollection',
      envDir,
      jsonPathExpression: '$.platformBackups',
      pathGlob: `${envDir}/env/settings/*platformBackups.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformBackups',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplSmtp',
      envDir,
      jsonPathExpression: '$.smtp',
      pathGlob: `${envDir}/env/settings/*smtp.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplUser',
      envDir,
      jsonPathExpression: '$.users[*]',
      pathGlob: `${envDir}/env/users/*.{yaml,yaml.dec}`,
      processAs: 'arrayItem',
      resourceGroup: 'users',
      resourceDir: 'users',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplVersion',
      envDir,
      jsonPathExpression: '$.versions',
      pathGlob: `${envDir}/env/settings/versions.yaml`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplTeamCodeRepo',
      envDir,
      jsonPathExpression: '$.teamConfig.*.codeRepos[*]',
      pathGlob: `${envDir}/env/teams/*/codeRepos/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'codeRepos',
      loadToSpec: false,
      v2: true,
    },
    {
      kind: 'AplTeamBuild',
      envDir,
      jsonPathExpression: '$.teamConfig.*.builds[*]',
      pathGlob: `${envDir}/env/teams/*/builds/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'builds',
      loadToSpec: true,
      v2: true,
    },
    {
      kind: 'AplTeamWorkload',
      envDir,
      jsonPathExpression: '$.teamConfig.*.workloads[*]',
      pathGlob: `${envDir}/env/teams/*/workloads/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'workloads',
      loadToSpec: true,
      v2: true,
    },
    {
      kind: 'AplTeamWorkloadValues',
      envDir,
      jsonPathExpression: '$.teamConfig.*.workloadValues[*]',
      pathGlob: `${envDir}/env/teams/*/workloadValues/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'workloadValues',
      loadToSpec: false,
      v2: false,
    },
    {
      kind: 'AplTeamService',
      envDir,
      jsonPathExpression: '$.teamConfig.*.services[*]',
      pathGlob: `${envDir}/env/teams/*/services/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'services',
      loadToSpec: true,
      v2: true,
    },
    {
      kind: 'AplTeamSecret',
      envDir,
      jsonPathExpression: '$.teamConfig.*.sealedsecrets[*]',
      pathGlob: `${envDir}/env/teams/*/sealedsecrets/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'sealedsecrets',
      loadToSpec: false,
      v2: true,
    },
    {
      kind: 'AkamaiKnowledgeBase',
      envDir,
      jsonPathExpression: '$.teamConfig.*.knowledgeBases[*]',
      pathGlob: `${envDir}/env/teams/*/knowledgebases/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'knowledgebases',
      loadToSpec: false,
      v2: true,
    },
    {
      kind: 'AkamaiAgent',
      envDir,
      jsonPathExpression: '$.teamConfig.*.agents[*]',
      pathGlob: `${envDir}/env/teams/*/agents/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'agents',
      loadToSpec: false,
      v2: true,
    },
    {
      kind: 'AplTeamBackup',
      envDir,
      jsonPathExpression: '$.teamConfig.*.backups[*]',
      pathGlob: `${envDir}/env/teams/*/backups/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'backups',
      loadToSpec: true,
      v2: true,
    },
    {
      kind: 'AplTeamNetworkControl',
      envDir,
      jsonPathExpression: '$.teamConfig.*.netpols[*]',
      pathGlob: `${envDir}/env/teams/*/netpols/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'netpols',
      loadToSpec: true,
      v2: true,
    },
    {
      kind: 'AplTeamSettingSet',
      envDir,
      jsonPathExpression: '$.teamConfig.*.settings',
      pathGlob: `${envDir}/env/teams/*/*settings{.yaml,.yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'team',
      resourceDir: '.',
      loadToSpec: true,
      v2: true,
    },
    {
      kind: 'AplTeamTool',
      envDir,
      jsonPathExpression: '$.teamConfig.*.apps',
      pathGlob: `${envDir}/env/teams/*/*apps{.yaml,.yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'team',
      resourceDir: '.',
      loadToSpec: true,
      v2: false,
    },
    {
      kind: 'AplTeamPolicy',
      envDir,
      jsonPathExpression: '$.teamConfig.*.policies[*]',
      pathGlob: `${envDir}/env/teams/*/policies/*.yaml`,
      processAs: 'mapItem',
      resourceGroup: 'team',
      resourceDir: 'policies',
      loadToSpec: true,
      v2: true,
    },
  ]
  return maps
}

export function hasCorrespondingDecryptedFile(filePath: string, fileList: Array<string>): boolean {
  return fileList.includes(`${filePath}.dec`)
}

export function getFileMap(kind: AplKind, envDir: string): FileMap {
  const fileMaps = getFileMaps(envDir)
  const fileMapFiltered = fileMaps.find((fileMap) => fileMap.kind === kind)
  return fileMapFiltered!
}

export function renderManifest(fileMap: FileMap, jsonPath: jsonpath.PathComponent[], data: Record<string, any>) {
  //TODO remove this custom workaround for workloadValues
  if (fileMap.kind === 'AplTeamWorkloadValues') {
    return data.values
  }
  let spec = data
  const labels = {}
  if (fileMap.resourceGroup === 'team') {
    spec = omit(data, ['id', 'name', 'teamId'])
    labels['apl.io/teamId'] = getTeamNameFromJsonPath(jsonPath)
  }
  return {
    kind: fileMap.kind,
    metadata: {
      name: getResourceName(fileMap, jsonPath, data),
      labels,
    },
    spec,
  }
}

export function renderManifestForSecrets(fileMap: FileMap, resourceName: string, data: Record<string, any>) {
  return {
    kind: fileMap.kind,
    metadata: {
      name: resourceName,
    },
    spec: omit(data, ['id', 'teamId', 'name']),
  }
}

export async function unsetValuesFile(envDir: string): Promise<string> {
  const valuesPath = path.join(envDir, 'values-repo.yaml')
  await rm(valuesPath, { force: true })
  return valuesPath
}

export function unsetValuesFileSync(envDir: string): string {
  const valuesPath = path.join(envDir, 'values-repo.yaml')
  rmSync(valuesPath, { force: true })
  return valuesPath
}

function isKindValid(kind: string | undefined, fileMap: FileMap): boolean {
  return (
    kind === fileMap.kind ||
    (kind === 'SealedSecret' && fileMap.kind === 'AplTeamSecret') ||
    fileMap.kind === 'AplTeamWorkloadValues'
  )
}

function isNameValid(data: Record<string, any>, fileMap: FileMap, fileName: string | undefined): boolean {
  //TODO Remove users exception once name has been set in metadata consistently
  return (
    fileMap.resourceGroup === 'users' || fileMap.kind === 'AplTeamWorkloadValues' || data.metadata?.name === fileName
  )
}

function isTeamValid(data: Record<string, any>, fileMap: FileMap, teamName: string | undefined): boolean {
  return ['AplTeamWorkloadValues', 'AplTeamSecret'].includes(fileMap.kind) || data?.metadata?.labels?.['apl.io/teamId']
}

export async function loadFileToSpec(
  filePath: string,
  fileMap: FileMap,
  spec: Record<string, any>,
  deps = { loadYaml },
): Promise<void> {
  const jsonPath = getJsonPath(fileMap, filePath)
  try {
    const data = (await deps.loadYaml(filePath)) || {}
    if (fileMap.processAs === 'arrayItem') {
      const ref: Record<string, any>[] = get(spec, jsonPath)
      const name = filePath.match(/\/([^/]+)\.yaml$/)?.[1]
      if (!isKindValid(data?.kind, fileMap)) {
        console.error(`Unexpected manifest kind in ${filePath}: ${data?.kind}`)
        return
      }
      if (!isNameValid(data, fileMap, name)) {
        console.error(`Unexpected name in ${filePath}: ${data.metadata?.name}`)
        return
      }
      if (fileMap.kind !== 'AplTeamWorkloadValues' && fileMap.resourceGroup === 'team') {
        const teamName = filePath.match(/\/env\/teams\/([^/]+)\//)?.[1]
        if (!isTeamValid(data, fileMap, teamName)) {
          console.error(`Unexpected team in ${filePath}: ${data?.metadata?.labels?.['apl.io/teamId']}`)
          return
        }
      }
      // TODO: Remove workaround for User currently relying on id in console
      if (fileMap.kind === 'AplUser') {
        data.spec.id = data.metadata?.name
      }
      if (fileMap.kind === 'AplTeamWorkloadValues') {
        //TODO remove this custom workaround for workloadValues as it has no spec
        ref.push({ ...data, name })
      } else if (fileMap.v2) {
        ref.push(data)
      } else {
        ref.push(data?.spec)
      }
    } else if (fileMap.kind === 'AplTeamPolicy') {
      const ref: Record<string, any> = get(spec, jsonPath)
      const policy = {
        [data?.metadata?.name]: data?.spec,
      }
      const newRef = merge(cloneDeep(ref), policy)
      set(spec, jsonPath, newRef)
    } else {
      const ref: Record<string, any> = get(spec, jsonPath)
      let newRef
      if (fileMap.v2) {
        newRef = merge(cloneDeep(ref), data)
      } else {
        newRef = merge(cloneDeep(ref), data?.spec)
      }
      // Decrypted secrets may need to be merged with plain text specs
      set(spec, jsonPath, newRef)
    }
  } catch (e) {
    console.log(filePath)
    console.log(fileMap)
    throw e
  }
}

export function initSpec(fileMap: FileMap, jsonPath: string, spec: Record<string, any>) {
  if (fileMap.processAs === 'arrayItem') {
    set(spec, jsonPath, [])
  } else {
    set(spec, jsonPath, {})
  }
}

export async function loadToSpec(
  spec: Record<string, any>,
  fileMap: FileMap,
  deps = { loadFileToSpec },
): Promise<void> {
  const globOptions = {
    nodir: true, // Exclude directories
    dot: false,
  }
  const files: string[] = globSync(fileMap.pathGlob, globOptions).sort()
  const promises: Promise<void>[] = []

  files.forEach((filePath) => {
    const jsonPath = getJsonPath(fileMap, filePath)
    initSpec(fileMap, jsonPath, spec)
    if (hasCorrespondingDecryptedFile(filePath, files)) return
    promises.push(deps.loadFileToSpec(filePath, fileMap, spec))
  })

  await Promise.all(promises)
}

export async function loadValues(envDir: string, deps = { loadToSpec }): Promise<Record<string, any>> {
  //We need everything to load to spec for the API
  const fileMaps = getFileMaps(envDir)
  const spec = {}

  await Promise.all(
    fileMaps.map(async (fileMap) => {
      await deps.loadToSpec(spec, fileMap)
    }),
  )

  return spec
}

export async function getKmsSettings(envDir: string, deps = { loadToSpec }): Promise<Record<string, any>> {
  const kmsFiles = getFileMap('AplKms', envDir)
  const spec = {}
  await deps.loadToSpec(spec, kmsFiles)
  return spec
}
