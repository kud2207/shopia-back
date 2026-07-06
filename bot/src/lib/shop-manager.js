// lib/shop-manager.ts
import baileys, {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  proto,
  delay,
  downloadMediaMessage,
  getAggregateVotesInPollMessage,
  decryptPollVote
} from 'baileys'
import NodeCache from 'node-cache'
import { EventEmitter } from 'events'
import P from 'pino'
import Shop from '../models/shop.js'
import User from '../models/user.js'
import Product from '../models/product.js'
import Zone from '../models/zone.js'
import Order from '../models/order.js'
import DeliveryPricing from '../models/deliveryPricing.js'
import OpenAI from 'openai'
import moment from 'moment'
import dbConnect from './mongodb.js'
import mongoose from 'mongoose'
import { sendOrderNotification, sendPushNotificationToUser } from '../helpers/index.js'
import { messages } from '../helpers/messages.js'
import { handleCreateNotif } from '../npoints/index.js'
import fs from 'fs'
import os from 'os'
import path from 'path'
import Appointment from '../models/appointment.js'
import { Mutex } from 'async-mutex'
import { createFileStore } from './file-store.js'
import LocalStorage from 'node-persist'
import { createAssistantFile } from '../helpers/uploadAssistantFile.js'
import { searchShopKnowledge } from '../helpers/qdrant-knowledge.js'

