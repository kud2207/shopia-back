import Stock from 'src/@apiCore/models/stock'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import { handleCreateNotif } from 'src/@apiCore/npoints'
import { sendPushNotificationToUser } from 'src/@apiCore/helpers'

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
        const stock = await Stock.findOne({ _id: id })

        res.status(200).json({ success: true, data: stock })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields, files) => {
          if (fields.delivery) fields.delivery = JSON.parse(fields.delivery)
          const result = await Stock.findByIdAndUpdate(id, fields, {
            new: true,
            runValidators: true
          })
          if (!result) {
            return res.status(400).json({ success: false })
          }
          if (fields.name && fields.shopName && result.livreur && result) {
            console.log(result)
            const val = `${fields.shopName} vous à ajouter ${fields.ajout || result.stockEnAjout} ${fields.name}`
            handleCreateNotif({
              title: 'Ajout du stock',
              company: result.livreur?.toString(),
              content: val,
              redirectionLink: '',
              read: false
            })
            sendPushNotificationToUser('Ajout du stock', val, '', result.livreur?.toString())
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
        const deletedUser = await Stock.deleteOne({ _id: id })
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
