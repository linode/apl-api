import schema from '../generated-schema.json'

export function getPolicies() {
  const policies = schema.components.schemas.Policies.properties
  const convertedPolicies = Object.entries(policies).map(([name, policy]) => ({
    name,
    description: policy.description,
    enabled: true,
    action: policy.properties.action.default,
    severity: policy.properties.severity.default,
  }))
  return convertedPolicies
}
