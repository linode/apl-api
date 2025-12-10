import { baseRequest, createBucket, createObjectStorageKeys, ObjectStorageKey, setToken } from '@linode/api-v4'
import { OtomiError } from 'src/error'

export class ObjectStorageClient {
  constructor(private apiToken: string) {
    baseRequest.interceptors.request.clear()
    this.setToken()
  }

  private setToken() {
    setToken(this.apiToken)
  }

  public async createObjectStorageBucket(label: string, region: string): Promise<string | OtomiError> {
    try {
      const bucket = await createBucket({
        label,
        region,
      })
      return bucket.label
    } catch (err) {
      const error = new OtomiError(
        err.response?.data?.errors?.[0]?.reason ?? err.response?.statusText ?? 'Error creating object storage bucket',
      )
      error.code = err.response?.status ?? 500
      return error
    }
  }

  public async createObjectStorageKey(
    lkeClusterId: string,
    region: string,
    bucketNames: string[],
  ): Promise<Pick<ObjectStorageKey, 'access_key' | 'secret_key' | 'regions'> | OtomiError> {
    const timestamp = new Date().getTime()
    const bucketAccesses: any[] = bucketNames.map((bucketName) => ({
      bucket_name: bucketName,
      permissions: 'read_write',
      region,
    }))
    try {
      const objectStorageKeys = await createObjectStorageKeys({
        label: `lke${lkeClusterId}-key-${timestamp}`,
        regions: [region],
        bucket_access: bucketAccesses,
      })
      return objectStorageKeys
    } catch (err) {
      const error = new OtomiError(
        err.response?.data?.errors?.[0]?.reason ??
          err.response?.statusText ??
          'Error creating object storage access key',
      )
      error.code = err.response?.status ?? 500
      return error
    }
  }
}
// define cluster id based on cluster name
export function defineClusterId(clusterName: string | undefined): string | undefined {
  if (!clusterName) return undefined
  return clusterName.replace('aplinstall', '')
}
