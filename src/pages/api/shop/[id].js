import Shop from 'src/@apiCore/models/shop'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import OpenAI from 'openai'
import { createAssistantFile } from 'src/@apiCore/helpers/uploadAssistantFile'
import { createFileStore } from 'src/@apiCore/lib/file-store'
import Setting from 'src/@apiCore/models/setting'
import { resolveAssistantModel } from 'src/@apiCore/helpers/assistant-config'

const openai = new OpenAI({
  organization: process.env.ORGANIZATION
})

export const config = {
  api: {
    bodyParser: false
  }
}
const updateLocks = new Map()
const updateLocks1 = new Map()

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
  const fileStore = await createFileStore(id)

  switch (method) {
    case 'GET':
      try {
        const shop = await Shop.findOne({ _id: id }).populate('pack')
        if (!shop) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: shop })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: false })
        if (updateLocks.get(id)) {
          const shop = await Shop.findOne({ _id: id })
            .populate('categories')
            .populate({ path: 'user', populate: 'plan' })
          return res.status(200).json({ ret: true, message: 'shop_updated', shop: shop })
        }
        updateLocks.set(id, true)
        form.parse(req, async (err, fields, files) => {
          const setting = await Setting.findOne()

          if (files && files.image && files.image.name) {
            const url = await uploadFileWithFormidable('public/assets/images/', files.image)
            if (url) fields.logo = url
          }
          if (files && files.file && files.file.name) {
            const url = await uploadFileWithFormidable('public/assets/images/', files.file)
            if (url) fields.file = url
          }

          if (fields.categories) fields.categories = JSON.parse(fields.categories)
          if (fields.deliveryCities) fields.deliveryCities = fields.deliveryCities.split(',')
          if (fields.undeliveryZones) fields.undeliveryZones = fields.undeliveryZones.split(',')
          if ('model' in fields) {
            fields.model = resolveAssistantModel(fields.model, setting)
          }

          if (fields.isScan == '1' && !fields.assistantId) {
            // const myAssistant = await openai.beta.assistants.create({
            //   name: fields.name,
            //   description: id,
            //   tools: [{ type: 'file_search' }],
            //   model: 'gpt-4o-mini',
            //   temperature: 0.2
            // })
            fields.model = resolveAssistantModel(fields.model, setting)
            // fields.assistantId = myAssistant.id
            fields.assistantId = 'none'
          }

          if (fields.assistantId == 'none' && !fields.model) {
            fields.model = resolveAssistantModel(fields.model, setting)
          }

          Shop.findOneAndUpdate({ _id: id }, { $set: fields }, { new: true, runValidators: true })
            .populate('categories')
            .populate({ path: 'user', populate: 'plan' })
            .then(async (updatedShop) => {
              if (!updatedShop) {
                return res.status(404).json({ ret: false, message: 'shop_not_found' })
              }
              if (
                (fields.isScan == '1' || fields.active == '1' || files.file || fields.description) &&
                updatedShop.isScan == 1 &&
                updatedShop.assistantId &&
                updatedShop.name
              ) {
                if(!updatedShop.model) {
                  if(setting) {
                      const template = updatedShop.type === 'service' ? setting?.content?.service_prompt : setting?.content?.commerce_prompt
                         const variables = {
                          shopName: updatedShop.name || '',
                          shopAddress: updatedShop.address || '',
                          shopCity: updatedShop?.city?.name || '',
                          shopFreeDelivery: updatedShop.freeDelivery ? ', avec livraison gratuite' : '',
                          shopDeliveryDelay: updatedShop.deliveryDelay || '1',
                        };

                        let prompt = template?.replaceAll(
                          /\{(\w+)\}/g,
                          (_, key) => variables[key] ?? ''
                        );
                      updatedShop.prompt = prompt
                }}
                createAssistantFile(id)
              }
              try {
                if (updatedShop) fileStore.saveShop(updatedShop)
              } catch (err) {
                console.log(err)
              }

              res.status(200).json({ ret: true, message: 'shop_updated', shop: updatedShop })
            })
            .catch(error => {
              console.log(error, 'heror')
              res.status(400).json({ message: 'Server error', ret: false, error, type: 'server_error' })
            })
            .finally(() => {
              setTimeout(() => {
                updateLocks.delete(id)
              }, 10000)
            })
        })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deleteduser = await Shop.deleteOne({ _id: id })
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
