// The in-memory key-value store: file path -> parsed content
import Debug from 'debug'
import { ensureDir } from 'fs-extra'
import { writeFile } from 'fs/promises'
import { globSync } from 'glob'
import { merge } from 'lodash'
import path from 'path'
import { stringify as stringifyYaml } from 'yaml'
import { z } from 'zod'
import { APL_KINDS, AplKind, AplObject, AplPlatformObject, AplRecord, AplTeamObject } from '../otomi-models'
import { loadYaml } from '../utils'
import { getFileMapForKind, getFileMaps, getResourceFilePath } from './file-map'

const debug = Debug('otomi:file-store')

// Zod schema for validating APL objects (team resources)
const AplObjectSchema = z.object({
  kind: z.enum(APL_KINDS),
  metadata: z.looseObject({
    name: z.string(),
    labels: z.record(z.string(), z.string()).optional(),
  }),
  spec: z.record(z.string(), z.any()),
  status: z.record(z.string(), z.any()).optional(),
})

export function getTeamIdFromPath(filePath: string): string | undefined {
  const match = filePath.match(/\/teams\/([^/]+)/)
  return match ? match[1] : undefined
}

export async function writeFileToDisk(repoPath: string, relativePath: string, content: AplObject): Promise<void> {
  const fullPath = path.join(repoPath, relativePath)
  await ensureDir(path.dirname(fullPath))
  const yamlContent = stringifyYaml(content)
  await writeFile(fullPath, yamlContent, 'utf8')
}

function hasDecryptedFile(filePath: string, fileList: string[]): boolean {
  return fileList.includes(`${filePath}.dec`)
}

function shouldSkipValidation(filePath: string): boolean {
  return filePath.includes('/sealedsecrets/') || filePath.includes('/workloadValues/')
}

function isRawContent(filePath: string): boolean {
  return filePath.includes('/workloadValues/')
}

export class FileStore {
  private store: Map<string, AplObject> = new Map()

  // Static factory method to load FileStore from disk
  static async load(envDir: string): Promise<FileStore> {
    const store = new FileStore()
    const fileMaps = getFileMaps(envDir)

    // PASS 1: Load all files into temporary storage
    const allFiles = new Map<string, AplObject>()

    const fileMapResults = await Promise.all(
      Array.from(fileMaps.values()).map(async (fileMap) => {
        const files = globSync(fileMap.pathGlob, { nodir: true, dot: false })
        return files.sort()
      }),
    )

    const filesToLoad = fileMapResults.flatMap((files) =>
      files.filter((filePath) => !hasDecryptedFile(filePath, files)),
    )

    await Promise.all(
      filesToLoad.map(async (filePath) => {
        const rawContent = await loadYaml(filePath, { isRaw: isRawContent(filePath) })
        const relativePath = path.relative(envDir, filePath).replace(/\.dec$/, '')

        // Skip validation for specific file paths
        if (shouldSkipValidation(filePath)) {
          allFiles.set(relativePath, rawContent as AplObject)
          return
        }

        // Validate all other kinds
        const result = AplObjectSchema.safeParse(rawContent)

        if (!result.success) {
          debug(`Validation failed for ${relativePath}:`, result.error.message)
          return
        }

        if (!result.data) {
          debug(`No content found for ${relativePath}`)
          return
        }

        allFiles.set(relativePath, result.data as AplObject)
      }),
    )

    // PASS 2: Merge secret files into main files
    for (const [filePath, content] of allFiles.entries()) {
      if (filePath.includes('/secrets.')) {
        // This is a secret file - find its main file
        const mainFilePath = filePath.replace('/secrets.', '/')
        const mainContent = allFiles.get(mainFilePath)

        if (mainContent) {
          // Normal case: merge secret spec into main spec using DEEP merge
          mainContent.spec = merge({}, mainContent.spec, content.spec)
          // Keep the merged main file in allFiles for final storage
        } else {
          // Special case (users): no main file exists, secret IS the main
          // Store at main path (without secrets. prefix)
          allFiles.set(mainFilePath, content)
        }
        // Remove secret file from map (don't store separately)
        allFiles.delete(filePath)
      }
    }

    // Store final merged files
    for (const [filePath, content] of allFiles.entries()) {
      store.set(filePath, content)
    }

    return store
  }

  get(filePath: string): AplObject | undefined {
    return this.store.get(filePath)
  }

  //Set types that do not adhere to AplObject e.g. SealedSecrets and WorkloadValues
  set(filePath: string, content: any): AplRecord {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.store.set(filePath, content)
    return { filePath, content }
  }

  delete(filePath: string): string {
    this.store.delete(filePath)
    return filePath
  }

  keys(): IterableIterator<string> {
    return this.store.keys()
  }

  // Typed methods for team resources
  getTeamResource(kind: AplKind, teamId: string, name: string): AplObject | undefined {
    const filePath = getResourceFilePath(kind, name, teamId)
    return this.store.get(filePath)
  }

  setTeamResource(aplTeamObject: AplTeamObject): string {
    const filePath = getResourceFilePath(
      aplTeamObject.kind,
      aplTeamObject.metadata.name,
      aplTeamObject.metadata.labels['apl.io/teamId'],
    )
    this.store.set(filePath, aplTeamObject)
    return filePath
  }

  setPlatformResource(aplPlatformObject: AplPlatformObject): string {
    const filePath = getResourceFilePath(aplPlatformObject.kind, aplPlatformObject.metadata.name)
    this.store.set(filePath, aplPlatformObject)
    return filePath
  }

  deleteTeamResource(kind: AplKind, teamId: string, name: string): string {
    const filePath = getResourceFilePath(kind, name, teamId)
    this.store.delete(filePath)
    return filePath
  }

  // Generic method for all resources (platform and team)
  getByKind(kind: AplKind, teamId?: string): Map<string, AplObject> {
    const fileMap = getFileMapForKind(kind)
    if (!fileMap) {
      throw new Error(`Unknown kind: ${kind}`)
    }

    // Generate path prefix from template (e.g., 'env/teams/team1/workloads/')
    const prefix = fileMap.pathTemplate.replace('{teamId}', teamId || '').replace('{name}.yaml', '')

    const result = new Map<string, AplObject>()
    for (const filePath of this.store.keys()) {
      if (filePath.startsWith(prefix) && filePath.endsWith('.yaml')) {
        const content = this.store.get(filePath)
        if (content) result.set(filePath, content)
      }
    }
    return result
  }

  getTeamIds(): string[] {
    const teamIds = new Set<string>()
    for (const filePath of this.store.keys()) {
      const teamId = getTeamIdFromPath(filePath)
      if (teamId) teamIds.add(teamId)
    }
    return Array.from(teamIds).sort()
  }

  // Copy from another FileStore
  copyFrom(other: FileStore): void {
    for (const filePath of other.keys()) {
      this.store.set(filePath, other.get(filePath)!)
    }
  }
}
