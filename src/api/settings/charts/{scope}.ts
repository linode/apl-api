import OtomiStack from '../../../otomi-stack'
import { OpenApiRequest } from '../../../api.d'

export default function (otomi: OtomiStack) {
  const GET = [
    (req: OpenApiRequest, res) => {
      const data = otomi.getChartsSettings(req.params.scope)
      return res.status(200).json(data)
    },
  ]
  const PATCH = [
    (req, res) => {
      return res.status(200).json({})
    },
  ]
  const api = {
    GET,
    PATCH,
  }
  return api
}
