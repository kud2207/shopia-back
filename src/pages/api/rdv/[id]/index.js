import Appointment from 'src/@apiCore/models/appointment'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'

export const config = {
  api: {
    bodyParser: false
  }
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
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
  if (method != 'GET') await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const appointment = await Appointment.findOne({ _id: id })

        res.status(200).json({ success: true, data: appointment })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields, files) => {
          const result = await Appointment.findByIdAndUpdate(id, fields, {
            new: true,
            runValidators: true
          }).catch(err => {
            console.log(err)
            return res.status(400).json({ success: false })
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
        const deletedUser = await Appointment.deleteOne({ _id: id })
        if (!deletedUser) {
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
