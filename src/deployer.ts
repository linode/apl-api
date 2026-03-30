import Debug from 'debug'
import { FileStore } from 'src/fileStore/file-store'
import { Git } from 'src/git'
import { cleanSession, getSessionStack } from 'src/middleware'
import { AplKind, AplRecord, AplTeamObject } from 'src/otomi-models'
import { getSanitizedErrorMessage } from 'src/utils'

const debug = Debug('otomi:deployer')

export class Deployer {
  constructor(
    private git: Git,
    private fileStore: FileStore,
    private editor: string | undefined,
    private sessionId: string,
  ) {}

  async saveTeamConfigItem(aplTeamObject: AplTeamObject): Promise<AplRecord> {
    debug(
      `Saving ${aplTeamObject.kind} ${aplTeamObject.metadata.name} for team ${aplTeamObject.metadata.labels['apl.io/teamId']}`,
    )
    const filePath = this.fileStore.setTeamResource(aplTeamObject)
    await this.git.writeFile(filePath, aplTeamObject)
    return { filePath, content: aplTeamObject }
  }

  async deleteTeamConfigItem(kind: AplKind, teamId: string, name: string): Promise<string> {
    debug(`Removing ${kind} ${name} for team ${teamId}`)
    const filePath = this.fileStore.deleteTeamResource(kind, teamId, name)
    await this.git.removeFile(filePath)
    return filePath
  }

  async doDeployments(aplRecords: AplRecord[], encryptSecrets = true, files?: string[]): Promise<void> {
    const rootStack = await getSessionStack()
    try {
      await this.git.save(this.editor!, encryptSecrets, files)
      await rootStack.git.git.pull()
      for (const aplRecord of aplRecords) {
        rootStack.fileStore.set(aplRecord.filePath, aplRecord.content)
      }
      debug(`Updated root stack values with ${this.sessionId} changes`)
    } catch (e) {
      e.message = getSanitizedErrorMessage(e)
      throw e
    } finally {
      await cleanSession(this.sessionId)
    }
  }

  async doDeployment(aplRecord: AplRecord, encryptSecrets = true, files?: string[]): Promise<void> {
    const rootStack = await getSessionStack()
    try {
      await this.git.save(this.editor!, encryptSecrets, files)
      await rootStack.git.git.pull()
      rootStack.fileStore.set(aplRecord.filePath, aplRecord.content)
      debug(`Updated root stack values with ${this.sessionId} changes`)
    } catch (e) {
      e.message = getSanitizedErrorMessage(e)
      throw e
    } finally {
      await cleanSession(this.sessionId)
    }
  }

  async doDeleteDeployment(filePaths: string[]): Promise<void> {
    const rootStack = await getSessionStack()
    try {
      await this.git.save(this.editor!, false)
      await rootStack.git.git.pull()
      for (const filePath of filePaths) {
        rootStack.fileStore.delete(filePath)
      }
      debug(`Updated root stack values with ${this.sessionId} changes`)
    } catch (e) {
      e.message = getSanitizedErrorMessage(e)
      throw e
    } finally {
      await cleanSession(this.sessionId)
    }
  }
}
