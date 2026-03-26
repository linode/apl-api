import Debug from 'debug'
import { cloneDeep, merge, unset } from 'lodash'

import { AlreadyExists, NotExistError } from 'src/error'
import { getSecretValues } from 'src/k8s_operations'
import {
  AplCodeRepoRequest,
  AplCodeRepoResponse,
  App,
  buildTeamObject,
  DeepPartial,
  TestRepoConnect,
  toTeamObject,
} from 'src/otomi-models'
import {
  getGiteaRepoUrls,
  normalizeRepoUrl,
  testPrivateRepoConnect,
  testPublicRepoConnect,
} from 'src/utils/codeRepoUtils'
import { cleanEnv, DEFAULT_PLATFORM_ADMIN_EMAIL } from 'src/validators'

import type { CodeRepoContext } from './context'

const debug = Debug('otomi:otomi-stack:domains:codeRepo')

const env = cleanEnv({
  DEFAULT_PLATFORM_ADMIN_EMAIL,
})

function normalizeCodeRepoInput<T extends { spec?: Record<string, any> }>(data: T): T {
  const normalized = cloneDeep(data)

  if (!normalized.spec) return normalized

  if (!normalized.spec.private) {
    unset(normalized.spec, 'secret')
  }

  if (normalized.spec.gitService === 'gitea') {
    unset(normalized.spec, 'private')
  }

  return normalized
}

export function getTeamAplCodeRepos(ctx: CodeRepoContext, teamId: string): AplCodeRepoResponse[] {
  const files = ctx.fileStore.getTeamResourcesByKindAndTeamId('AplTeamCodeRepo', teamId)
  return Array.from(files.values()) as AplCodeRepoResponse[]
}

export function getAllAplCodeRepos(ctx: CodeRepoContext): AplCodeRepoResponse[] {
  const files = ctx.fileStore.getAllTeamResourcesByKind('AplTeamCodeRepo')
  return Array.from(files.values()) as AplCodeRepoResponse[]
}

export function getAplCodeRepo(ctx: CodeRepoContext, teamId: string, name: string): AplCodeRepoResponse {
  const codeRepo = ctx.fileStore.getTeamResource('AplTeamCodeRepo', teamId, name)
  if (!codeRepo) {
    throw new NotExistError(`Code repo ${name} not found in team ${teamId}`)
  }
  return codeRepo as AplCodeRepoResponse
}

export async function createAplCodeRepo(
  ctx: CodeRepoContext,
  teamId: string,
  data: AplCodeRepoRequest,
): Promise<AplCodeRepoResponse> {
  const normalized = normalizeCodeRepoInput(data)

  const existingRepos = getTeamAplCodeRepos(ctx, teamId)
  const allRepoUrls = existingRepos.map((repo) => repo.spec.repositoryUrl) || []
  const allNames = existingRepos.map((repo) => repo.metadata.name) || []

  if (allRepoUrls.includes(normalized.spec.repositoryUrl)) {
    throw new AlreadyExists('Code repository URL already exists')
  }

  if (allNames.includes(normalized.metadata.name)) {
    throw new AlreadyExists('Code repo name already exists')
  }

  const teamObject = toTeamObject(teamId, normalized)
  const aplRecord = await ctx.saveTeamConfigItem(teamObject)
  await ctx.doDeployment(aplRecord, false)

  return aplRecord.content as AplCodeRepoResponse
}

export async function editAplCodeRepo(
  ctx: CodeRepoContext,
  teamId: string,
  name: string,
  data: DeepPartial<AplCodeRepoRequest>,
  patch = false,
): Promise<AplCodeRepoResponse> {
  const normalized = normalizeCodeRepoInput(data)
  const existing = getAplCodeRepo(ctx, teamId, name)

  const updatedSpec = patch
    ? merge(cloneDeep(existing.spec), normalized.spec)
    : { ...existing.spec, ...normalized.spec }

  const teamObject = buildTeamObject(existing, updatedSpec)
  const aplRecord = await ctx.saveTeamConfigItem(teamObject)
  await ctx.doDeployment(aplRecord, false)

  return aplRecord.content as AplCodeRepoResponse
}

export async function deleteAplCodeRepo(ctx: CodeRepoContext, teamId: string, name: string): Promise<void> {
  const filePath = await ctx.deleteTeamConfigItem('AplTeamCodeRepo', teamId, name)
  await ctx.doDeleteDeployment([filePath])
}

export async function getTestRepoConnect(
  _ctx: CodeRepoContext,
  url: string,
  teamId: string,
  secretName: string,
): Promise<TestRepoConnect> {
  try {
    let sshPrivateKey = ''
    let username = ''
    let accessToken = ''

    const isPrivate = !!secretName

    if (isPrivate) {
      const secret = await getSecretValues(secretName, `team-${teamId}`)
      sshPrivateKey = secret?.['ssh-privatekey'] || ''
      username = secret?.username || ''
      accessToken = secret?.password || ''
    }

    const isSSH = !!sshPrivateKey
    const repoUrl = normalizeRepoUrl(url, isPrivate, isSSH)

    if (!repoUrl) return { status: 'failed' }

    if (isPrivate) {
      return (await testPrivateRepoConnect(repoUrl, sshPrivateKey, username, accessToken)) as TestRepoConnect
    }

    return (await testPublicRepoConnect(repoUrl)) as TestRepoConnect
  } catch {
    return { status: 'failed' }
  }
}

export async function getInternalRepoUrls(ctx: CodeRepoContext, teamId: string): Promise<string[]> {
  if (env.isDev || !teamId || teamId === 'admin') return []

  const gitea = ctx.getApp('gitea') as App
  if (!gitea?.values?.enabled) return []

  const { cluster, otomi } = ctx.getSettings(['cluster', 'otomi'])

  const username = (otomi?.git?.username ?? '') as string
  const password = (otomi?.git?.password ?? '') as string
  const orgName = `team-${teamId}`
  const domainSuffix = cluster?.domainSuffix

  const internalRepoUrls = (await getGiteaRepoUrls(username, password, orgName, domainSuffix)) || []
  return internalRepoUrls
}
