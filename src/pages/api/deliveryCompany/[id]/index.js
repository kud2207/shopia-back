import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import DeliveryCompany from 'src/@apiCore/models/deliveryCompany'
import CompanyAdress from 'src/@apiCore/models/companyAdress'
import DeliveryPricing from 'src/@apiCore/models/deliveryPricing'

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
        const deliverycompany = await DeliveryCompany.findOne({ _id: id })
          .populate('adress pricings')
          .populate({ path: 'shops', populate: 'city country user' })

        res.status(200).json({ success: true, data: deliverycompany })
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
            if (url) fields.logo = url
          }
          if (fields.isCollaboration) {
            const company = await DeliveryCompany.findOne({ _id: id })
            if (company) await company.addShop(fields.shop)
            res.status(200).json({ success: true, data: company })
          } else if (fields.isCancelCollaboration) {
            const company = await DeliveryCompany.findOne({ _id: id })
            if (company) await company.removeShop(fields.shop)
            res.status(200).json({ success: true, data: company })
          } else {
            let adressData = null
            if (fields.address) {
              const adress = JSON.parse(fields.address)
              const newA = adress.filter(v => !v._id)
              const oldA = adress.filter(v => v._id)
              if (newA && newA.length) adressData = await CompanyAdress.insertMany(newA)
              if (oldA && oldA.length) {
                const bulkOps = oldA.map(item => ({
                  updateOne: {
                    filter: { _id: item._id },
                    update: { $set: item }
                  }
                }))

                const oldadressData = await CompanyAdress.bulkWrite(bulkOps)
              }
              if (adressData) fields.adress = oldA?.map(i => i._id)?.concat(adressData?.map(item => item._id))
              else fields.adress = oldA?.map(i => i._id)
            }
            let zonesData = null
            if (fields.zones) {
              const zones = JSON.parse(fields.zones)
              const newA = zones.filter(v => !v._id)
              const oldA = zones.filter(v => v._id)
              console.log(oldA)
              if (newA && newA.length) zonesData = await DeliveryPricing.insertMany(newA)
              if (oldA && oldA.length) {
                const bulkOps = oldA.map(item => ({
                  updateOne: {
                    filter: { _id: item._id },
                    update: { $set: item }
                  }
                }))

                const oldzonesData = await DeliveryPricing.bulkWrite(bulkOps)
                console.log('oldzonesData', oldzonesData)
              }
              if (zonesData) fields.pricings = oldA.map(i => i._id)?.concat(zonesData?.map(item => item._id))
              else fields.pricings = oldA.map(i => i._id)
            }
            const result = await DeliveryCompany.findByIdAndUpdate(id, fields, {
              new: true,
              runValidators: true
            })
              .populate('adress')
              .populate('shops')
              .populate({
                path: 'pricings',
                populate: { path: 'zone' }
              })
            if (!result) {
              return res.status(400).json({ success: false })
            }
            res.status(200).json({ success: true, data: result })
          }
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deletedUser = await DeliveryCompany.deleteOne({ _id: id })
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
