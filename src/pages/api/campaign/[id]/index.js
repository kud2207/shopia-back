import Campaign from 'src/@apiCore/models/campaign'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import { createFileStore } from 'src/@apiCore/lib/file-store'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const localStorage = require('node-persist')

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
  await authenticate(req, res)

  await dbConnect()
  await localStorage.init({ dir: './storage' })

  switch (method) {
    case 'GET':
      try {
        const delivery = await Campaign.findOne({ _id: id })

        res.status(200).json({ success: true, data: delivery })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields, files) => {
          const data = JSON.parse(fields.newCampaign)
          let contentBlocks = []
          for (let block of data.contentBlocks) {
            if (block.type == 'file') {
              if (files && files[block.id] && files[block.id].name) {
                const url = await uploadFileWithFormidable(
                  'public/assets/campaigns/',
                  files[block.id],
                  block.file.type?.includes('application') ? block.file.name : ''
                )
                if (url) contentBlocks.push({ ...block, file: { ...block.file, uri: url } })
              } else contentBlocks.push(block)
            } else contentBlocks.push(block)
          }

          data.contentBlocks = contentBlocks

          const result = await Campaign.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true
          })
          
          if (result && result.shop) {
            const fileStore = await createFileStore(result.shop?.toString())
            fileStore.saveCampaign(result)
          }

          res.status(201).json({ success: true, data: result })
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deletedUser = await Campaign.deleteOne({ _id: id })
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
