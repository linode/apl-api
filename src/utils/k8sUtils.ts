import semver from 'semver'
import { cleanEnv, MIN_KNATIVE_K8S_VERSION } from '../validators'

const env = cleanEnv({
  MIN_KNATIVE_K8S_VERSION,
})

export function isK8sVersionAtLeast(k8sVersion: string, minVersion: string): boolean {
  const coerced = semver.coerce(k8sVersion)
  if (!coerced) return false
  return semver.gte(coerced, minVersion)
}

export function isKnativeSupported(k8sVersion: string): boolean {
  return isK8sVersionAtLeast(k8sVersion, env.MIN_KNATIVE_K8S_VERSION)
}
