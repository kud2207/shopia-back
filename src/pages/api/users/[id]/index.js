import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import bcrypt from 'bcrypt'
import authenticate from 'src/middleware/authenticate'

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
        const user = await User.findOne({ _id: id })
          .populate('plan')
          .populate('shops')
          .populate({
            path: 'deliveryCompanies',
            populate: [
              { path: 'adress' }, // Correction de 'adress' en 'address'
              { path: 'shops' },
              {
                path: 'pricings',
                populate: { path: 'zone' }
              }
            ]
          })

        res.status(200).json({ success: true, data: user })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields, files) => {
          if (files && files.image && files.image.name) {
            const url = await uploadFileWithFormidable('public/assets/images/', files.image)
            if (url) fields.image = url
          }

          if (fields.pass) fields.password = await bcrypt.hash(fields.pass, 10)
          if (fields.shops) fields.shops = fields.shops?.split(',')
          if (fields.zones) fields.zones = fields.zones?.split(',')
          if (fields.company) fields.deliveryCompanies = [fields.company]
          if (fields.longitude && fields.latitude)
            fields.location = {
              type: 'Point',
              coordinates: [fields.longitude, fields.latitude] // MongoDB attend [longitude, latitude]
            }

          const result = await User.findByIdAndUpdate(id, fields, {
            new: true,
            runValidators: true
          })
            .populate('plan')
            .populate('shops')
            .populate({
              path: 'deliveryCompanies',
              populate: [
                { path: 'adress' }, // Correction de 'adress' en 'address'
                { path: 'shops' },
                {
                  path: 'pricings',
                  populate: { path: 'zone' }
                }
              ]
            })
            .catch(error => {
              if (error.code === 11000 && error.keyPattern.email) {
                return res.status(400).json({
                  message: 'Un utilisateur ayant ce numéro de téléphone existe déjà',
                  ret: false,
                  type: 'error_user_exist'
                })
              } else if (error.code === 11000 && error.keyPattern.phone) {
                return res.status(400).json({
                  message: 'Un utilisateur ayant cet adresse mail existe déjà',
                  ret: false,
                  type: 'error_phone_exist'
                })
              } else {
                res.status(500).json({
                  message: 'Server error',
                  ret: false,
                  error,
                  type: 'server_error'
                })
              }
            })
          if (!result) {
            return res.status(400).json({ success: false })
          }

          // if (user.role == "livreur") createAssistantFile();
          res.status(200).json({ success: true, data: result })
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deletedUser = await User.deleteOne({ _id: id })
        res.status(200).json({ success: true, data: deletedUser })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
