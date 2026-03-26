import type { FileStore } from 'src/fileStore/file-store'
import type { Git } from 'src/git'
import type { AplCodeRepoResponse, AplKind, AplRecord, Settings, TestRepoConnect } from 'src/otomi-models'

export interface CodeRepoContext {
  fileStore: FileStore
  git: Git

  getSettings(keys?: string[]): Settings
  getApp(name: string): any

  saveTeamConfigItem(aplTeamObject: any): Promise<AplRecord>
  deleteTeamConfigItem(kind: AplKind, teamId: string, name: string): Promise<string>

  doDeployment(aplRecord: AplRecord, encryptSecrets?: boolean, files?: string[]): Promise<void>
  doDeleteDeployment(filePaths: string[]): Promise<void>
}

export type { AplCodeRepoResponse, TestRepoConnect }
