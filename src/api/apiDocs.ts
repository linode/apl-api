import { OpenApiRequest } from '../otomi-models'

export default function () {
  const GET: any = [
    ({ apiDoc }: OpenApiRequest, res) => {
      return res.json(apiDoc)
    },
  ]
  const api = {
    GET,
  }
  return api
}