class ShopManager extends EventEmitter {
  constructor() {
    super()
    this.clients = new Map() // shopId -> Client
    this.localStorage = LocalStorage
    this.logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('bots/logs.txt'))
    this.openai = new OpenAI()
    this.openai1 = new OpenAI({
      baseURL: 'https://router.huggingface.co/v1/',
      // required but ignored
      apiKey: process.env.HUGGINFACE
    })
    this.historyRequests = new Map()
    this.activeRuns = new Map() // Map<`${shopId}_${remoteJid}`, timestamp>
    this.activeRunsMutex = new Mutex()
    this.messageCache = new NodeCache({ stdTTL: 300, useClones: false, deleteOnExpire: true, checkperiod: 60 })
    this.cacheMutex = new Mutex()
    this.responseCache = new NodeCache({ stdTTL: 600, useClones: false, deleteOnExpire: true, checkperiod: 60 }) // 10 minutes
    this.stopMessages = [
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
    this.handleMessages = async (data, shopId, client, fileStore) => {
      const { messages, type } = data
      if (messages.length > 0 && messages[0]?.key?.remoteJid && messages[0]?.key?.remoteJid?.split('@')[0]?.length > 16)
        return
      if (type === 'notify' && messages.length && !messages.find(message => message.message?.pollUpdateMessage)) {
        const shop = await this.getShop(shopId, fileStore)
        if (!shop) return
        for (const message of messages) {
          console.log("message", JSON.stringify(message))
          const messageId = shopId + message.key.id
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
              let userThread = await this.setUserThread(message.key.remoteJidAlt?.split('@')[0], fullText, fileStore, shop, message.key.remoteJid?.split('@')[0])
              if (fullText == '/recap') {
                const contact = {
                  phone: message.key.remoteJidAlt?.split('@')[0],
                  name: message.pushName,
                  phone1: message.key.remoteJid?.split('@')[0],

                }
                await this.sendMessageToThread(
                  message,
                  'Envoie moi le recapitulatif texte de ma commande en cours',
                  userThread,
                  'assistant',
                  shop
                )
                this.run(shop, userThread, message.key.remoteJid, contact, true, client, fullText)
              } else if (fullText == '/pl') {
                await this.setContinue(message.key.remoteJid?.split('@')[0], fileStore, shop)
              } else if (userThread) {
                await this.sendMessageToThread(message, fullText, userThread, 'assistant', shop)
              }
            } else {
              console.log("fullText", fullText)
              let userThread = await this.getUserThread(message.key.remoteJidAlt?.split('@')[0], fileStore, shop, message.key.remoteJid?.split('@')[0])
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
            console.log('Texte complet du message:',fullText,  JSON.stringify(message))
            const contact = {
              phone: message.key.remoteJidAlt?.split('@')[0],
              phone1: message.key.remoteJid?.split('@')[0],
              name: message.pushName
            }
            let allLastMessages = {}
            let userThread = await this.getUserThread(contact.phone, fileStore, shop, contact.phone1)
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
              fullText &&
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
                await this.run(shop, userThread, message.key.remoteJid, contact, false, client, fullText)
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
    }
    this.createStream = async (shop, contact, userThread, userMessage) => {
        let stream = null
        if (shop.model) {
          const config = {
            conversation: userThread.threadId,
            stream: true,
            input: '  '
          }
          if (shop.prompt_id) {
            config.prompt = { id: shop.prompt_id }
          } else {
            config.instructions =
              shop.instructions + `Numéro de téléphone du client:${contact.phone}; Date et heure du jour: ${moment()}`
            if(!shop.qdrantDocumentsCount) {
              config.tools = [{ type: 'file_search', vector_store_ids: [shop.assistantFileId], max_num_results: 3 }]
              createAssistantFile(shop._id).catch(err => console.log('createAssistantFile error', err))
            }else {
              try {
              const docs = await searchShopKnowledge({
                shopId: shop._id.toString(),
                query: userMessage,
                limit: 5
              })

              console.log('docs', docs)

              const context = docs
                .map((doc, index) => `
              [Résultat ${index + 1}]
              Type: ${doc.type}
              Titre: ${doc.title}
              Contenu:
              ${doc.text}
              `)
                .join('\n\n')
              config.instructions += `\n\nContexte:\n${context}`
              } catch (err) { 
              config.tools = [{ type: 'file_search', vector_store_ids: [shop.assistantFileId], max_num_results: 2 }]

              }

          }
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
    this.createStreamOrder= async (shop, contact, userThread) => {
      let stream = null
      if (shop.model) {
        stream = await this.openai.responses
          .create({
            conversation: userThread.threadId,
            model: 'gpt-4o-mini',
            stream: true,
            input: `Recapitulez la dernière commande en JSON formaté comme ceci : {"pdts":[{"id":"(champs _id du produit commandé)", productName:"(Nom du produit commandé)", "price":(prix),"quantity":(quantité)}],"orderTotal":(total de la commande),"dev":{"address":"(adresse)","city":"(ville)","date":"(YYYY-MM-DD H:m:i) date de livraison", phone: "${
              contact.phone
            } ou le numéro que le client à précisé", type:"type de commande (livraison ou expedition)", "note": "Note complémentaire(heure de livraison ou l'urgence si c'est mentioné)", cost: "Les frais de livraison si c'est specifié", "orderId": "L'id de la commande en cours(Laisse le vide si on ne te l'a pas donné))"}}. Date courante : ${moment()} Note: Cherche les id des produits commandés dans le fichier. S'il s'agit d'une modification renvoie en plus l'orderId qui est l'id de la commande en cours.`,
            instructions: `Recapitulez la dernière commande en JSON formaté comme ceci : {"pdts":[{"id":"(champs _id du produit commandé)", productName:"(Nom du produit commandé)", "price":(prix),"quantity":(quantité)}],"orderTotal":(total de la commande),"dev":{"address":"(adresse)","city":"(ville)","date":"(YYYY-MM-DD H:m:i) date de livraison", phone: "${
              contact.phone
            } ou le numéro que le client à précisé", type:"type de commande (livraison ou expedition)", "note": "Note complémentaire(heure de livraison ou l'urgence si c'est mentioné)", cost: "Les frais de livraison si c'est specifié", "orderId": "L'id de la commande en cours(Laisse le vide si on ne te l'a pas donné))"}}. Date courante : ${moment()} Note: Cherche les id des produits commandés dans le fichier. S'il s'agit d'une modification renvoie en plus l'orderId qui est l'id de la commande en cours.`,
            tools: [{ type: 'file_search', vector_store_ids: [shop.assistantFileId], max_num_results: 2 }]
          })
          .catch(err => console.error('run error', err))
      } else
        stream = await this.openai.beta.threads.runs
          .create(userThread.threadId, {
            assistant_id: shop.assistantId,
            stream: true,
            tool_choice: { type: 'file_search' },
            model: 'gpt-4o-mini',
            instructions: `Recapitulez la dernière commande en JSON : {"pdts":[{"id":"(champs _id du produit commandé)", productName:"(Nom du produit commandé)", "price":(prix),"quantity":(quantité)}],"orderTotal":(total de la commande),"dev":{"address":"(adresse)","city":"(ville)","date":"(YYYY-MM-DD H:m:i) date de livraison", phone: "${
              contact.phone
            } ou le numéro que le client à précisé", type:"type de commande (livraison ou expedition)", "note": "Note complémentaire(heure de livraison ou l'urgence si c'est mentioné)", cost: "Les frais de livraison si c'est specifié", "orderId": "L'id de la commande en cours(Laisse le vide si on ne te l'a pas donné))"}}. Date courante : ${moment()} Note: Cherche les id des produits commandés dans le fichier. S'il s'agit d'une modification renvoie en plus l'orderId qui est l'id de la commande en cours.`
          })
          .catch(err => {
            console.error(err)
          })
      return stream
    }

    this.run = async (
        shop,
        userThread,
        remoteJid,
        contact,
        isOrder,
        client,
        userMessage
      ) => {
        const client1 = this.clients.get(shop?._id)
        const chat = client || client1?.socket
        try {
          if (chat && remoteJid) {
            // Vérification cache de réponse pour éviter les réponses identiques
    
            await chat.presenceSubscribe(remoteJid)
    
            await chat.sendPresenceUpdate('composing', remoteJid)
    
            //Create run
            const stream = await this.createStream(shop, contact, userThread, userMessage)
    
            if (stream)
              for await (const event of stream) {
                if (
                  event.event === 'thread.message.completed' ||
                  (shop.model && event.type === 'response.output_text.done')
                ) {
                  if ((event.data?.content?.length && event.data.content[0].type == 'text') || (shop.model && event.text)) {
                    const data = this.getData(event?.data?.content[0]?.text?.value || event.text)
                    const responseKey = `${shop._id}_${remoteJid}_response`
                    const lastResponse = this.responseCache.get(responseKey) || ''
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
                            const orderData = this.getData(event1.data?.content[0]?.text?.value || event.text)
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

    this.isJson = message => {
      try {
        const match = message.match(/\{[\s\S]*\}/)
        if (!match) return false
        JSON.parse(match[0]) // essaie de parser
        return true
      } catch {
        return false
      }
    }

    this.base64ToUint8Array = base64 => {
      const binaryString = atob(base64)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    }
    this.createOrder = async (orderData, shop, remoteJid, contact, chat, userThread) => {
      if (orderData.order && orderData.order.dev?.address && orderData.order?.orderTotal) {
        let user = await User.findOne({ phone: contact.phone })
        if (!user) {
          let image = ''
          try {
            image = await chat.profilePictureUrl(remoteJid, 'image')
          } catch (error) {
            image = ''
          }
          user = await User.create({
            phone: contact.phone,
            name: contact.name,
            role: 'customer',
            image: image || '/images/avatars/1.png'
          })
        }
        //Search zone
        const partialAddress = orderData.order.dev?.address
        let zone = null
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
        const productPromises = []
        const items = orderData.order?.pdts?.map(item => ({
          product: item.id,
          productName: item.productName,
          quantity: item.quantity || 1,
          total: item.price
        }))
        let index = 1
        for (let product of items) {
          let queryData = this.isValidObjectId(product.product)
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
        let company = null
        let driver = null
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
          let data = [
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
          const OrderData = {
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
          let order = null
          const orderId =
            orderData.order?.dev?.orderId ||
            orderData.order?.orderId ||
            (orderData.order?.dev?.orderIds?.length && orderData.order?.dev?.orderIds[0]) ||
            ''
          if (this.isValidObjectId(orderId)) {
            order = await Order.updateOne({ _id: orderId }, { $set: OrderData })
          } else order = await Order.create(OrderData)
          if (order && order.total) {
            //send notification
            this.sendNotification(shop, user, chat, order, company, driver).catch(() => {})
            this.sendOpenAIMessage(order, userThread, shop)
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
    this.createAppointment = async (orderData, shop, remoteJid, contact, chat, userThread) => {
      const rdv = orderData.order
      if (rdv) {
        let user = await User.findOne({ phone: contact.phone })
        if (!user) {
          let image = ''
          try {
            image = await chat.profilePictureUrl(remoteJid, 'image')
          } catch (error) {
            image = ''
          }
          user = await User.create({
            phone: contact.number,
            name: rdv.nom || contact.name,
            role: 'customer',
            image: image || '/images/avatars/1.png'
          })
        }
        //create Order
        const OrderData = {
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
        let order = null
        const orderId = rdv?.rdvId
        if (this.isValidObjectId(orderId)) {
          order = await Appointment.updateOne({ _id: orderId }, { $set: OrderData })
        } else order = await Appointment.create(OrderData)
        if (order) {
          //send notification
          this.sendApointmentNotification(shop, user, chat, order).catch(() => {})
          this.sendOpenAIMessage(order, userThread, shop)
        }
      }
    }
    this.isValidObjectId = id => {
      // Exclure les valeurs nulles, vides ou déguisées
      if (
        !id ||
        typeof id !== 'string' ||
        ['null', 'undefined', 'N/A', 'na', 'none'].includes(id.trim().toLowerCase())
      ) {
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
    /**
     * Extrait le texte complet d'un message Baileys quel que soit son type.
     * @param message Le message de type WAMessage
     * @returns Le texte complet du message
     */
    this.getMessageText = async message => {
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
      if(!text && message.messageStubParameters?.length && message.messageStubParameters[0] == "Message absent from node") text+= "Je veux en savoir plus."

      return text.trim()
    }
    //Send notification after order
    this.sendNotification = async (shop, user, client, order, company, driver) => {
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

    this.sendApointmentNotification = async (shop, user, client, rdv) => {
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
    this.sendOtherNotification = async (shopId, title, message, client) => {
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
    this.formaterNumber = async (numero, client) => {
      // Supprimer le caractère "+"
      const numeroSansPlus = numero.replace('+', '')
      const result = await client.onWhatsApp(numeroSansPlus)
      if (result.length > 0) {
        return result[0].jid // Retourne le vrai numéro WhatsApp
      }
      const numeroFormate = numeroSansPlus.replace(/\s/g, '') + '@s.whatsapp.net'
      return numeroFormate
    }
    this.sendMessageToThread = async (
      message,
      fullText,
      userThread,
      role = 'user',
      shop,
      isSubscribe = true,
      active = true
    ) => {
      // Initialisation de l'objet mediaData à null par défaut
      let mediaData = null
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
            model: 'gpt-5-nano',
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
            // max_tokens: 50
          })
          if (response.choices[0].message?.content) {
            text = response.choices[0].message.content || fullText
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
            const file = await fs.createReadStream(filePath)
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
      let payload = {
        role: role || 'user',
        content: []
      }
      if (fullText?.trim()) {
        payload.content?.push({
          type: 'text',
          text: fullText
        })
      }
      if (mediaData && mediaData.caption?.trim()) {
        payload.content.push({
          type: 'text',
          text: mediaData.caption
        })
      }
      // Envoi du message dans le thread via l'API OpenAI
      if (payload?.content?.length > 0) await this.addToThread(payload, userThread, shop)
      return text
    }
    //Get shop data
    this.getShop = async (id, fileStore) => {
      const client = this.clients.get(id)
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
    this.getSavedClient = async id => {
      // Vérifie si les données sont en cache
      const client = this.clients.get(id)
      return client
    }

    //get thread
    this.getUserThread = async (userPhone, fileStore, shop, phone1="") => {
      let userThread = await fileStore.getThread(userPhone, phone1)
      console.log('userThread', userThread)
      //Create thread
      if (!userThread) {
        const emptyThread = shop.model
          ? await this.openai.conversations.create({})
          : await this.openai.beta.threads.create()
        // const emptyThread = await this.openai.beta.threads.create()
        if (emptyThread) {
          userThread = { phone: userPhone, threadId: emptyThread?.id }
           await  fileStore.saveThread([userThread])
        }
      }
      return userThread
    }
    this.setUserThread = async (userPhone, fullText, fileStore, shop, phone1="") => {
      let userThread = await this.getUserThread(userPhone, fileStore, shop, phone1)
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
    this.setContinue = async (userPhone, fileStore, shop) => {
      let userThread = await this.getUserThread(userPhone, fileStore, shop)
      //Create thread
      if (userThread) {
        const newThread = { phone: userThread.phone, threadId: userThread.threadId }
        userThread = newThread
        fileStore.saveThread([newThread])
      }
      return userThread
    }
    this.isSubscribe = async (shop, fileStore) => {
      let newShop = shop
      if (newShop && !newShop.user?.expire_date) {
        newShop = await Shop.findOne({ _id: newShop._id }).populate('user')
        // Stocke les données en cache
        await fileStore.saveShop(newShop)
      }
      return moment(newShop?.user?.expire_date).isAfter(moment())
    }
    this.logger.level = 'fatal'
    dbConnect()
    this.localStorage.init({ dir: './storage' })
    this.on('notification', async (id, title, message) => {
      console.log('[Notification] ID:', id)
      // const client = this.clients.get(id);
      const client = await this.getSavedClient(id)
      console.log('[Notification] Client trouvé:', client)
      if (client) {
        this.sendOtherNotification(id, title, message, client.socket)
      } else {
        console.error('[Notification] Client non trouvé pour ID:', id)
      }
    })
  }
  static getInstance() {
    if (!ShopManager.instance) {
      ShopManager.instance = new ShopManager()
    }
    return ShopManager.instance
  }
  async getOrCreateClient(shopId, phone, checkCode) {
    let client = this.clients.has(shopId) ? this.clients.get(shopId) : null
    if (!this.clients.has(shopId) || (client && client.status == 'disconnected') || checkCode) {
      const { state, saveCreds } = await useMultiFileAuthState(`bots/auths/${shopId}`)
      const msgRetryCounterCache = new NodeCache()
      const fileStore = await createFileStore(shopId)
      const { version } = await fetchLatestBaileysVersion()
      const sock = makeWASocket({
        version,
        // logger: this.logger,
        auth: state,
        printQRInTerminal: false,
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        qrTimeout: phone ? 180000 : 60000,
        syncFullHistory: true,
        defaultQueryTimeoutMs: 180000
      })
      const shopClient = {
        socket: sock,
        connections: new Set([shopId]),
        status: 'connecting'
      }
      this.clients.set(shopId, shopClient)
      this.setupEventListeners(shopId, phone, sock, saveCreds, fileStore)
    } else if (client) {
      client.connections.add(shopId)
      // Émettre un événement pour notifier les changements
      this.emit('shopClientUpdate', shopId, client)
    }
    return this.clients.get(shopId)
  }
  getClient(shopId) {
    return this.clients.get(shopId)
  }
  getClients() {
    return this.clients
  }
  setupEventListeners(shopId, phone, client, saveCreds, fileStore) {
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
          update.lastDisconnect?.error?.output?.statusCode != DisconnectReason.loggedOut &&
          update.lastDisconnect?.error?.output?.statusCode != DisconnectReason.connectionReplaced
        const connectionReplaced =
          update.lastDisconnect?.error?.output?.statusCode == DisconnectReason.connectionReplaced
        console.log('connection closed due to ', update.lastDisconnect?.error, ', reconnecting ', shouldReconnect)
        const timedOut =
          shopClient.status === 'connecting' &&
          update.lastDisconnect?.error?.output?.statusCode == DisconnectReason.timedOut
        if (
          update.lastDisconnect?.error?.output?.statusCode == DisconnectReason.loggedOut ||
          update.lastDisconnect?.error?.output?.statusCode == 405
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
      this.clients.set(shopId, shopClient)

      //   this.broadcastStatus(shopId);
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
    // client.ev.on('presence.update', async val => {
    //   if (val) await fileStore.saveTrace({ shopId, date: new Date() })
    // })
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
    })
    client.ev.on('messages.update', async event => {
      for (const { key, update } of event) {
        const message = await fileStore.getMessage(key.id + '')
        if (message) await fileStore.saveMessage({ ...message, ...update })
      }
    })
    client.ev.on('group-participants.update', async group => {
      console.log('group', group)
      const localGroup = await fileStore.getChat(group.id)
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
  async fetchHistoryWithTimeout(limit, key, timestamp, shopId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(null)
        console.log('Timeout après 30 secondes')
        // this.historyRequests.delete(key.id!)
      }, 10000)
      this.historyRequests.set(key.id, {
        resolve: messages => {
          clearTimeout(timeout)
          resolve(messages)
        },
        reject: error => {
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
  handleConnectionError(shopId, shouldReconnect, timedOut) {
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
  async cleanupShop(shopId) {
    const client = this.clients.get(shopId)
    if (client) {
      // client.socket.logout()
      this.clients.delete(shopId)
    }
  }
  async sendOpenAIMessage(order, userThread, shop) {
    let count = 0
    while (true) {
      try {
        count++
        await this.sendMessageToThread(
          null,
          `Voici l'OrderId de la commande en cours: ${order._id}`,
          userThread,
          'assistant',
          shop
        )
        console.log('Message envoyé avec succès !')
        break // Sort de la boucle si l'envoi réussit
      } catch (error) {
        if (count >= 5) break
        console.error("Échec de l'envoi, nouvelle tentative...", error)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Pause avant de réessayer
      }
    }
  }
  getData(text, isCommand = false) {
    let purifiedText = text.trim() // Texte purifié par défaut
    let images = []
    let order = null
    // Recherche du début et de la fin du bloc JSON
    const jsonStartIndex = text.indexOf('```json')
    // Si un bloc JSON est trouvé
    if (this.isJson(text) && isCommand) {
      order = JSON.parse(text)
      purifiedText = ''
    }
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
    const imagesMatch = purifiedText.match(/https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp)/gi)
    if (imagesMatch) {
      images = imagesMatch
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
    purifiedText = purifiedText
      .replace(/```/g, '') // supprime les balises de code
      .replace(/\{.*?\}/g, '') // supprime le JSON
      .trim()
    return { texte: purifiedText.trim(), order: order, images }
  }
  async addToThread(payload, userThread, shop) {
    let count = 0
    while (true) {
      try {
        count++
        if (shop.model || userThread?.threadId?.startsWith('conv')) {
          await this.openai.conversations.items
            .create(userThread.threadId, {
              items: payload?.content?.map(v => ({ type: 'message', role: payload.role, content: v.text }))
            })
            .catch(err => {
              console.log(err)
            })
        } else if (userThread && userThread.threadId?.startsWith('thread'))
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
  async getFilePath(binaryData, type = 'audio') {
    const tempDir = os.tmpdir()
    // Créer un répertoire temporaire
    const filePath = path.join(tempDir, type == 'image' ? 'image.png' : 'audio.ogg') // Chemin du fichier temporaire
    // Écrire le contenu dans le fichier temporaire
    await fs.writeFileSync(filePath, binaryData)
    return filePath
  }
  levenshteinDistance(str1, str2) {
    const matrix = []
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
  similarityPercentage(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length)
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    return ((maxLength - distance) / maxLength) * 100
  }
  isHightZone(str1, str2, vals) {
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
  isHightProduct(str1, str2, vals) {
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
  async logoutClient(shopId) {
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
  getShopStatus(shopId) {
    const client = this.clients.get(shopId)
    console.log('client', client)
    return client?.status
  }
  mergeContacts(existing, incoming) {
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
  async isContact(remoteJid, fileStore) {
    try {
      const conta = await fileStore.getContact(remoteJid)
      return conta ? true : false
    } catch (error) {
      console.error('Erreur lors de la vérification du contact:', error)
      return false
    }
  }
  cleanKey() {
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
