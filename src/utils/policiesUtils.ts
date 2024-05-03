import schema from '../generated-schema.json'

export function getPolicies() {
  const policies = schema.components.schemas.Policies.properties
  return Object.entries(policies).reduce((acc: Record<string, any>, [name, policy]: any) => {
    const action = policy.properties.action.default
    const severity = policy.properties.severity.default
    const customValues = policy.properties.customValues ? [] : undefined
    const newAcc = { ...acc, [name]: { action, severity, customValues } }
    return newAcc
  }, {})
}
