import DeliveryService from 'src/@apiCore/models/deliveryService'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import User from 'src/@apiCore/models/user'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function deliveryService(req, res) {
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
        const { page, limit, sortBy, sortOrder } = req.query
        const {userId} = req.query


        // Pagination
        const pageNumber = parseInt(page) || 1
        const pageSize = parseInt(limit) || 10
        const skip = (pageNumber - 1) * pageSize

        // Sorting
        const sortOptions = {}
        if (sortBy) {
          sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
        }
        const response = await DeliveryService.find({ user: userId, deleted: {$ne: true} }).populate("city")
          .sort(sortOptions)
          .skip(skip)
          .limit(pageSize)

        const totalItems = await DeliveryService.countDocuments({ user: req.query.userId, deleted: {$ne: true} })

        if (response) res.status(200).json({
          success: true, data: response, pagination: {
            totalItems,
            totalPages: Math.ceil(totalItems / pageSize),
            currentPage: pageNumber
          }
        })
        res.status(200).json({ success: true, data: [] })
      } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, data: error.message })
      }
      break

    case 'POST':
      try {
        const form = new formidable.IncomingForm({ multiples: false })

        form.parse(req, async (err, fields, files) => {
          const filesArr = []
          if (err) res.status(400).json({ success: false })
          if (files) {
            for (const key in files) {
              if (files.hasOwnProperty(key)) {
                const url = uploadFileWithFormidable('public/images/deliveryServices', files[key])
                filesArr.push(url)
              }
            }
            fields.images = filesArr
          }
          if (fields.deliveryZonnes) fields.deliveryZonnes = fields.deliveryZonnes.split(',')
          else fields.deliveryZonnes = []
          const deliveryService = await DeliveryService.create(fields).catch(() => {
            res.status(401).json({ success: false })
          })
          const user = await User.findById(fields.user)
          user.addService(deliveryService?._id)
          if (deliveryService) res.status(201).json({ success: true, data: deliveryService })
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
