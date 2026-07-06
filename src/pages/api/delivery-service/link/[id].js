import ShopServices from 'src/@apiCore/models/shopService'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req, res) {
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
  const {
    query: { id },
    method
  } = req
  await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const shopServices = await ShopServices.findOne({ _id: id })

        res.status(200).json({ success: true, data: shopServices })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: false })

        form.parse(req, async (err, fields) => {
          if (fields.deliveryZonnes) fields.deliveryZonnes = fields.deliveryZonnes.split(',')
          else fields.deliveryZonnes = []

          ShopServices.findOneAndUpdate({ _id: id }, { $set: fields }, { new: true, runValidators: true })
            .then(updatedShop => {
              if (!updatedShop) {
                return res.status(404).json({ ret: false, message: 'product_not_found' })
              }
              res.status(200).json({ ret: true, message: 'product_updated', shopServices: updatedShop })
            })
            .catch(error => {
              console.log('error', error)

              res.status(400).json({ message: 'Server error', ret: false, error, type: 'server_error' })
            })
        })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deleteduser = await ShopServices.deleteOne({ _id: id })
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
