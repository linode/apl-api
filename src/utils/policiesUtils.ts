import schema from '../generated-schema.json'

export function getPolicies() {
  const policies = schema.components.schemas.Policies.properties
  const convertedPolicies = Object.entries(policies).map(([name, policy]: any) => ({
    name,
    action: policy.properties.action.default,
    severity: policy.properties.severity.default,
    ...(policy.properties.customValues && { customValues: [] }),
  }))
  return convertedPolicies
}
