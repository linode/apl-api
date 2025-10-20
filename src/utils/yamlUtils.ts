import YAML from 'yaml'

export function quoteIfDangerous(value: unknown) {
  if (typeof value === 'string' && ['yes', 'no', 'on', 'off'].includes(value.toLowerCase())) {
    const scalar = new YAML.Scalar(value)
    scalar.type = YAML.Scalar.QUOTE_DOUBLE
    return scalar
  }
  return value
}

export function deepQuote(obj: any): any {
  if (Array.isArray(obj)) return obj.map(deepQuote)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepQuote(v)]))
  }
  return quoteIfDangerous(obj)
}
