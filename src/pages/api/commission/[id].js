import Commission from 'src/@apiCore/models/commission'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const {
    query: { id },
    method
  } = req
  await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const commission = await Commission.findOne({ _id: id })
        if (!commission) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: commission })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields, files) => {
          const result = await Commission.findByIdAndUpdate(id, fields, {
            new: true,
            runValidators: true
          })
          if (!result) {
            return res.status(400).json({ success: false })
          }

          res.status(200).json({ success: true, data: result })
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deleteduser = await Commission.deleteOne({ _id: id })
        if (!deleteduser) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: {} })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
