import mongoose from 'mongoose'
import { createFileStore } from 'src/@apiCore/lib/file-store'
import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Campaign from 'src/@apiCore/models/campaign'
import { ShopManager } from 'src/@apiCore/lib/shop-manager'
import processCampaign from 'src/@apiCore/lib/campaign-manage'
import moment from 'moment'
import WebSocket from "ws";

let ws = null;

function getWsClient() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ws = new WebSocket("ws://localhost:4000");
  }
  return ws;
}
export default async function preview(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }
  const { method } = req
  await dbConnect()
  const wsClient = getWsClient();

  switch (method) {
    case 'GET':
      {
        try {
          const fileStoreAll = await createFileStore()
          const now = new Date()

          const campaigns = await fileStoreAll.getCampaigns(now)

          if (!campaigns.length) return res.status(400).json({ success: false, message: 'Missing shopId' })
          const manager = ShopManager.getInstance()
          for (let campaign of campaigns) {
            if (campaign.status == 'Programmée') {
              const participants = []
              const orderParticipants = []

              const fileStore = await createFileStore(campaign.shop?.toString())
              const productIds = campaign?.products?.map(v => v._id?.toString())
              const [groups, contacts, chats, unknows, threads] = await Promise.all([
                fileStore.getGroups(),
                fileStore.getContacts(),
                fileStore.getChats(),
                fileStore.getChatsOutContacts(),
                fileStore.getThreads()
              ])
              const allChats = chats.length && chats.length > threads.length ? chats : threads

              // Build match condition
              const match = {
                shop: new mongoose.Types.ObjectId(campaign.shop)
              }

              // Si des produits sont spécifiés
              if (campaign.targetType == 'products') {
                const productIdArray =
                  productIds && productIds.length
                    ? productIds?.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
                    : []
                match['stocks.product._id'] = { $in: productIdArray }
              }

              // Pipeline de base
              const pipeline = [
                { $match: match },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customer'
                  }
                },
                {
                  $unwind: {
                    path: '$customer',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $group: {
                    _id: '$customer._id',
                    count: { $sum: 1 }, // Nombre de commandes par client
                    customer: { $first: '$customer' }
                  }
                }
              ]

              // Si on veut filtrer les clients ayant commandé au moins X fois
              if (campaign.minOrders) {
                pipeline.push({
                  $match: {
                    count: { $gte: campaign.minOrders }
                  }
                })
              }

              const orders = await Order.aggregate(pipeline)
              for (let order of orders) {
                const phone = order?.customer?.phone?.replace(/\s+/g, '')?.replace(/\+/g, '') + '@s.whatsapp.net'
                if (!orderParticipants.find(v => v.jid == phone))
                  orderParticipants.push({ jid: phone, name: order?.customer?.name })
              }

              //recupérer tous les clients ayant passé une commande
              if (campaign.targetType == 'orders' || campaign.targetType == 'products') {
                for (let order of orders) {
                  const phone = order?.customer?.phone?.replace(/\s+/g, '')?.replace(/\+/g, '') + '@s.whatsapp.net'
                  if (!participants.find(v => v.jid == phone))
                    participants.push({ jid: phone, name: order?.customer?.name })
                }
              }

              switch (campaign.targetType) {
                case 'all':
                  for (let chat of allChats) {
                    const jid = chat.jid || chat.phone + '@s.whatsapp.net'
                    if (!participants.find(v => v.jid == jid))
                      participants.push({ jid: jid, name: chat.name || chat?.notify })
                  }
                  break

                case 'prospect':
                  for (let chat of allChats) {
                    const jid = chat.jid || chat.phone + '@s.whatsapp.net'
                    if (!participants.find(v => v.jid == jid) && !orderParticipants.find(v => v.jid == jid))
                      participants.push({ jid: jid, name: chat.name || chat?.notify })
                  }
                  break

                case 'unknow':
                  for (let chat of unknows) {
                    const jid = chat.jid || chat.phone + '@s.whatsapp.net'
                    if (!participants.find(v => v.jid == jid) && !orderParticipants.find(v => v.jid == jid))
                      participants.push({ jid: jid, name: chat.name || chat?.notify })
                  }
                  break

                case 'contact':
                  for (let con of contacts) {
                    if (!participants.find(v => v.jid == con.id))
                      participants.push({ jid: con.id, name: con.name || con?.notify })
                  }
                  break

                default:
                  console.warn('Type de ciblage inconnu ')
                  break
              }

              if (campaign.isGroup) {
                groups
                  .filter(g => campaign.groups?.includes(g.jid))
                  .map(group => {
                    console.log(group)
                    for (let con of group.participants) {
                      if (!participants.find(v => v.jid == con.jid) && !con.isAdmin)
                        participants.push({ jid: con.jid, name: con.name || con?.notify })
                    }
                  })
              }

              if (campaign.contacts && campaign.contacts.length) {
                for (let con of campaign.contacts) {
                  const phone = con.numero.replace(/\s+/g, '')?.replace(/\+/g, '') + '@s.whatsapp.net'
                  if (!participants.find(v => v.jid == phone)) participants.push({ jid: phone, name: con.nom })
                }
              }
              await fileStore.saveCampaignParticipants(participants.map(item => ({ ...item, campaign: campaign?._id })))
              // campaign.participants = participants
              campaign.status = 'En cours'
              campaign.nextDate = new Date(moment().add(1, 'day').add(1, 'hour'))
              await fileStoreAll.saveCampaign(campaign)
              await saveCampaign(campaign)
              wsClient.send(JSON.stringify({ action: "startCampaign", data: { campaign } }));

              // let client = await manager.getOrCreateClient(campaign.shop.toString())
              // setTimeout(async () => {
              //   client = await manager.getOrCreateClient(campaign.shop.toString())
              //   console.log('client', client)
              //   if (client) processCampaign(client.socket, campaign)
              // }, 5000)
            } else if (campaign.status == 'Active' || campaign.status == 'En cours') {
              campaign.status = 'En cours'
              campaign.nextDate = new Date(moment().add(1, 'day').add(1, 'hour'))
              await fileStoreAll.saveCampaign(campaign)
              await saveCampaign(campaign)
              wsClient.send(JSON.stringify({ action: "startCampaign", data: { campaign } }));

            }
            await delay(5000)
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
const saveCampaign = async campaign => {
  const result = await Campaign.findByIdAndUpdate(campaign._id, campaign, {
    new: true,
    runValidators: true
  })
}
