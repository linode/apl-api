import { ChannelCredentials, ServiceError } from '@grpc/grpc-js'
import retry from 'async-retry'
import { CreatePasswordResp, DeletePasswordResp, DexClient, Password, UpdatePasswordResp } from 'src/generated/dex/api'
import { cleanEnv, DEX_GRPC_ADDRESS } from 'src/validators'
import { DEX_NO_GROUPS_SENTINEL } from 'src/clients/dexConstants'

export type { Password }

const env = cleanEnv({ DEX_GRPC_ADDRESS })

function toDexGroups(groups: string[]): string[] {
  return groups.length > 0 ? groups : [DEX_NO_GROUPS_SENTINEL]
}

export class DexProvisionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'DexProvisionError'
  }
}

let client: DexClient | undefined

function getDexClient(): DexClient {
  if (!env.DEX_GRPC_ADDRESS) {
    throw new DexProvisionError('DEX_GRPC_ADDRESS must be set when AUTH_PROVIDER=dex')
  }
  if (!client) {
    // Secured by Istio mtls and Authorization policy
    client = new DexClient(env.DEX_GRPC_ADDRESS, ChannelCredentials.createInsecure())
  }
  return client
}

function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  return retry(fn, { retries: 3, minTimeout: 200 })
}

export interface CreateDexPasswordInput {
  id: string
  email: string
  passwordHash: string
  username: string
  groups: string[]
}

export async function createDexPassword(input: CreateDexPasswordInput): Promise<void> {
  const dex = getDexClient()
  await callWithRetry(
    () =>
      new Promise<void>((resolve, reject) => {
        dex.createPassword(
          {
            password: {
              email: input.email,
              hash: Buffer.from(input.passwordHash, 'utf-8'),
              username: input.username,
              userId: input.id,
              groups: toDexGroups(input.groups),
            },
          },
          (err: ServiceError | null, resp: CreatePasswordResp) => {
            if (err) {
              reject(new DexProvisionError(`Dex CreatePassword failed for ${input.email}`, err))
              return
            }
            if (resp?.alreadyExists) {
              reject(new DexProvisionError(`Dex already has a password record for ${input.email}`))
              return
            }
            resolve()
          },
        )
      }),
  )
}

export interface UpdateDexPasswordInput {
  email: string
  newHash?: string
  newUsername?: string
  newGroups?: string[]
}

export async function updateDexPassword(input: UpdateDexPasswordInput): Promise<void> {
  const dex = getDexClient()
  await callWithRetry(
    () =>
      new Promise<void>((resolve, reject) => {
        dex.updatePassword(
          {
            email: input.email,
            newHash: input.newHash ? Buffer.from(input.newHash, 'utf-8') : Buffer.alloc(0),
            newUsername: input.newUsername ?? '',
            newGroups: input.newGroups !== undefined ? toDexGroups(input.newGroups) : [],
          },
          (err: ServiceError | null, resp: UpdatePasswordResp) => {
            if (err) {
              reject(new DexProvisionError(`Dex UpdatePassword failed for ${input.email}`, err))
              return
            }
            if (resp?.notFound) {
              reject(new DexProvisionError(`Dex has no password record for ${input.email}`))
              return
            }
            resolve()
          },
        )
      }),
  )
}

export async function listDexPasswords(): Promise<Password[]> {
  const dex = getDexClient()
  return callWithRetry(
    () =>
      new Promise<Password[]>((resolve, reject) => {
        dex.listPasswords({}, (err: ServiceError | null, resp: { passwords: Password[] }) => {
          if (err) {
            reject(new DexProvisionError('Dex ListPasswords failed', err))
            return
          }
          resolve(resp?.passwords ?? [])
        })
      }),
  )
}

export async function deleteDexPassword(email: string): Promise<void> {
  const dex = getDexClient()
  await callWithRetry(
    () =>
      new Promise<void>((resolve, reject) => {
        dex.deletePassword({ email }, (err: ServiceError | null, resp: DeletePasswordResp) => {
          if (err) {
            reject(new DexProvisionError(`Dex DeletePassword failed for ${email}`, err))
            return
          }
          // notFound is treated as success: deleting an already-absent record is a no-op,
          // matching deleteUser's existing idempotent-delete behavior for the Git side.
          void resp
          resolve()
        })
      }),
  )
}
