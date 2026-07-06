import Product from 'src/@apiCore/models/product'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import { createAssistantFile } from 'src/@apiCore/helpers/uploadAssistantFile'

const MAX_PRODUCT_IMAGES = 5
const MAX_IMAGE_SIZE = 3 * 1024 * 1024

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function product(req, res) {
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
        const products = await Product.find({ _id: id })
        if (!product) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: products })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'POST':
      try {
        const form = new formidable.IncomingForm({ multiples: false })

        form.parse(req, async (err, fields, files) => {
          const filesArr = []
          if (err) res.status(400).json({ success: false })
          console.log('files', files)

          if (files) {
            const fileEntries = Object.values(files)

            if (fileEntries.length > MAX_PRODUCT_IMAGES) {
              return res.status(400).json({
                success: false,
                message: 'Vous pouvez ajouter au maximum 5 images par produit.'
              })
            }

            for (const key in files) {
              if (files.hasOwnProperty(key)) {
                if (files[key]?.size > MAX_IMAGE_SIZE) {
                  return res.status(400).json({
                    success: false,
                    message: 'Chaque image doit faire 3 Mo maximum.'
                  })
                }
                const url = await uploadFileWithFormidable('public/images/products', files[key])
                filesArr.push(url)
              }
            }
            fields.images = filesArr
          }

          if (fields.price) fields.price = parseInt(fields.price)
          const product = await Product.create(fields).catch(() => res.status(401).json({ success: false }))
          if (product) {
            if (fields.shop) createAssistantFile(fields.shop)
            res.status(201).json({ success: true, data: product })
          } else res.status(400).json({ success: false })
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
