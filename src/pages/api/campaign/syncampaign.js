import { createFileStore } from 'src/@apiCore/lib/file-store'
import dbConnect from 'src/@apiCore/lib/mongodb'
import Campaign from 'src/@apiCore/models/campaign'

export default async function preview(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  const { method } = req
  await dbConnect()

  switch (method) {
    case 'GET':
      {
        try {
          const campaigns = await Campaign.find({ participants: { $exists: true } })

          if (!campaigns.length) return res.status(400).json({ success: false, message: 'Missing shopId' })
          for (let campaign of campaigns) {
            const fileStore = await createFileStore(campaign?.shop?.toString())
            fileStore.saveCampaign(campaign)
            if (campaign.participants && campaign.participants.length > 0)
              fileStore.saveCampaignParticipants(campaign.participants?.map((v)=>({...v, campaign: campaign._id})))
          }
          res.status(200).json({
            success: true
          })
        } catch (err) {
          console.log('err', err)
          return res.status(400).json({ success: false, message: err.message })
        }
      }
      break

    default:
      res.status(400).json({ success: false })
      break
  }
}
const delay = ms => new Promise(res => setTimeout(res, ms))
