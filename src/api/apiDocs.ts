import { OpenApiRequest } from '../api.d'

export default function (otomi) {
  const GET: any = [
    ({ apiDoc }: OpenApiRequest, res, next) => {
      return res.json(apiDoc)
    },
  ]
  const api = {
    GET,
  }
  return api
}
