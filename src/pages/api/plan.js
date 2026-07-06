import Plan from 'src/@apiCore/models/plan'
import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
import authenticate from 'src/middleware/authenticate'

export const config = {
  api: {
    bodyParser: false
  }
}
export default async function plan(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const { method } = req
  await dbConnect()
  if (req.headers?.authorization) await authenticate(req, res)

  switch (method) {
    case 'GET':
      try {
        const { isFree, type } = req.query
        const query = { type: type, isNewUser: { $exists: false } }
        if (req.user && req.user.isNewUser && req.user.role == 'marchand') query.isNewUser = true

        const values = isFree ? await Plan.findOne({ price: 0, type: type }) : await Plan.find(query)
        res.status(200).json({
          success: true,
          data: values
        })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields) => {
          const conv = await Plan.create(fields)
          if (conv) res.status(201).json({ success: true, data: conv })
          else res.status(400).json({ success: false })
        })
      } catch (error) {
        console.log(error.message)
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
