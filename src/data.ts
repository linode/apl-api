import { globSync } from 'glob'
import { loadYaml } from 'src/utils'
import { v4 as uuidv4 } from 'uuid'
import Db from './db'
interface FileMap {
  tableName: string
  pathGlob: string
}

export const fileMap: Array<FileMap> = [
  { tableName: 'users', pathGlob: '**/users/*.yaml' },
  { tableName: 'apps', pathGlob: '**/apps/*.yaml' },
  { tableName: 'builds', pathGlob: '**/teams/*/builds/*.yaml' },
  { tableName: 'workloads', pathGlob: '**/teams/*/workloads/*.yaml' },
  { tableName: 'services', pathGlob: '**/teams/*/services/*.yaml' },
  { tableName: 'sealedsecrets', pathGlob: '**/teams/*/sealedsecrets/*.yaml' },
  { tableName: 'backups', pathGlob: '**/teams/*/backups/*.yaml' },
  { tableName: 'projects', pathGlob: '**/teams/*/projects/*.yaml' },
  { tableName: 'netpols', pathGlob: '**/teams/*/netpols/*.yaml' },
  { tableName: 'teams', pathGlob: '**/teams/*/settings.yaml' },
  { tableName: 'policies', pathGlob: '**/teams/*/policies.yaml' },
  { tableName: 'apps', pathGlob: '**/apps/*/*.yaml' },
  { tableName: 'settings', pathGlob: '**/settings/*.yaml' },
]

export const extractTeamDirectory = (filePath: string): string | null => {
  const match = filePath.match(/\/teams\/([^/]+)/)
  return match ? match[1] : null
}

export const loadItem = async (filePath: string, deps = { loadYaml }): Promise<Record<string, any>> => {
  const data = await deps.loadYaml(filePath)
  const teamName = extractTeamDirectory(filePath)
  if (teamName !== null) data!['teamId'] = teamName
  data!.id = data!.id || uuidv4()
  return data!
}

export const loadItemToCollection = async (
  filePath: string,
  collection: Array<Record<string, any>>,
  deps = { loadItem },
): Promise<void> => {
  const item = await deps.loadItem(filePath)
  collection.push(item)
}

export const loadCollection = async (
  pathGlob: string,
  deps = { loadItemToCollection },
): Promise<Array<Record<string, any>>> => {
  const files: string[] = globSync(pathGlob)
  const collection: Array<Record<string, any>> = []
  const promises: Promise<void>[] = []
  files.forEach((filePath) => {
    promises.push(deps.loadItemToCollection(filePath, collection))
  })

  await Promise.all(promises)
  return collection
}

export const load = async (envDir, db: Db): Promise<void> => {
  await Promise.all(
    fileMap.map(async (item) => {
      const collection = await loadCollection(item.pathGlob)
      db.db.defaults({ [item.tableName]: collection }).write()
    }),
  )
}
