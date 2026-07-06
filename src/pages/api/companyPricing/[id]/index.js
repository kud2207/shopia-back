import DeliveryPricing from 'src/@apiCore/models/deliveryPricing'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import DeliveryCompany from 'src/@apiCore/models/deliveryCompany'

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
        const motif = await DeliveryPricing.findOne({ _id: id })

        res.status(200).json({ success: true, data: motif })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields, files) => {
          if (fields.title) fields.title = JSON.parse(fields.title)
          if (fields.content) fields.content = JSON.parse(fields.content)
          const result = await DeliveryPricing.findByIdAndUpdate(id, fields, {
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
        const deliveryPricing = await DeliveryPricing.findOne({ _id: id })
        const deletedUser = await DeliveryPricing.deleteOne({ _id: id })
        if (!deletedUser) {
          return res.status(400).json({ success: false })
        }
        if (deliveryPricing) {
          const company = await DeliveryCompany.findOne({ _id: deliveryPricing.deliveryCompany })
          await company.deletePricingItem(deliveryPricing._id)
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
