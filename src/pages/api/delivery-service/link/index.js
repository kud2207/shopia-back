import ShopService from 'src/@apiCore/models/shopService'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import DeliveryService from 'src/@apiCore/models/deliveryService'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function shopService(req, res) {
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
        const shopServices = await ShopService.find({ shop: req.query.shopId, status: 'validate' }).populate({
          path: 'deliveryService',
          populate: 'user'
        })
        if (!shopService) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: shopServices })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'POST':
      try {
        const form = new formidable.IncomingForm({ multiples: false })

        form.parse(req, async (err, fields) => {
          if (err) res.status(400).json({ success: false })
          console.log(fields)
          const shopService = await ShopService.create(fields).catch(() => {
            res.status(401).json({ success: false })
          })
          const service = await DeliveryService.findById(fields.deliveryService)
          service.addService(shopService?._id)
          if (shopService) res.status(201).json({ success: true, data: shopService })
          else res.status(400).json({ success: false })
        })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
