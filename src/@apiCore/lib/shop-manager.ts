// lib/shop-manager.ts
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WAMessage,
  MessageUpsertType,
  fetchLatestBaileysVersion,
  proto,
  delay,
  downloadMediaMessage,
  Contact,
  getAggregateVotesInPollMessage,
  decryptPollVote
} from 'baileys'
import NodeCache from 'node-cache'
import { Boom } from '@hapi/boom'
import { EventEmitter } from 'events'
import P from 'pino'
import Shop from 'src/@apiCore/models/shop'
import User from 'src/@apiCore/models/user'
import Product from 'src/@apiCore/models/product'
import Zone from 'src/@apiCore/models/zone'
import Order from 'src/@apiCore/models/order'
import DeliveryPricing from 'src/@apiCore/models/deliveryPricing'
import OpenAI from 'openai'
import moment from 'moment'
import dbConnect from 'src/@apiCore/lib/mongodb'
import mongoose from 'mongoose'
import { sendOrderNotification, sendPushNotificationToUser, uploadFileWithFormidable1 } from '../helpers'
import { messages } from '../helpers/messages'
import { handleCreateNotif } from '../npoints'
import fs from 'fs'
import os from 'os'
import path from 'path'
import Appointment from '../models/appointment'
import { Mutex } from 'async-mutex'
import { createFileStore } from './file-store'

type ShopClient = {
  socket: ReturnType<typeof makeWASocket>
  connections: Set<string> // User IDs
  status: 'disconnected' | 'connecting' | 'connected' | 'logout'
  qr?: string
  code?: string
  shopData?: any
  contacts?: Contact[]
}

