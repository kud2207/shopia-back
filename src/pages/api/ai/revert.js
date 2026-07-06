import Campaign from 'src/@apiCore/models/campaign'

import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import { isValidObjectId } from 'mongoose'
import { createFileStore } from 'src/@apiCore/lib/file-store'
import OpenAI from 'openai'
import Shop from 'src/@apiCore/models/shop'
import dbConnect from 'src/@apiCore/lib/mongodb'

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
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const openai = new OpenAI()
        const shops = await Shop.find({isScan:true, assistantId: ""})
        for (let shop of shops) {
          const shopId = shop?._id?.toString()
          const fileStore = await createFileStore(shopId)
          const threads = await fileStore.getThreads()
          for (let thead of threads) {
            if (thead && thead.threadId?.startsWith('conv_')) {
              const threadData = await openai.conversations.items.list(thead.threadId, {
                order: 'desc',
                limit: 20
              })
              console.log('threadData', JSON.stringify(threadData))
              const items = threadData.data.filter((v)=>v.role && v.content)?.reverse().map(v => ({
                role: v.role,
                content: v?.content?.[0]?.text || ' '
              }))
              if (items.length) {
                const conversation = await openai.beta.threads.create({
                  messages: items
                })
                
                if (conversation) {
                  const cleanThread = { ...thead }
                  delete cleanThread._id

                  await fileStore.saveThread([{ ...cleanThread, threadId: conversation.id }])
                }
              }
            }
          }
          const assistant = await openai.beta.assistants.create({
            name: shop.name,
            description: shop._id,
            instructions: shop.instructions,
            tools: [{ type: 'file_search' }],
            model: 'gpt-4o-mini',
            temperature: 0.2,
            tool_resources: {
              file_search: {
                vector_store_ids: [shop.assistantFileId]
              }
            }
          })
          const updatedShop = await Shop.findOneAndUpdate(
            { _id: shopId },
            { $set: { assistantId: assistant.id, model: '' } },
            { new: true, runValidators: true }
          ).populate('user')

          if (updatedShop) {
            fileStore.saveShop(updatedShop)
          }
          res.status(200).json({
            success: true
          })
        }
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
              }
            } else contentBlocks.push(block)
          }

          data.contentBlocks = contentBlocks

          if (!fields.shop || (fields.shop && !isValidObjectId(fields.shop))) {
            return res.status(400).json({
              message: 'Information sur la boutique manquante. Veuillez selectionner la boutique ou reconnectez vous!'
            })
          }
          const fileStore = await createFileStore(fields.shop?.toString())

          const campaign = await Campaign.create(data).catch(err => {
            console.log('err', err)
            return res
              .status(400)
              .json({ result: false, message: 'Erreur survenue lors de la création de la commande' })
          })
          if (campaign) fileStore.saveCampaign(campaign)

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
