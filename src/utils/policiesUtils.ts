import schema from '../generated-schema.json'

function getCustomValues(policyName: string) {
  if (policyName === 'disallow-capabilities') {
    return [
      'AUDIT_WRITE',
      'CHOWN',
      'DAC_OVERRIDE',
      'FOWNER',
      'FSETID',
      'KILL',
      'MKNOD',
      'NET_BIND_SERVICE',
      'SETFCAP',
      'SETGID',
      'SETPCAP',
      'SETUID',
      'SYS_CHROOT',
      "''",
    ]
  }
  if (policyName === 'restrict-volume-types') {
    return [
      'name',
      'configMap',
      'csi',
      'downwardAPI',
      'emptyDir',
      'ephemeral',
      'persistentVolumeClaim',
      'projected',
      'secret',
      "''",
    ]
  }
  return undefined
}

export function getPolicies() {
  const policies = schema.components.schemas.Policies.properties
  return Object.entries(policies).reduce((acc: Record<string, any>, [name, policy]) => {
    const action = policy.properties.action.default
    const severity = policy.properties.severity.default
    const customValues = getCustomValues(name)
    const newAcc = { ...acc, [name]: { action, severity, customValues } }
    return newAcc
  }, {})
}