class ShopManager extends EventEmitter {
  private static instance: ShopManager
  private clients = new Map<string, ShopClient>() // shopId -> Client
  private localStorage = require('node-persist')
  private logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('bots/logs.txt'))
  private openai = new OpenAI()
  private historyRequests = new Map<string, { resolve: Function; reject: Function }>()
  private activeRuns = new Map<string, number>() // Map<`${shopId}_${remoteJid}`, timestamp>
  private activeRunsMutex = new Mutex()
  private messageCache = new NodeCache({ stdTTL: 300, useClones: false, deleteOnExpire: true, checkperiod: 60 })
  private cacheMutex = new Mutex()
  private responseCache = new NodeCache({ stdTTL: 600, useClones: false, deleteOnExpire: true, checkperiod: 60 }) // 10 minutes
  private stopMessages = [
    'ok',
    'okay',
    'allrigth',
    'merci',
    "d'accord",
    'thank',
    'merci bien',
    'compris',
    "j'ai compris"
  ]
  private constructor() {
    super()
    this.logger.level = 'fatal'
    dbConnect()
    this.localStorage.init({ dir: './storage' })
    this.on('notification', async (id, title, message) => {
      console.log('[Notification] ID:', id)
      // const client = this.clients.get(id);
      const client: ShopClient = await this.getSavedClient(id)
      console.log('[Notification] Client trouvé:', client)

      if (client) {
        this.sendOtherNotification(id, title, message, client.socket)
      } else {
        console.error('[Notification] Client non trouvé pour ID:', id)
      }
    })
  }

  static getInstance(): ShopManager {
    if (!ShopManager.instance) {
      ShopManager.instance = new ShopManager()
    }
    return ShopManager.instance
  }

  async getOrCreateClient(shopId: string, phone?: string, checkCode?: Boolean) {
    const client = this.clients.has(shopId) ? this.clients.get(shopId)! : null
    if (!this.clients.has(shopId) || (client && client.status == 'disconnected') || checkCode) {
      const { state, saveCreds } = await useMultiFileAuthState(`bots/auths/${shopId}`)
      const msgRetryCounterCache = new NodeCache()
      const fileStore = await createFileStore(shopId)
      const { version } = await fetchLatestBaileysVersion()

      const client = makeWASocket({
        version,
        // logger: this.logger,
        auth: state,
        printQRInTerminal: false,
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        qrTimeout: phone ? 180000 : 30000,
        syncFullHistory: true,
        defaultQueryTimeoutMs: 180000,
        maxMsgRetryCount: 5,
        
      })

      const shopClient: ShopClient = {
        socket: client,
        connections: new Set([shopId]),
        status: 'disconnected'
      }
      this.clients.set(shopId, shopClient)
      this.setupEventListeners(shopId, phone, client, saveCreds, fileStore)
    } else {
      const client = this.clients.get(shopId)!
      client.connections.add(shopId)
      // Émettre un événement pour notifier les changements
      this.emit('shopClientUpdate', shopId, client)
    }
    return this.clients.get(shopId)!
  }

  getClient(shopId: string) {
    return this.clients.get(shopId)!
  }

  getClients() {
    return this.clients
  }

  private setupEventListeners(
    shopId: string,
    phone,
    client: ReturnType<typeof makeWASocket>,
    saveCreds: () => Promise<void>,
    fileStore
  ) {
    //connection
    client.ev.on('connection.update', async update => {
      const shopClient = this.clients.get(shopId)
      if (!shopClient) return

      if (update.qr) {
        shopClient.qr = update.qr
        shopClient.status = 'connecting'
        if (phone && !client.authState.creds.registered) {
          // todo move to QR event

          const phoneNumber = phone
          const code = await client.requestPairingCode(phoneNumber).catch(err => {
            console.log('err', err)
          })
          if (code) {
            shopClient.code = code
          }
        }
        this.localStorage.setItem(shopId + '_qr_code', update.qr)

        // Émettre un événement pour notifier les changements
        this.emit('shopClientUpdate', shopId, shopClient)
      }

      if (update.connection === 'open') {
        shopClient.status = 'connected'
        shopClient.qr = undefined
        this.localStorage.setItem(shopId + '_scan_ok', 'ok')
        this.emit('shopClientUpdate', shopId, shopClient)
      }

      if (update.connection === 'close') {
        let shouldReconnect =
          (update.lastDisconnect?.error as Boom)?.output?.statusCode != DisconnectReason.loggedOut &&
          (update.lastDisconnect?.error as Boom)?.output?.statusCode != DisconnectReason.connectionReplaced
        const connectionReplaced =
          (update.lastDisconnect?.error as Boom)?.output?.statusCode == DisconnectReason.connectionReplaced
        console.log('connection closed due to ', update.lastDisconnect?.error, ', reconnecting ', shouldReconnect)
        const timedOut =
          shopClient.status === 'connecting' &&
          (update.lastDisconnect?.error as Boom)?.output?.statusCode == DisconnectReason.timedOut

        if (
          (update.lastDisconnect?.error as Boom)?.output?.statusCode == DisconnectReason.loggedOut ||
          (update.lastDisconnect?.error as Boom)?.output?.statusCode == 405
        ) {
          try {
            if (fs.existsSync(`bots/auths/${shopId}`))
              fs.rmSync(`bots/auths/${shopId}`, { recursive: true, force: true })
            shouldReconnect = true
            shopClient.status = 'logout'
          } catch (err) {
            console.log(err)
          }
        }
        this.handleConnectionError(shopId, shouldReconnect, timedOut)
        if (connectionReplaced) {
          shopClient.status = 'connected'
          shopClient.qr = undefined
          this.emit('shopClientUpdate', shopId, shopClient)
        }
      }

      //   this.broadcastStatus(shopId);
      await fileStore.saveTrace({ shopId, date: new Date() })
    })

    //Credentials
    client.ev.on('creds.update', saveCreds)

    //Messages
    client.ev.on('messages.upsert', async m => this.handleMessages(m, shopId, client, fileStore))

    client.ev.on('messaging-history.set', async m => {
      try {
        const { messages, syncType, contacts, chats } = m
        console.log('messages.', messages.length)
        console.log('contacts', contacts.length)
        console.log('chats', chats.length)
        if (chats.length)
          await fileStore.saveChat(
            chats.map(chat => ({
              jid: chat.id,
              name: chat.name,
              unreadCount: chat.unreadCount,
              conversationTimestamp: chat.conversationTimestamp,
              participants: [] // on remplira après si groupe
            }))
          )
        for (const chat of chats) {
          // Si c’est un groupe, collecter les membres

          if (chat?.id?.endsWith('@g.us')) {
            client
              .groupMetadata(chat.id)
              .then(async groupMeta => {
                for (const p of groupMeta.participants) {
                  await fileStore.addParticipantToGroup(chat.id, {
                    jid: p.id,
                    isAdmin: p.admin === 'admin' || p.admin === 'superadmin'
                  })
                }
              })
              .catch(() => {})
          }
        }
        if (contacts.length) await fileStore.saveContact(contacts)
        // for (const c of messages) await fileStore.saveMessage({ id: c.key?.id, ...c })
      } catch (err) {
        console.log('error errr', err)
      }
    })

    client.ev.on('contacts.upsert', async contacts => {
      if (contacts.length) await fileStore.saveContact(contacts)
    })

    client.ev.on('presence.update', async val => {
      if (val) await fileStore.saveTrace({ shopId, date: new Date() })
    })

    client.ev.on('chats.upsert', async chats => {
      if (chats.length)
        await fileStore.saveChat(
          chats.map(chat => ({
            jid: chat.id,
            name: chat.name,
            unreadCount: chat.unreadCount,
            conversationTimestamp: chat.conversationTimestamp,
            participants: [] // on remplira après si groupe
          }))
        )
      for (const chat of chats) {
        // Si c’est un groupe, collecter les membres
        if (chat?.id?.endsWith('@g.us')) {
          client
            .groupMetadata(chat.id)
            .then(async groupMeta => {
              for (const p of groupMeta.participants) {
                await fileStore.addParticipantToGroup(chat.id, {
                  jid: p.id,
                  isAdmin: p.admin === 'admin' || p.admin === 'superadmin'
                })
              }
            })
            .catch(() => {})
        }
      }
      await fileStore.saveTrace({ shopId, date: new Date() })
    })

    client.ev.on('messages.update', async event => {
      for (const { key, update } of event) {
        const message = await fileStore.getMessage(key.id + '')
        if (message) await fileStore.saveMessage({ ...message, ...update })
      }
    })

    client.ev.on('group-participants.update', async group => {
      console.log('group', group)
      const localGroup: any = await fileStore.getChat(group.id)
      if ((group.action == 'add' || group.action == 'promote' || group.action == 'demote') && localGroup) {
        let participants = localGroup?.participants || []
        for (let participant of group.participants) {
          if (group.action == 'add') participants.push({ jid: participant, isAdmin: false })
          else
            participants = participants.map(p =>
              p.jid == participant ? { ...p, isAdmin: group.action == 'promote' } : p
            )
        }
        localGroup.participants = participants
        await fileStore.saveChat([localGroup])
      }
    })
  }

  async fetchHistoryWithTimeout(limit: number, key: proto.IMessageKey, timestamp: number | Long, shopId: string) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(null)
        console.log('Timeout après 30 secondes')
        // this.historyRequests.delete(key.id!)
      }, 10000)

      this.historyRequests.set(key.id!, {
        resolve: (messages: any) => {
          clearTimeout(timeout)
          resolve(messages)
        },
        reject: (error: Error) => {
          clearTimeout(timeout)
          resolve(error)
        }
      })

      this.clients
        .get(shopId)
        ?.socket.fetchMessageHistory(limit, key, timestamp)
        .then(val => {
          console.log('val', val)
        })
      this.clients
        .get(shopId)
        ?.socket?.ws?.send(JSON.stringify({ type: 'query', epoch: '1', data: ['message', 'chat', 'contact'] }))
    })
  }
  //Handle error
  private handleConnectionError(shopId: string, shouldReconnect: Boolean, timedOut: Boolean) {
    const client = this.clients.get(shopId)
    if (!client) return

    client.status = 'disconnected'

    if (!shouldReconnect) {
      this.cleanupShop(shopId)
    }

    if (timedOut) {
      this.emit('shopClientUpdate', shopId, client)
    }

    // Reconnexion automatique progressive
    setTimeout(() => {
      if (client.connections.size > 0 && shouldReconnect) {
        this.getOrCreateClient(shopId)
      }
    }, 3000)
  }

  async cleanupShop(shopId: string) {
    const client = this.clients.get(shopId)
    if (client) {
      // client.socket.logout()
      await this.localStorage.setItem(`shop_${shopId}`, '')
      this.clients.delete(shopId)
    }
  }

  private handleMessages = async (
    data: {
      messages: WAMessage[]
      type: MessageUpsertType
      requestId?: string
    },
    shopId: string,
    client: ReturnType<typeof makeWASocket>,
    fileStore
  ) => {
    const { messages, type } = data
    if (messages.length > 0 && messages[0]?.key?.remoteJid && messages[0]?.key?.remoteJid?.split('@')[0]?.length > 16)
      return
    if (type === 'notify' && messages.length && !messages.find(message => message.message?.pollUpdateMessage)) {
      const shop = await this.getShop(shopId, fileStore)
      if (!shop) return
      for (const message of messages) {
        const messageId = shopId + message.key.id!

        let shouldProcess = false
        await this.cacheMutex.runExclusive(async () => {
          if (!this.messageCache.has(messageId)) {
            this.messageCache.set(messageId, true)
            shouldProcess = true
          }
        })

        // 2. Traitement des messages envoyés par l'assistant (fromMe)
        if (message.key.fromMe && !message.key.participant) {
          const fullText = await this.getMessageText(message)
          const isSubscribe = await this.isSubscribe(shop, fileStore)
          if (fullText.startsWith('/') && shop && isSubscribe) {
            let userThread = await this.setUserThread(message.key.remoteJid?.split('@')[0], fullText, fileStore, shop)
            if (fullText == '/recap') {
              const contact: any = {
                phone: message.key.remoteJid?.split('@')[0],
                name: message.pushName
              }
              await this.sendMessageToThread(
                message,
                'Envoie moi le recapitulatif texte de ma commande en cours',
                userThread,
                'assistant',
                shop
              )
              this.run(shop, userThread, message.key.remoteJid, contact, true, client)
            } else if (fullText == '/pl') {
              await this.setContinue(message.key.remoteJid?.split('@')[0], fileStore, shop)
            } else if (userThread) {
              await this.sendMessageToThread(message, fullText, userThread, 'assistant', shop)
            }
          } else {
            let userThread = await this.getUserThread(message.key.remoteJid?.split('@')[0], fileStore, shop)

            if (userThread && fullText) {
              await this.sendMessageToThread(message, fullText, userThread, 'assistant', shop)
            }
          }
        }

        // 3. Traitement des messages reçus (non fromMe)
        if (
          !message.key.fromMe &&
          (!message.key.participant || message.key.participant == undefined) &&
          shouldProcess &&
          message.message?.protocolMessage?.type !== proto.Message.ProtocolMessage.Type.STATUS_MENTION_MESSAGE &&
          message.message?.protocolMessage?.type !== proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION
        ) {
          const isSubscribe = await this.isSubscribe(shop, fileStore)
          let fullText = await this.getMessageText(message)
          console.log('Texte complet du message:', JSON.stringify(message))
          const contact: any = {
            phone: message.key.remoteJid?.split('@')[0],
            name: message.pushName
          }
          let allLastMessages: any = {}
          let userThread = await this.getUserThread(contact.phone, fileStore, shop)

          if (userThread) {
            fullText = await this.sendMessageToThread(
              message,
              fullText,
              userThread,
              'user',
              shop,
              isSubscribe,
              shop.active
            )
          }
          const currentTime = Date.now()
          allLastMessages[contact.phone] = {
            body: fullText,
            timestamp: currentTime
          }
          let isInContact = false
          if (shop.responseTo == 'no_contact') isInContact = await this.isContact(message.key.remoteJid, fileStore)

          if (
            shop &&
            shop.active &&
            shop.isScan &&
            shop.assistantId &&
            userThread &&
            isSubscribe &&
            allLastMessages[contact.phone] &&
            allLastMessages[contact.phone].timestamp === currentTime &&
            !userThread.stop && //when stop conversion
            (!userThread.pause ||
              (userThread.pause && userThread.time && moment().diff(moment(userThread.time), 'minutes') >= 30)) &&
            (shop.responseTo == 'all' || (shop.responseTo == 'no_contact' && !isInContact))
          ) {
            if (!this.stopMessages.find(v => v == fullText?.toLowerCase())) {
              await delay((shop?.waitingTime || 10) * 1000)
              await this.run(shop, userThread, message.key.remoteJid, contact, false, client)
            }
          }
        }
      }
    } else if (type === 'notify' && messages.length && messages.find(message => message.message?.pollUpdateMessage)) {
      const sessionId = client.user?.id?.split(':')[0]
      for (const message of messages) {
        const voteUpdate = messages[0].message?.pollUpdateMessage
        const originalPoll = await fileStore.getMessage(voteUpdate?.pollCreationMessageKey?.id + '')
        if (voteUpdate && voteUpdate.vote && originalPoll?.message.messageContextInfo?.messageSecret) {
          try {
            if (message.message) {
              const decrypted = await decryptPollVote(voteUpdate.vote, {
                pollCreatorJid: sessionId + '@s.whatsapp.net',
                voterJid: message.key.remoteJid + '',
                pollMsgId: voteUpdate.pollCreationMessageKey?.id || originalPoll.id,
                pollEncKey: this.base64ToUint8Array(
                  originalPoll?.message.messageContextInfo?.messageSecret?.buffer?.toString('base64')
                )
              })

              if (decrypted) {
                const votes = getAggregateVotesInPollMessage({
                  message: originalPoll.message,
                  pollUpdates: [{ vote: decrypted }]
                })
                fileStore.saveMessage({ ...originalPoll, votes, isRespond: true })
                break
              }
            }
          } catch (err) {
            console.log('err', err)
          }
        }
      }
    }

    //Vérifié s'il y à les messages non repondu et les marqué comme repondu
    if (!messages[0].key.fromMe) {
      const unRespondMessages = await fileStore.getUnrespondMessages(messages[0].key.remoteJid + '')
      if (unRespondMessages.length)
        for (let message of unRespondMessages) {
          await fileStore.saveMessage({
            ...message,
            isRespond: !message.isRespond ? type == 'notify' : true,
            status: 4
          })
        }
    }
    await fileStore.saveTrace({ shopId, date: new Date() })
  }

  private createStream = async (shop, contact, userThread) => {
    let stream: any = null
    if (shop.model) {
      const config: any = {
        conversation: userThread.threadId,
        stream: true,
        input: '  '
      }
      if (shop.prompt_id) {
        config.prompt = { id: shop.prompt_id }
      } else {
        config.instructions =
          shop.instructions + `Numéro de téléphone du client:${contact.phone}; Date et heure du jour: ${moment()}`
        config.tools = [{ type: 'file_search', vector_store_ids: [shop.assistantFileId] }]

        if (shop.verbosity) {
          config.text = { verbosity: shop.verbosity }
        }
        if (shop.effort) {
          config.reasoning = { effort: shop.effort }
        }

        if (!shop.effort && !shop.verbosity) {
          config.temperature = 0.2
        }
        config.model = shop.model
      }
      stream = await this.openai.responses.create(config).catch(err => console.log('run error', err))
    } else if (shop?.type == 'service' && !shop?.dontSearch) {
      stream = await this.openai.beta.threads.runs
        .create(userThread.threadId, {
          assistant_id: shop.assistantId,
          stream: true,
          additional_instructions: `Numéro de téléphone du client:${contact.phone}; Date et heure du jour: ${moment()}`,
          tool_choice: { type: 'file_search' }
        })
        .catch(err => console.log('run error', err))
    } else {
      stream = await this.openai.beta.threads.runs
        .create(userThread.threadId, {
          assistant_id: shop.assistantId,
          stream: true,
          additional_instructions: `Numéro de téléphone du client:${contact.phone}; Date et heure du jour: ${moment()}`
        })
        .catch(err => console.log('run error', err))
    }
    return stream
  }

  private createStreamOrder = async (shop, contact, userThread) => {
    let stream: any = null
    if (shop.model) {
      stream = await this.openai.responses
        .create({
          conversation: userThread.threadId,
          model: 'gpt-4o-mini',
          stream: true,
          instructions: `Recapitulez la dernière commande en JSON : {"pdts":[{"id":"(champs _id du produit commandé)", productName:"(Nom du produit commandé)", "price":(prix),"quantity":(quantité)}],"orderTotal":(total de la commande),"dev":{"address":"(adresse)","city":"(ville)","date":"(YYYY-MM-DD H:m:i) date de livraison", phone: "${
            contact.phone
          } ou le numéro que le client à précisé", type:"type de commande (livraison ou expedition)", "note": "Note complémentaire(heure de livraison ou l'urgence si c'est mentioné)", cost: "Les frais de livraison si c'est specifié", "orderId": "L'id de la commande en cours(Laisse le vide si on ne te l'a pas donné))"}}. Date courante : ${moment()} Note: Cherche les id des produits commandés dans le fichier. S'il s'agit d'une modification renvoie en plus l'orderId qui est l'id de la commande en cours.`,
          tools: [{ type: 'file_search', vector_store_ids: [shop.assistantFileId] }]
        })
        .catch(err => console.log('run error', err))
    } else
      stream = await this.openai.beta.threads.runs.create(userThread.threadId, {
        assistant_id: shop.assistantId,
        stream: true,
        tool_choice: { type: 'file_search' },
        model: 'gpt-4o-mini',
        instructions: `Recapitulez la dernière commande en JSON : {"pdts":[{"id":"(champs _id du produit commandé)", productName:"(Nom du produit commandé)", "price":(prix),"quantity":(quantité)}],"orderTotal":(total de la commande),"dev":{"address":"(adresse)","city":"(ville)","date":"(YYYY-MM-DD H:m:i) date de livraison", phone: "${
          contact.phone
        } ou le numéro que le client à précisé", type:"type de commande (livraison ou expedition)", "note": "Note complémentaire(heure de livraison ou l'urgence si c'est mentioné)", cost: "Les frais de livraison si c'est specifié", "orderId": "L'id de la commande en cours(Laisse le vide si on ne te l'a pas donné))"}}. Date courante : ${moment()} Note: Cherche les id des produits commandés dans le fichier. S'il s'agit d'une modification renvoie en plus l'orderId qui est l'id de la commande en cours.`
      })
    return stream
  }

  private run = async (
    shop: any,
    userThread: any,
    remoteJid: string | null | undefined,
    contact: any,
    isOrder?: Boolean,
    client?: ReturnType<typeof makeWASocket>
  ) => {
    const client1 = this.clients.get(shop?._id)
    const chat = client || client1?.socket
    try {
      if (chat && remoteJid) {
        // Vérification cache de réponse pour éviter les réponses identiques

        await chat.presenceSubscribe(remoteJid)

        await chat.sendPresenceUpdate('composing', remoteJid)

        //Create run
        const stream = await this.createStream(shop, contact, userThread)

        if (stream)
          for await (const event of stream) {
            if (
              event.event === 'thread.message.completed' ||
              (shop.model && event.type === 'response.output_text.done')
            ) {
              if ((event.data?.content?.length && event.data.content[0].type == 'text') || (shop.model && event.text)) {
                const data: any = this.getData(event?.data?.content[0]?.text?.value || event.text)
                const responseKey = `${shop._id}_${remoteJid}_response`
                const lastResponse: string = this.responseCache.get(responseKey) || ''
                // Vérifier si cette réponse n'a pas déjà été envoyée récemment
                const similarity = this.similarityPercentage(lastResponse, data.texte)
                if (similarity > 70) {
                  const threadMessages = await this.openai.beta.threads.messages.list(userThread.threadId, { limit: 2 })
                  if (!threadMessages.data?.find(v => v.role == 'user')) {
                    console.log('Réponse identique ignorée pour', remoteJid)
                    continue
                  }
                }

                // Stocker le hash de la réponse
                this.responseCache.set(responseKey, data.texte)

                if (data.images && data.images.length) {
                  if (data.images.length > 1) {
                    for (let image of data.images) {
                      if (image && image.includes('cloudinary'))
                        await chat
                          .sendMessage(remoteJid, {
                            image: { url: image }
                          })
                          .catch(err => console.log('error message', err))
                    }
                    await chat.sendMessage(remoteJid, { text: data.texte })
                  } else {
                    if (data.images[0].includes('cloudinary'))
                      await chat
                        .sendMessage(remoteJid, {
                          image: { url: data.images[0] },
                          caption: data.texte
                        })
                        .catch(async err => {
                          console.log('error message', err)
                          await chat.sendMessage(remoteJid, { text: data.texte })
                        })
                    else await chat.sendMessage(remoteJid, { text: data.texte })
                  }
                } else {
                  await chat.sendMessage(remoteJid, { text: data.texte })
                }
                //capture Order
                if (data.order?.isOrder) {
                  await this.sendMessageToThread(
                    null,
                    'Recapitule la dernière commande en JSON',
                    userThread,
                    'user',
                    shop
                  )

                  const stream1 = await this.createStreamOrder(shop, contact, userThread)

                  for await (const event1 of stream1) {
                    if (
                      event1.event == 'thread.message.completed' ||
                      (shop.model && event.type === 'response.output_text.done')
                    ) {
                      if ((event1.data?.content?.length && event1.data.content[0].type == 'text') || event.text) {
                        const orderData: any = this.getData(event1.data?.content[0]?.text?.value || event.text)
                        console.log('orderData', orderData)
                        this.createOrder(orderData, shop, remoteJid, contact, chat, userThread)
                      }
                    }
                  }
                } else if (data.order && data.order.pdts && data.order.dev)
                  this.createOrder(data, shop, remoteJid, contact, chat, userThread)
                else if (data.order?.isAppointment || data.order?.type == 'rdv' || data.order?.type == 'reservation') {
                  this.createAppointment(data, shop, remoteJid, contact, chat, userThread)
                }

                await chat.sendPresenceUpdate('paused', remoteJid)
              }
            }
          }
      } else {
        console.log('no chat or remotejid', chat, remoteJid)
      }
    } catch (error) {
      console.error('Erreur lors du traitement:', error)
    } finally {
      if (chat && remoteJid) await chat.sendPresenceUpdate('paused', remoteJid)
    }
  }

  base64ToUint8Array = base64 => {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  private createOrder = async (
    orderData: any,
    shop: any,
    remoteJid: string,
    contact: any,
    chat: any,
    userThread: any
  ) => {
    if (orderData.order && orderData.order.dev?.address && orderData.order?.orderTotal) {
      let user = await User.findOne({ phone: contact.phone })
      if (!user) {
        const image = await chat.profilePictureUrl(remoteJid, 'image')
        user = await User.create({
          phone: contact.phone,
          name: contact.name,
          role: 'customer',
          image: image || '/images/avatars/1.png'
        })
      }

      //Search zone
      const partialAddress = orderData.order.dev?.address
      let zone: any = null
      let zones = await Zone.find({
        $text: {
          $search: partialAddress,
          $caseSensitive: false,
          $diacriticSensitive: false
        }
      })
      if (zones.length == 1) zone = zones[0]
      else if (zones.length > 1) {
        zone = zones.find(item =>
          item.description
            ?.split(',')
            ?.find(
              v =>
                v.toLowerCase() == partialAddress?.toLowerCase() ||
                this.isHightZone(v, partialAddress, item.description?.split(','))
            )
        )
        if (!zone) zone = zones[0]
      }

      const productPromises: any = []
      const items = orderData.order?.pdts?.map(item => ({
        product: item.id,
        productName: item.productName,
        quantity: item.quantity || 1,
        total: item.price
      }))
      let index = 1
      for (let product of items) {
        let queryData: any = this.isValidObjectId(product.product)
          ? { _id: product.product }
          : {
              $text: {
                $search: product.productName,
                $caseSensitive: false,
                $diacriticSensitive: false
              }
            }

        queryData.$or = [{ isDelete: false }, { isDelete: { $exists: false } }]
        const prods = await Product.find(queryData)
        let pro =
          prods.length == 1
            ? prods[0]
            : prods.find(item => item.name?.toLowerCase() == product.productName?.toLowerCase())
        if (!pro && prods.length) pro = prods.find(item => this.isHightProduct(item.name, product.productName, prods))
        const prod = pro ? pro.toObject() : { name: product.productName }

        productPromises.push({
          product: prod,
          quantity: product.quantity,
          id: index,
          total: product.total
        })
        index++
      }
      let company: any = null
      let driver: any = null
      //Search company
      if (shop && shop.send && zone) {
        const queryData = {
          zone: zone._id
        }
        const queryData1 = {
          zones: { $in: [zone._id] },
          shops: { $in: [shop._id] },
          role: 'livreur'
        }
        const shopIds = [shop].map(v => new mongoose.Types.ObjectId(v._id))
        queryData['deliveryCompany.shops'] = { $in: shopIds }
        queryData['deliveryCompany.deletedAt'] = false
        let data: any = [
          { $sort: { price: 1 } },
          {
            $lookup: {
              from: 'deliverycompanies',
              localField: 'deliveryCompany',
              foreignField: '_id',
              as: 'deliveryCompany'
            }
          },
          {
            $match: queryData
          }
        ]
        const pricings = await DeliveryPricing.aggregate(data)
        company = pricings?.[0]?.deliveryCompany?.[0]

        if (!company) {
          const users = await User.find(queryData1)

          if (users && users.length === 1) {
            driver = users[0]
          } else if (users && users.length > 1) {
            const randomIndex = Math.floor(Math.random() * users.length)
            driver = users[randomIndex]
          } else {
            driver = null // Ou toute autre gestion en cas d'absence d'utilisateurs
          }
        }
      }

      if (items && items.length) {
        //create Order

        const OrderData: any = {
          shop: shop._id,
          customer: user._id,
          stocks: productPromises,
          total: orderData.order?.orderTotal,
          status: 'En attente',
          date: new Date(orderData.order?.dev?.date),
          deliveryDate: new Date(orderData.order?.dev?.date),
          deliveryInfo: orderData.order?.dev,
          canal: 'assistant',
          note: orderData.order?.dev?.note,
          city: orderData.order?.dev?.city,
          adress: orderData.order.dev?.address,
          phone: (orderData.order.dev?.phone || user?.phone)?.startsWith('+')
            ? orderData.order.dev?.phone || user?.phone
            : '+' + (orderData.order.dev?.phone || user?.phone),
          type: orderData.order.dev?.type || 'livraison'
        }
        if (company) OrderData.company = company?._id
        if (driver) OrderData.driver = driver?._id

        let order: any = null
        const orderId =
          orderData.order?.dev?.orderId ||
          orderData.order?.orderId ||
          (orderData.order?.dev?.orderIds?.length && orderData.order?.dev?.orderIds[0]) ||
          ''
        if (this.isValidObjectId(orderId)) {
          order = await Order.updateOne({ _id: orderId }, { $set: OrderData })
        } else order = await Order.create(OrderData)
        console.log('order', order)
        if (order && order.total) {
          //send notification
          this.sendNotification(shop, user, chat, order, company, driver).catch(() => {})
          this.sendOpenAIMessage(order, userThread)

          // //Add label to chat
          // let labels = await client.getLabels()
          // let label = labels.find(
          //   item =>
          //     item.name.toLowerCase() == 'nouvelle commande' || item.name.toLowerCase() == 'new order'
          // )
          // if (label) chat.changeLabels([label.id])

          //Optimize facebook add
          // if (shop.pixelId && shop.adToken) adData(shop.pixelId, shop.adToken, user.phone, order.total)
        }
      }
    }
  }

  private createAppointment = async (
    orderData: any,
    shop: any,
    remoteJid: string,
    contact: any,
    chat: any,
    userThread: any
  ) => {
    const rdv = orderData.order
    if (rdv) {
      let user = await User.findOne({ phone: contact.phone })
      if (!user) {
        const image = await chat.profilePictureUrl(remoteJid, 'image')
        user = await User.create({
          phone: contact.number,
          name: rdv.nom || contact.name,
          role: 'customer',
          image: image || '/images/avatars/1.png'
        })
      }

      //create Order
      const OrderData: any = {
        shop: shop._id,
        user: user._id,
        status: 'En attente',
        date: rdv?.date ? new Date(rdv.date) : new Date(rdv.date),
        time: rdv.heure,
        motif: rdv.motif,
        nom: rdv.nom,
        description: rdv.description,
        phone: rdv.phone || user?.phone,
        adresse: rdv.adresse,
        type: rdv.type || 'rdv'
      }

      let order: any = null
      const orderId = rdv?.rdvId
      if (this.isValidObjectId(orderId)) {
        order = await Appointment.updateOne({ _id: orderId }, { $set: OrderData })
      } else order = await Appointment.create(OrderData)
      if (order) {
        //send notification
        this.sendApointmentNotification(shop, user, chat, order).catch(() => {})
        this.sendOpenAIMessage(order, userThread)
      }
    }
  }

  private async sendOpenAIMessage(order, userThread) {
    let count = 0
    while (true) {
      try {
        count++
        await this.openai.beta.threads.messages.create(userThread.threadId, {
          role: 'assistant',
          content: `Voici l'OrderId de la commande en cours: ${order._id}`
        })
        console.log('Message envoyé avec succès !')
        break // Sort de la boucle si l'envoi réussit
      } catch (error) {
        if (count >= 5) break
        console.error("Échec de l'envoi, nouvelle tentative...", error)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Pause avant de réessayer
      }
    }
  }

  private isValidObjectId = id => {
    // Exclure les valeurs nulles, vides ou déguisées
    if (!id || typeof id !== 'string' || ['null', 'undefined', 'N/A', 'na', 'none'].includes(id.trim().toLowerCase())) {
      return false
    }

    // Vérifie la forme d’un ObjectId standard (24 caractères hexadécimaux)
    const isValidHex = /^[a-fA-F0-9]{24}$/.test(id)
    if (!isValidHex) return false

    // Utilise mongoose pour vérifier structurellement
    if (!mongoose.Types.ObjectId.isValid(id)) return false

    // Optionnel : Rejeter des ID "vides", ex: 000...0
    if (new mongoose.Types.ObjectId(id).toString() === '000000000000000000000000') {
      return false
    }

    return true
  }
  private getData(text) {
    let purifiedText = text.trim() // Texte purifié par défaut
    let images = []
    let order: any = null

    // Recherche du début et de la fin du bloc JSON
    const jsonStartIndex = text.indexOf('```json')

    // Si un bloc JSON est trouvé
    if (jsonStartIndex !== -1) {
      const jsonEndIndex = text.indexOf('```', jsonStartIndex + 1)

      // Récupère le texte avant le bloc JSON
      purifiedText = text.substring(0, jsonStartIndex).trim()

      // Si la dernière ligne avant le bloc JSON se termine par ":",
      // alors supprime cette ligne également
      const lines = purifiedText.split('\n')
      const lastLine = lines[lines.length - 1].trim()
      if (lastLine.endsWith(':')) {
        lines.pop()
        purifiedText = lines.join('\n').trim()
      }

      // Récupère le texte après le bloc JSON
      const textAfterJson = text.substring(jsonEndIndex + 3).trim()

      purifiedText += '\n' + textAfterJson // Ajoute le texte après le bloc JSON
      try {
        // Analyse le JSON extrait
        const jsonString = text.substring(jsonStartIndex + 8, jsonEndIndex).trim()
        console.log('JSON extrait :', jsonString)
        order = JSON.parse(jsonString)
      } catch (error) {
        if (text.includes(`isOrder`)) {
          order = { isOrder: true }
          purifiedText = text
            .split('\n')
            .filter(line => !line.match(/isOrder/))
            .join('\n')
        }
      }
    } else if (text.includes(`isOrder`)) {
      order = { isOrder: true }
      purifiedText = text
        .split('\n')
        .filter(line => !line.match(/isOrder/))
        .join('\n')
    }

    // rechercher les URLs des images dans le texte
    const imagesMatch = purifiedText.match(/!\[.*?\]\((.*?)\)/g)
    if (imagesMatch) {
      images = imagesMatch.map(image => image.match(/!\[.*?\]\((.*?)\)/)[1])

      // Supprimer les sauts de ligne avant et après le bloc d'images
      purifiedText = purifiedText.replace(/(^|\n).*?!\[.*?\]\(.*?\).*?\n/g, '')

      purifiedText = purifiedText.replace(/(^|\n)!\[.*?\]\(.*?\)\n/g, '')

      // Supprimer toutes les occurrences d'images du texte purifié final
      purifiedText = purifiedText.replace(/!\[.*?\]\((.*?)\)/g, '')
    }

    // Remplacer les occurrences de "**" par "*"
    purifiedText = purifiedText.replace(/\*\*/g, '*')
    purifiedText = purifiedText.replace(/\#\#\#/g, '')
    purifiedText = purifiedText.replace(/【\d+:\d+†[^\】]+】/g, '')
    purifiedText = purifiedText.replace(/^.*json.*$\n?/gim, '')
    let lignes = purifiedText.split('\n')

    // Filtre les lignes pour exclure celle contenant "Images : "
    purifiedText = lignes.filter(ligne => !ligne?.toLowerCase()?.includes('image')).join('\n')

    return { texte: purifiedText.trim(), order: order, images }
  }

  /**
   * Extrait le texte complet d'un message Baileys quel que soit son type.
   * @param message Le message de type WAMessage
   * @returns Le texte complet du message
   */
  private getMessageText = async (message: WAMessage): Promise<string> => {
    let text = ''

    // Message texte simple
    if (message.message?.conversation) {
      text = message.message.conversation
    }
    // Message texte étendu (parfois utilisé pour les réponses ou citations)
    else if (message.message?.extendedTextMessage) {
      text = message.message.extendedTextMessage?.text || ''

      //ads message and other external
      if (message.message?.extendedTextMessage?.contextInfo?.externalAdReply?.body)
        text +=
          ':' +
          (message.message?.extendedTextMessage?.contextInfo?.externalAdReply?.body ||
            message.message?.extendedTextMessage?.contextInfo?.externalAdReply?.title ||
            '')

      if (message.message?.extendedTextMessage?.description || message.message?.extendedTextMessage?.title)
        text +=
          ':' + (message.message.extendedTextMessage.description || message.message?.extendedTextMessage?.title || '')

      //quote message
      if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage
        text +=
          ':' +
          (quotedMessage?.imageMessage?.caption ||
            quotedMessage?.videoMessage?.caption ||
            quotedMessage.extendedTextMessage?.text ||
            quotedMessage.conversation ||
            '')
      }

      // remove link
      text = text
        .replace(/https?:\/\/\S+/g, '')
        .replace(/Lien\s*:\s*\n?/g, '')
        .replace(/Link\s*:\s*\n?/g, '')
        .trim()
    }
    // Message image avec légende
    else if (message.message?.imageMessage?.caption) {
      text = message.message.imageMessage.caption
    }
    // Message vidéo avec légende
    else if (message.message?.videoMessage?.caption) {
      text = message.message.videoMessage.caption
    }
    // Ajouter d'autres types de messages au besoin (ex: document, audio avec transcription, etc.)
    // const contextInfo =
    //   message.message?.extendedTextMessage?.contextInfo ||
    //   message.message?.imageMessage?.contextInfo ||
    //   message.message?.videoMessage?.contextInfo;

    // if (contextInfo && contextInfo.actionLink?.url) {
    //   // On concatène le lien présent dans le contexte
    //   text += ' ' + contextInfo.ctwaContext.sourceUrl;
    // }

    return text.trim()
  }

  //Send notification after order
  private sendNotification = async (shop, user, client, order, company, driver) => {
    const lang = shop.language || 'fr'
    let info = ''
    if (order.stocks) {
      for (let item of order.stocks) {
        info += `\n${item.quantity}x ${item?.product?.name}`
      }
    }
    const message = `*${messages[lang].notifTitle}*\n
  *${messages[lang].shop}*: ${shop?.name}\n
  *Produit*: ${info}
  ${order.deliveryInfo?.cost ? `*Livraison*: ${order.deliveryInfo?.cost}` : ''}
  *Total*:  ${order.total}
  ${user.name || user.first_name ? `*${messages[lang].name}:* ${user.name || user.first_name}` : ''}
  *Tel:* ${order.phone || user.phone}
  ${order.city || order.adress ? `*Adresse :* ${order.adress} ${order.city}` : ''}
  ${order.note ? `*Note :* ${order.note}` : ''}
 `

    const mailMessage = `<h2 style='text-align:center'>${messages[lang].notifTitle}</h2><br />
 <b>${messages[lang].shop}</b>: ${shop?.name}<br />
 <b>${messages[lang].orderInfo}</b>: ${info?.replace(/\*/g, '')?.replace(/\n/g, '<br />')}<br />
 <b>${messages[lang].clientInfo}</b>:<br />
 - ${messages[lang].name}: ${user.name || user.first_name}<br />
 - ${messages[lang].whatsapp}: ${user.phone}<br />
 <div>
  <a class="mail-btn" href='https://wa.me/${user.phone}'>${messages[lang].viewConversation}</a>
 </div>
`

    //Internal notification
    handleCreateNotif({
      title: messages[lang].notifTitle,
      shop: shop?._id,
      company: company?._id,
      driver: driver?._id,
      content: info,
      redirectionLink: '/app/orders/' + order?._id,
      read: false,
      label: messages[lang].viewOrder
    })

    //notify to whatsApp
    if (shop.notifyPhone && shop.notifyPhone.length >= 5) {
      const phone = await this.formaterNumber(shop.notifyPhone, client)
      client.sendMessage(phone, { text: message })
    }

    // if (shop.notifyGroup) {
    //   const chats = await client.getChats()
    //   const groupChat = chats.find(item => item.isGroup && item.name?.toLowerCase() == shop.notifyGroup?.toLowerCase())
    //   if (groupChat) groupChat.sendMessage(message1)
    // }

    //push Notification
    sendPushNotificationToUser('Nouvelle commande', message.replace(/\*/g, ''), shop?._id?.toString())
    if (company) {
      sendPushNotificationToUser('Nouvelle commande', message.replace(/\*/g, ''), '', company?._id?.toString())
    }
    if (driver) {
      sendPushNotificationToUser('Nouvelle commande', message.replace(/\*/g, ''), '', '', driver?._id?.toString())
    }
    //Notify to Email
    if (shop.notifyEmail) sendOrderNotification(shop.notifyEmail, mailMessage, shop?.name, messages[lang].notifTitle)
  }

  private sendApointmentNotification = async (shop, user, client, rdv) => {
    const lang = shop.language || 'fr'

    const message = `${rdv.type == 'rdv' ? 'Nouveau rendez-vous' : 'Nouvelle réservation'} 
  *${messages[lang].shop}*: ${shop?.name}\n${rdv.motif ? `*Motif :* ${rdv.motif}\n` : ''}${
      rdv.date ? `*Date :* ${moment(rdv.date).format('DD/MM/YYYY')}\n` : ''
    }${rdv.time ? `*Heure :* ${rdv.time}\n` : ''}${rdv.adresse ? `*Adresse :* ${rdv.adresse}\n` : ''}${
      rdv.nom ? `*Nom:* ${rdv.nom}\n` : ''
    }${rdv.phone ? `*Numéro de téléphone:* ${rdv.phone}` : ''}
    `

    //Internal notification
    handleCreateNotif({
      title: rdv.type == 'rdv' ? 'Nouveau rendez-vous' : 'Nouvelle réservation',
      shop: shop?._id,
      content: message.replace(/\*/g, ''),
      redirectionLink: '/app/apointment/' + rdv?._id,
      read: false,
      label: messages[lang].viewOrder
    })

    //notify to whatsApp
    if (shop.notifyPhone && shop.notifyPhone.length >= 5) {
      const phone = await this.formaterNumber(shop.notifyPhone, client)
      client.sendMessage(phone, { text: message })
    }
    //push Notification
    sendPushNotificationToUser(
      rdv.type == 'rdv' ? 'Nouveau rendez-vous' : 'Nouvelle réservation',
      message.replace(/\*/g, ''),
      shop?._id?.toString()
    )

    //Notify to Email
    if (shop.notifyEmail)
      sendOrderNotification(
        shop.notifyEmail,
        message.replace(/\*/g, ''),
        shop?.name,
        rdv.type == 'rdv' ? 'Nouveau rendez-vous' : 'Nouvelle réservation'
      )
  }

  //Send notification after order
  public sendOtherNotification = async (shopId, title, message, client) => {
    const fileStore = await createFileStore(shopId)
    const shop = await this.getShop(shopId, fileStore)
    if (shop) {
      //Internal notification
      handleCreateNotif({
        title: title,
        shop: shop?._id,
        content: message,
        read: false
      })

      //notify to whatsApp
      if (shop.notifyPhone && shop.notifyPhone.length >= 5) {
        const phone = await this.formaterNumber(shop.notifyPhone, client)
        client.sendMessage(phone, { text: message })
      }

      //Notify to Email
      if (shop.notifyEmail) sendOrderNotification(shop.notifyEmail, message, shop?.name, title)
    }
  }

  private formaterNumber = async (numero, client) => {
    // Supprimer le caractère "+"
    const numeroSansPlus = numero.replace('+', '')
    const result = await client.onWhatsApp(numeroSansPlus)

    if (result.length > 0) {
      return result[0].jid // Retourne le vrai numéro WhatsApp
    }
    const numeroFormate = numeroSansPlus.replace(/\s/g, '') + '@s.whatsapp.net'

    return numeroFormate
  }

  private sendMessageToThread = async (
    message: WAMessage | null,
    fullText: string,
    userThread: any,
    role = 'user',
    shop,
    isSubscribe = true,
    active = true
  ): Promise<string> => {
    // Initialisation de l'objet mediaData à null par défaut
    let mediaData: { type: string; file: Buffer; url?: string; caption?: string; mimeType?: string } | null = null
    let text = fullText
    // // Vérifier et traiter le cas d'une image
    if (message?.message?.imageMessage) {
      try {
        const buffer = await downloadMediaMessage(message, 'buffer', {})

        // Encoder en base64
        const base64Image = buffer.toString('base64')
        const mimeType = message.message?.imageMessage?.mimetype || 'image/jpeg'
        const dataUri = `data:${mimeType};base64,${base64Image}`

        // Appeler GPT-4o pour analyser l'image
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: "Retourne exactement le contenu important sur l'image sans faire de commentaire"
                },
                { type: 'image_url', image_url: { url: dataUri } }
              ]
            }
          ],
          max_tokens: 50
        })

        if (response.choices[0].message?.content) {
          text = response.choices[0].message.content
          mediaData = {
            type: 'file',
            file: buffer,
            caption: response.choices[0]?.message.content
          }
        }
      } catch (error) {
        console.error("Erreur lors du téléchargement de l'image :", error)
      }
    }
    // Vérifier et traiter le cas d'un audio (voice ou audio classique)
    else if (message?.message?.audioMessage && isSubscribe && active) {
      try {
        const buffer = await downloadMediaMessage(message, 'buffer', {})
        const filePath = await this.getFilePath(buffer)
        if (filePath) {
          const file: any = await fs.createReadStream(filePath)
          const transcription = await this.openai.audio.transcriptions.create({
            file: file,
            model: 'gpt-4o-mini-transcribe',
            language: 'fr'
          })
          if (transcription.text) {
            mediaData = {
              type: 'audio',
              file: buffer,
              caption: transcription.text
            }
            text = transcription.text
          }
          fs.unlinkSync(filePath)
        }
      } catch (error) {
        console.error("Erreur lors du téléchargement de l'audio :", error)
      }
    }

    // Construction du payload du message
    let payload: any = {
      role: role || 'user',
      content: []
    }
    if (fullText) {
      payload.content?.push({
        type: 'text',
        text: fullText
      })
    }

    if (mediaData && mediaData.caption) {
      payload.content.push({
        type: 'text',
        text: mediaData.caption
      })
    }

    // Envoi du message dans le thread via l'API OpenAI
    if (payload?.content?.length) this.addToThread(payload, userThread, shop)
    return text
  }
  private async addToThread(payload, userThread, shop) {
    let count = 0
    while (true) {
      try {
        count++
        if (shop.model) {
          await this.openai.conversations.items
            .create(userThread.threadId, {
              items: payload?.content?.map(v => ({ type: 'message', role: payload.role, content: v.text }))
            })
            .catch(err => {
              console.log(err)
            })
        } else
          await this.openai.beta.threads.messages.create(userThread.threadId, payload).catch(err => {
            console.log(err)
          })
        break // Sort de la boucle si l'envoi réussit
      } catch (error) {
        if (count >= 5) break
        console.error("Échec de l'envoi, nouvelle tentative...", error)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Pause avant de réessayer
      }
    }
  }

  private async getFilePath(binaryData, type = 'audio') {
    const tempDir = os.tmpdir()

    // Créer un répertoire temporaire
    const filePath = path.join(tempDir, type == 'image' ? 'image.png' : 'audio.ogg') // Chemin du fichier temporaire

    // Écrire le contenu dans le fichier temporaire
    await fs.writeFileSync(filePath, binaryData)

    return filePath
  }

  //Get shop data
  private getShop = async (id: string, fileStore) => {
    const client = this.clients.get(id)!
    // Vérifie si les données sont en cache
    let shop = await fileStore.getShop(id)
    if (!shop) {
      shop = await Shop.findOne({ _id: id }).populate('user')
      if (shop.threads) delete shop.threads
      // Stocke les données en cache
      await fileStore.saveShop(shop)
    }
    if (client) {
      client.shopData = shop
      this.clients.set(id, client)
    }
    return shop
  }

  private getSavedClient = async (id: string) => {
    // Vérifie si les données sont en cache
    const client = this.clients.get(id)

    return client as ShopClient
  }

  //update shop
  private updateShop = async (shopId: string, fields: any) => {
    const client = this.clients.get(shopId)!

    if (shopId) {
      await Shop.updateOne({ _id: shopId }, { $set: fields })
      const shop = await Shop.findOne({ _id: shopId })
      // Mise à jour de Redis
      this.localStorage.setItem(`shop_${shopId}`, JSON.stringify(shop))
      if (client) {
        client.shopData = shop
        this.clients.set(shopId, client)
      }
    }
  }

  //get thread
  private getUserThread = async (userPhone, fileStore, shop) => {
    let userThread = await fileStore.getThread(userPhone)
    console.log('userThread', userThread)
    //Create thread
    if (!userThread) {
      const emptyThread = shop.model
        ? await this.openai.conversations.create({})
        : await this.openai.beta.threads.create()
      if (emptyThread) {
        userThread = { phone: userPhone, threadId: emptyThread?.id }
        fileStore.saveThread([userThread])
      }
    }

    return userThread
  }

  private setUserThread = async (userPhone, fullText, fileStore, shop) => {
    let userThread: any = await this.getUserThread(userPhone, fileStore, shop)
    //Create thread
    if (userThread) {
      const newThread = {
        phone: userThread.phone,
        threadId: userThread.threadId,
        pause: true,
        time: new Date(),
        stop: fullText.startsWith('//')
      }
      userThread = newThread
      fileStore.saveThread([newThread])
    }

    return userThread
  }

  private setContinue = async (userPhone, fileStore, shop) => {
    let userThread: any = await this.getUserThread(userPhone, fileStore, shop)
    //Create thread
    if (userThread) {
      const newThread = { phone: userThread.phone, threadId: userThread.threadId }
      userThread = newThread
      fileStore.saveThread([newThread])
    }

    return userThread
  }

  private levenshteinDistance(str1: string, str2: string) {
    const matrix: any = []

    // Si l'une des chaînes est vide
    if (str1.length === 0) return str2.length
    if (str2.length === 0) return str1.length

    // Initialisation de la matrice
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    // Remplissage de la matrice
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // Substitution
            matrix[i][j - 1] + 1, // Insertion
            matrix[i - 1][j] + 1 // Suppression
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // Fonction pour calculer la similarité en pourcentage
  private similarityPercentage(str1: string, str2: string) {
    const maxLength = Math.max(str1.length, str2.length)
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    return ((maxLength - distance) / maxLength) * 100
  }

  private isHightZone(str1: string, str2: string, vals: any) {
    const similarity = this.similarityPercentage(str1, str2) // Calcule la similarité entre str1 et str2
    let highestSimilarity = 0 // Stocke la plus grande similarité trouvée dans vals
    let index = 0

    // Parcours la liste des valeurs pour comparer leur similarité avec str2
    while (index < vals.length) {
      const val = this.similarityPercentage(vals[index], str2)
      if (val > highestSimilarity) {
        highestSimilarity = val // Met à jour la similarité la plus élevée si elle est plus grande
      }
      index++
    }
    // Retourne true si la similarité de str1 avec str2 est supérieure ou égale à la plus grande trouvée
    return similarity >= highestSimilarity
  }

  private isHightProduct(str1: string, str2: string, vals: any) {
    const similarity = this.similarityPercentage(str1, str2) // Calcule la similarité entre str1 et str2
    let highestSimilarity = 0 // Stocke la plus grande similarité trouvée dans vals
    let index = 0

    // Parcours la liste des valeurs pour comparer leur similarité avec str2
    while (index < vals?.length) {
      const val = this.similarityPercentage(vals[index].name, str2)
      if (val > highestSimilarity) {
        highestSimilarity = val // Met à jour la similarité la plus élevée si elle est plus grande
      }
      index++
    }

    // Retourne true si la similarité de str1 avec str2 est supérieure ou égale à la plus grande trouvée
    return similarity >= highestSimilarity
  }

  private isSubscribe = async (shop, fileStore) => {
    let newShop = shop
    if (newShop && !newShop.user?.expire_date) {
      newShop = await Shop.findOne({ _id: newShop._id }).populate('user')
      // Stocke les données en cache
      await fileStore.saveShop(newShop)
    }
    return moment(newShop?.user?.expire_date).isAfter(moment())
  }

  public async logoutClient(shopId: string) {
    const authPath = `bots/auths/${shopId}`
    const { state } = await useMultiFileAuthState(authPath)

    try {
      // Vérifier si une session existe déjà
      if (state.creds && state.creds.me) {
        console.log(`Déconnexion en cours pour ${shopId}...`)

        // Créer un client temporaire pour exécuter le logout
        const client = makeWASocket({
          auth: state,
          printQRInTerminal: false
        })

        // Exécuter le logout proprement
        await client.logout()
        console.log(`Client ${shopId} déconnecté avec succès.`)
      } else {
        console.log(`Aucune session active trouvée pour ${shopId}.`)
      }
    } catch (err) {
      console.error(`Erreur lors de la déconnexion de ${shopId} :`, err)
    }
  }

  public getShopStatus(shopId: string): 'disconnected' | 'connecting' | 'connected' | 'logout' | undefined {
    const client = this.clients.get(shopId)
    return client?.status
  }

  public mergeContacts(existing: Contact[], incoming: Contact[]) {
    const map = new Map()

    for (const contact of existing) {
      if (contact.id) map.set(contact.id, contact)
      else if (contact.id) map.set(contact.id, contact)
    }

    for (const contact of incoming) {
      const key = contact.id
      if (key) map.set(key, contact)
    }

    return Array.from(map.values())
  }

  public async isContact(remoteJid, fileStore) {
    try {
      const conta = await fileStore.getContact(remoteJid)
      return conta ? true : false
    } catch (error) {
      console.error('Erreur lors de la vérification du contact:', error)
      return false
    }
  }

  public cleanKey() {
    const now = Date.now()
    this.activeRuns.forEach((timestamp, key) => {
      this.activeRuns.delete(key)
    })
  }
}

process.on('uncaughtException', err => {
  console.error('Erreur fatale non gérée:', err)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejet non géré:', reason)
})

export { ShopManager }
