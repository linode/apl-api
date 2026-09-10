import { ValidationError } from 'src/error'
import { cleanEnv, RESERVED_SERVICE_NAMES } from 'src/validators'

const env = cleanEnv({ RESERVED_SERVICE_NAMES })

const reservedServiceNames = new Set(
  env.RESERVED_SERVICE_NAMES.split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 0),
)

export function assertServiceNameNotReserved(name: string): void {
  if (reservedServiceNames.has(name.trim().toLowerCase())) {
    throw new ValidationError(
      `Service name is reserved. Reserved names: ${Array.from(reservedServiceNames).join(', ')}`,
    )
  }
}
