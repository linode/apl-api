import { cloneDeep, merge, unset } from 'lodash'
import { Deployer } from 'src/deployer'
import { AlreadyExists, NotExistError } from 'src/error'
import { FileStore } from 'src/fileStore/file-store'
import {
  AplCodeRepoRequest,
  AplCodeRepoResponse,
  buildTeamObject,
  CodeRepo,
  DeepPartial,
  toTeamObject,
} from 'src/otomi-models'
import { getAplObjectFromV1, getV1MergeObject, getV1ObjectFromApl } from 'src/utils/manifests'

export class CodeRepos {
  constructor(
    private fileStore: FileStore,
    private deployer: Deployer,
  ) {}

  getAll(): CodeRepo[] {
    return this.getAllApl().map((codeRepo) => getV1ObjectFromApl(codeRepo) as CodeRepo)
  }

  getAllApl(): AplCodeRepoResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AplTeamCodeRepo')
    return Array.from(files.values()) as AplCodeRepoResponse[]
  }

  getByTeam(teamId: string): CodeRepo[] {
    return this.getByTeamApl(teamId).map((codeRepo) => getV1ObjectFromApl(codeRepo) as CodeRepo)
  }

  getByTeamApl(teamId: string): AplCodeRepoResponse[] {
    const files = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamCodeRepo', teamId)
    return Array.from(files.values()) as AplCodeRepoResponse[]
  }

  getV1(teamId: string, name: string): CodeRepo {
    return getV1ObjectFromApl(this.get(teamId, name)) as CodeRepo
  }

  get(teamId: string, name: string): AplCodeRepoResponse {
    const codeRepo = this.fileStore.getTeamResource('AplTeamCodeRepo', teamId, name)
    if (!codeRepo) throw new NotExistError(`Code repo ${name} not found in team ${teamId}`)
    return codeRepo as AplCodeRepoResponse
  }

  async createV1(teamId: string, data: CodeRepo): Promise<CodeRepo> {
    return getV1ObjectFromApl(
      await this.create(teamId, getAplObjectFromV1('AplTeamCodeRepo', data) as AplCodeRepoRequest),
    ) as CodeRepo
  }

  async create(teamId: string, data: AplCodeRepoRequest): Promise<AplCodeRepoResponse> {
    const existingRepos = this.getByTeamApl(teamId)
    if (existingRepos.some((repo) => repo.spec.repositoryUrl === data.spec.repositoryUrl))
      throw new AlreadyExists('Code repository URL already exists')
    if (existingRepos.some((repo) => repo.metadata.name === data.metadata.name))
      throw new AlreadyExists('Code repo name already exists')
    if (!data.spec.private) unset(data.spec, 'secret')
    if (data.spec.gitService === 'gitea') unset(data.spec, 'private')

    const teamObject = toTeamObject(teamId, data)
    const aplRecord = await this.deployer.saveTeamConfigItem(teamObject)
    await this.deployer.doDeployment(aplRecord, false)
    return aplRecord.content as AplCodeRepoResponse
  }

  async editV1(teamId: string, name: string, data: CodeRepo): Promise<CodeRepo> {
    return getV1ObjectFromApl(
      await this.edit(teamId, name, getV1MergeObject(data) as DeepPartial<AplCodeRepoRequest>),
    ) as CodeRepo
  }

  async edit(
    teamId: string,
    name: string,
    data: DeepPartial<AplCodeRepoRequest>,
    patch = false,
  ): Promise<AplCodeRepoResponse> {
    if (!data.spec?.private) unset(data.spec, 'secret')
    if (data.spec?.gitService === 'gitea') unset(data.spec, 'private')

    const existing = this.get(teamId, name)
    const updatedSpec = patch ? merge(cloneDeep(existing.spec), data.spec) : { ...existing.spec, ...data.spec }
    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.deployer.saveTeamConfigItem(teamObject)
    await this.deployer.doDeployment(aplRecord, false)
    return aplRecord.content as AplCodeRepoResponse
  }

  async delete(teamId: string, name: string): Promise<void> {
    const filePath = await this.deployer.deleteTeamConfigItem('AplTeamCodeRepo', teamId, name)
    await this.deployer.doDeleteDeployment([filePath])
  }
}
