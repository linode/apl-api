export default function (otomi) {
  const GET: any = [
    (req, res, next) => {
      return res.json(req.apiDoc)
    },
  ]
  const api = {
    GET,
  }
  return api
}
