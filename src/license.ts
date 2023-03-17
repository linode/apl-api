import path from 'path'

export const defaultLicensePath = 'env/license.yaml'
export const defaultPublicKeyPath = path.resolve(__dirname, 'license/license.pem')

export function isLicenseValid(license: any): boolean {
  return false
}

export function loadLicense(filePath: string): Record<string, any> {
  return {}
}

export function loadPublicKey(filePath: string): string {
  return ''
}

export function saveLicense(filePath: string): string {
  return ''
}
