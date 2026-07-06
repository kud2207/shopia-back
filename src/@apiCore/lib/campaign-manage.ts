// 📁 services/safeSender.js
import makeWASocket, { PollMessageOptions } from 'baileys'
import Campaign from 'src/@apiCore/models/campaign'
import ShopLimit from 'src/@apiCore/models/shopLimit'
import OpenAI from 'openai'
import { createFileStore } from './file-store'

const MESSAGE_LIMIT = 500
const MAX_ERRORS = 3

const delay = ms => new Promise(res => setTimeout(res, ms))

function isLimitError(err) {
  return err?.status === 429 || err?.output?.statusCode === 429
}

async function sendMessage(client: ReturnType<typeof makeWASocket>, jid, msg) {
  const type = msg.type
  switch (type) {
    case 'text':
      return await client.sendMessage(jid, { text: msg.content })
    case 'image':
      return await client.sendMessage(jid, { image: { url: msg.url }, caption: msg.caption })
    case 'video':
      return await client.sendMessage(jid, { video: { url: msg.url }, caption: msg.caption })
    case 'audio':
      return await client.sendMessage(jid, { audio: { url: msg.url }, mimetype: 'audio/mp4' })
    case 'document':
      return await client.sendMessage(jid, {
        document: { url: msg.url },
        mimetype: msg.type,
        fileName: msg.fileName + ''
      })
    case 'poll':
      const poll: PollMessageOptions = { name: msg.question, values: msg.options }
      if (!msg.isMultiReply) poll.selectableCount = 1
      return await client.sendMessage(jid, { poll })
    default:
      console.log('Unsupported message type')
  }
}

async function getFileType(type: string) {
  let val = ''
  if (type.includes('image')) val = 'image'
  else if (type.includes('audio')) val = 'audio'
  else if (type.includes('video')) val = 'video'
  else if (type.includes('application')) val = 'document'

  return val
}

function replaceVariables(template, variables) {
  return template.replace(/{(\w+)}/g, (_, key) => variables[key] || '')
}

async function getUserThread(userPhone, fileStore, openai: OpenAI, shop) {
  let userThread = await fileStore.getThread(userPhone)
  //Create thread
  if (!userThread) {
    const emptyThread = shop.model ? await openai.conversations.create({}) : await openai.beta.threads.create()
    if (emptyThread) {
      userThread = { phone: userPhone, threadId: emptyThread?.id }
      fileStore.saveThread(userThread)
    }
  }

  return userThread
}

const saveCampaign = async campaign => {
  const result = await Campaign.findByIdAndUpdate(campaign._id, campaign, {
    new: true,
    runValidators: true
  })
}

async function sendMessageToThread(thread, text, openai: OpenAI, shop) {
  if (shop.model) {
    await openai.conversations.items
      .create(thread.threadId, {
        items: [
          {
            type: 'message',
            content: text,
            role: 'assistant'
          }
        ]
      })
      .catch(err => {
        console.log(err)
      })
  } else
    await openai.beta.threads.messages
      .create(thread.threadId, {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      })
      .catch(err => {
        console.log(err)
      })
}

async function processCampaign(client: ReturnType<typeof makeWASocket>, campaign) {
  const fileStore = await createFileStore(campaign.shop?.toString())
  let limit = await fileStore.getShopLimit(campaign.shop?.toString())
  const shop = await fileStore.getShop(campaign.shop?.toString())
  let count = limit.count
  const openai = new OpenAI()
  let isFinish = false
  if (count >= MESSAGE_LIMIT || limit.autoPaused) return

  while (count < MESSAGE_LIMIT && !limit.autoPaused && !isFinish) {
    let participants = await fileStore.getCampaignUnsendParticipants(campaign._id?.toString())
    const targets = participants?.filter(v => !v.isSend && !v.isError)
    let errors = 0
    try {
      if (targets.length == 0) isFinish = true
      for (let i = 0; i < targets.length; i++) {
        const jid = targets[i]?.jid
        let userThread: any = await getUserThread(jid?.split('@')?.[0], fileStore, openai, shop).catch(err =>
          console.log(err)
        )

        const [result]: any = await client.onWhatsApp(jid).catch(err => {
          console.log(err)
        })
        if (jid && (result?.exists || jid.includes('@lid'))) {
          await client.presenceSubscribe(result?.jid || jid)

          await client.sendPresenceUpdate('composing', result?.jid || jid)

          for (let j = 0; j < campaign.contentBlocks.length; j++) {
            try {
              const block = campaign.contentBlocks[j]

              let content: any = null
              if (block.type == 'message') {
                const val = replaceVariables(block.message, {
                  name: targets[i]?.name,
                  phone: result?.jid?.split('@')?.[0]
                })
                content = {
                  type: 'text',
                  content: val
                }

                //Ajouter le contenu au thread pour garder l'assistant au courant de ce qui se passe afin qu'il ne perde pas de file
                await sendMessageToThread(userThread, val, openai, shop)
              } else if (block.type == 'file') {
                const type = await getFileType(block.file?.type)
                content = { url: block.file?.uri, fileName: block.file?.name, type: type }
              } else if (block.type == 'poll') content = { type: 'poll', ...block.poll }

              const sendedMessage = await sendMessage(client, result?.jid || jid, content)

              if (sendedMessage) {
                await fileStore.saveMessage({
                  id: sendedMessage.key?.id,
                  blockId: block.id,
                  campaignId: campaign._id,
                  ...sendedMessage
                })
              }

              await delay(2000)
            } catch (err) {
              console.log('campaign error:::', err)
              if (isLimitError(err)) {
                await fileStore.saveShopLimit({ ...limit, autoPaused: true, count })
                limit.autoPaused = true
                await fileStore.saveCampaignParticipants(participants)
                return
              }
              errors++
              if (errors >= MAX_ERRORS) {
                await fileStore.saveShopLimit({ ...limit, autoPaused: true, count })
                limit.autoPaused = true
                await fileStore.saveCampaignParticipants(participants)
                return
              }
              await ShopLimit.updateOne({ shopId: campaign.shop }, { count })
            }
          }
          await client.sendPresenceUpdate('paused', result?.jid || jid)

          participants = participants?.map(p => (p.jid == jid ? { ...p, isSend: true } : p))
        } else {
          participants = participants?.map(p => (p.jid == jid ? { ...p, isError: true } : p))
        }

        count++
        await fileStore.saveCampaignParticipants(participants)
        if (count >= MESSAGE_LIMIT) {
          await fileStore.saveShopLimit({ ...limit, autoPaused: true, count })
          return
        } else await fileStore.saveShopLimit({ ...limit, count })
        await delay(Math.random() * 20000 + 10000)

        const newCam = await fileStore.getCampaign(campaign._id?.toString())

        if (newCam && newCam.status == 'En pause') break
      }
    } catch (err) {
      await fileStore.saveShopLimit({ ...limit, count })
    }

    await fileStore.saveCampaignParticipants(participants)
  }
  if (isFinish) {
    campaign.status = 'Terminée'
    campaign.endAt = new Date()
    await saveCampaign(campaign)
    await fileStore.saveCampaign(campaign)
  }
}

export default processCampaign
