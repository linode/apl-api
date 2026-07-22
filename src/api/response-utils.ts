type ResourceWithStatus = {
  status?: unknown
}

export const ensureStatus = <T extends ResourceWithStatus>(resource: T): T & { status: Record<string, unknown> } => {
  return { ...resource, status: resource.status ?? {} } as T & { status: Record<string, unknown> }
}
