import {
  AplKind,
  AplRequestObject,
  AplResponseObject,
  DeepPartial,
  ResourceMetadata,
  ResourceTeamMetadata,
  ServiceSpec,
  V1ApiObject,
} from '../otomi-models'
import { v4 as uuidv4 } from 'uuid'
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
    id: aplObject.metadata.labels['apl.io/id'],
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

export function createObjectMetadata(
  name: string,
  id?: string,
  teamId?: string,
): ResourceMetadata | ResourceTeamMetadata {
  const labels = teamId
    ? {
        'apl.io/id': id ?? uuidv4(),
        'apl.io/teamId': teamId,
      }
    : {
        'apl.io/id': id ?? uuidv4(),
      }
  return {
    name,
    labels,
  }
}

export function createAplObject(
  name: string,
  request: AplRequestObject,
  id?: string,
  teamId?: string,
): AplResponseObject {
  return {
    kind: request.kind,
    metadata: createObjectMetadata(name, id, teamId),
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
