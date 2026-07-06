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
        const product = await Product.findOne({ _id: id })

        res.status(200).json({ success: true, data: product })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: false })

        form.parse(req, async (err, fields, files) => {
          const filesArr = []
          let lastArr = []
          if (fields.price) fields.price = parseInt(fields.price)
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
          }
          if ('lastImages' in fields) {
            lastArr = fields.lastImages ? fields.lastImages.split(',').filter(Boolean) : []
          }
          if (lastArr.length + filesArr.length > MAX_PRODUCT_IMAGES) {
            return res.status(400).json({
              success: false,
              message: 'Vous pouvez ajouter au maximum 5 images par produit.'
            })
          }
          if ('lastImages' in fields || filesArr.length > 0) fields.images = lastArr.concat(filesArr)

          Product.findOneAndUpdate({ _id: id }, { $set: fields }, { new: true, runValidators: true })
            .then(updatedShop => {
              if (!updatedShop) {
                return res.status(404).json({ ret: false, message: 'product_not_found' })
              }
              if (updatedShop.shop && !fields.stock) createAssistantFile(updatedShop.shop)

              res.status(200).json({ ret: true, message: 'product_updated', product: updatedShop })
            })
            .catch(error => {
              res.status(400).json({ message: 'Server error', ret: false, error, type: 'server_error' })
            })
        })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deleteduser = await Product.deleteOne({ _id: id })
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
