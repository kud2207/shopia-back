import dbConnect from 'src/@apiCore/lib/mongodb'
import Campaign from 'src/@apiCore/models/campaign'

import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import mongoose, { isValidObjectId } from 'mongoose'
import authenticate from 'src/middleware/authenticate'

export const config = {
  api: {
    bodyParser: false
  }
}
export default async function orders(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const { method } = req
  await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const { shop, page, limit, sortBy, sortOrder } = req.query

        // Search
        let queryData = {}
        if (shop) queryData.shop = new mongoose.Types.ObjectId(shop)

        // Pagination
        const pageNumber = parseInt(page) || 1
        const pageSize = parseInt(limit) || 10

        // Sorting
        const sortOptions = { createdAt: -1 }
        if (sortBy) {
          sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
        }

        const values = await Campaign.aggregate([
          { $sort: sortOptions },
          {
            $match: {
              $and: [queryData]
            }
          },
          {
            $facet: {
              data: [{ $skip: pageSize * (pageNumber - 1) }, { $limit: pageSize }],
              pagination: [{ $count: 'total' }]
            }
          }
        ])
        res.status(200).json({
          success: true,
          data: values.length > 0 ? values[0].data : [],
          pagination: {
            totalItems: values.length > 0 ? values[0].pagination[0]?.total || 0 : 0
          }
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
      }
      break

    case 'POST':
      try {
        const form = new formidable.IncomingForm({ multiples: false })

        form.parse(req, async (err, fields, files) => {
          // Determine if the customer is new or existing
          if (err) res.status(400).json({ success: false })
        const campaign = await Campaign.findOne({_id: fields.campaignId})

          const data = JSON.parse(fields.newCampaign)
          let contentBlocks = []
          for (let block of data.contentBlocks) {
            if (block.type == 'file') {
              if (files && files[block.id] && files[block.id].name) {
                const url = await uploadFileWithFormidable('public/assets/campaigns/', files[block.id], block.file.type?.includes("application")? block.file.name: "" )
                if (url) contentBlocks.push({ ...block, file:{...block.file, uri:url}})
              }
            } else contentBlocks.push(block)
          }

          data.contentBlocks = contentBlocks

          if (!fields.shop || (fields.shop && !isValidObjectId(fields.shop))) {
            return res.status(400).json({
              message: 'Information sur la boutique manquante. Veuillez selectionner la boutique ou reconnectez vous!'
            })
          }

          res.status(201).json({ success: true, data: campaign })
        })
      } catch (error) {
        if (error.code === 11000 && error.keyPattern.email) {
          return res.status(400).json({ ret: false, message: 'error_user_exist' })
        } else if (error.code === 11000 && error.keyPattern.phone) {
          return res.status(400).json({ ret: false, message: 'error_phone_exist' })
        } else {
          res.status(400).json({ ret: false, error, message: 'error' })
        }
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
