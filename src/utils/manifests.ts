import { AplKind, AplRequestObject, AplResponseObject, DeepPartial, ServiceSpec, V1ApiObject } from '../otomi-models'
import { merge, omit } from 'lodash'

export function getAplObjectFromV1(kind: AplKind, spec: V1ApiObject | ServiceSpec): AplRequestObject {
  return {
    kind,
    metadata: {
      name: spec.name,
    },
    spec,
  } as AplRequestObject
}

export function getV1ObjectFromApl(aplObject: AplResponseObject): V1ApiObject {
  return {
    teamId: aplObject.metadata.labels['apl.io/teamId'],
    name: aplObject.metadata.name,
    ...aplObject.spec,
  }
}

export function getV1MergeObject(updates: DeepPartial<V1ApiObject | ServiceSpec>): DeepPartial<AplRequestObject> {
  return {
    metadata: updates.name
      ? {
          name: updates.name,
        }
      : undefined,
    spec: omit(updates, ['id', 'teamId']),
  }
}

export function createAplObject(name: string, request: AplRequestObject, teamId?: string): AplResponseObject {
  const metaLabels = teamId
    ? {
        labels: {
          'apl.io/teamId': teamId,
        },
      }
    : {}
  return {
    kind: request.kind,
    metadata: {
      ...request.metadata,
      ...metaLabels,
      name,
    },
    spec: request.spec,
    status: {},
  } as AplResponseObject
}

export function updateAplObject(config: AplResponseObject, updates: AplRequestObject): AplResponseObject {
  merge(config.metadata, { name: updates.metadata?.name })
  Object.assign(config.spec, updates.spec)
  return config
}

export function getAplMergeObject(updates: DeepPartial<AplRequestObject>): DeepPartial<AplRequestObject> {
  return {
    metadata: updates.metadata?.name
      ? {
          name: updates.metadata?.name,
        }
      : undefined,
    spec: updates.spec || undefined,
  } as Partial<AplRequestObject>
}
