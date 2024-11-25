import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, WorkloadValues } from 'src/otomi-models'
import express from 'express'
import bodyParser from 'body-parser'

const debug = Debug('otomi:api:teams:workloadValues')

export default function (): OperationHandlerArray {
  const limitPayloadSize = bodyParser.json({ limit: '1mb' }) // Set your desired payload size, e.g., 1 MB

  const get: Operation = [
    ({ otomi, params: { workloadId } }: OpenApiRequestExt, res): void => {
      debug(`editWorkloadValues(${workloadId})`)
      const data = otomi.getWorkloadValues(decodeURIComponent(workloadId))
      res.json(data)
    },
  ]

  const put: Operation = [
    limitPayloadSize,
    express.json({ limit: '500kb' }),
    ({ otomi, params: { teamId, workloadId }, body }: OpenApiRequestExt, res): void => {
      debug(`editWorkloadValues(${workloadId})`)
      console.log('body put')
      const data = otomi.editWorkloadValues(decodeURIComponent(workloadId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as WorkloadValues)
      res.json(data)
    },
  ]

  const patch: Operation = [
    limitPayloadSize,
    express.json({ limit: '500kb' }),
    ({ otomi, params: { teamId, workloadId }, body }: OpenApiRequestExt, res): void => {
      const { image, containerPorts, fullnameOverride, ...rest } = body.values
      console.log('body patch')
      debug(`editWorkloadValues(${workloadId})`)
      const data = otomi.editWorkloadValues(decodeURIComponent(workloadId), {
        id: workloadId,
        values: {
          fullnameOverride,
          image,
          containerPorts,
          ...rest,
        },
        teamId: decodeURIComponent(teamId),
      } as WorkloadValues)
      res.json(data)
    },
  ]

  const api = {
    get,
    put,
    patch,
  }
  return api
}
