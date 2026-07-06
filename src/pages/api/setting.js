import Setting from 'src/@apiCore/models/setting'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import { getAssistantConfig } from 'src/@apiCore/helpers/assistant-config'

export const config = {
  api: {
    bodyParser: false
  }
}
export default async function settingData(req, res) {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization"
  );
    //Preflight CORS handler
    if (req.method === "OPTIONS") {
      return res.status(200).json({
        body: "OK",
      });
    }
  const { method } = req
  await authenticate(req, res)
  await dbConnect()
  switch (method) {
    case 'GET':
      try {
        const values = await Setting.findOne()
        const assistantConfig = getAssistantConfig(values)
        res.status(200).json({
          success: true,
          data: values
            ? {
                ...values.toObject(),
                assistantConfig
              }
            : {
                content: {},
                assistantConfig
              }
        })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields) => {
          const conv = await Setting.create(fields)
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
