import dbConnect from 'src/@apiCore/lib/mongodb'
import { Client, LocalAuth, MessageMedia, Label } from 'whatsapp-web.js'
import Shop from 'src/@apiCore/models/shop'
import User from 'src/@apiCore/models/user'
import Product from 'src/@apiCore/models/product'
import OrderItem from 'src/@apiCore/models/orderItem'
import Order from 'src/@apiCore/models/order'
import Usage from 'src/@apiCore/models/usage'
import Setting from 'src/@apiCore/models/setting'
import OpenAI from 'openai'
import moment from 'moment'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { sendOrderNotification, uploadFileWithFormidable } from 'src/@apiCore/helpers'
import { handleCreateNotif } from 'src/@apiCore/npoints'
import { messages } from 'src/@apiCore/helpers/messages'
import orderActivity from 'src/@apiCore/models/orderActivity'
import axios from 'axios'
import crypto from 'crypto'
import ReactPDF from '@react-pdf/renderer'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LocalStorage = require('node-localstorage').LocalStorage

const localStorage = new LocalStorage('./storage')
const openai = new OpenAI()

export default async function bot(req, res) {
  const { method, body } = req
  await dbConnect()
  switch (method) {
    case 'GET':
      try {
        localStorage.setItem(req.query.shopId + '_scan_ok', '')
        localStorage.setItem(req.query.shopId + '_qr_code', '')
        const client = new Client({
          authStrategy: new LocalAuth({
            clientId: req.query.shopId
          }),
          puppeteer: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--start-maximized',
              '--no-default-browser-check',
              '--disable-infobars',
              '--disable-web-security',
              '--disable-site-isolation-trials',
              '--no-experiments',
              '--ignore-gpu-blacklist',
              '--ignore-certificate-errors',
              '--ignore-certificate-errors-spki-list',
              '--disable-gpu',
              '--disable-extensions',
              '--disable-default-apps',
              '--enable-features=NetworkService',
              '--single-process',
              '--disable-dev-shm-usage'
            ]
          }
          // webVersionCache: {
          //   type: 'remote',
          //   remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
          // }
        })

        client.on('qr', qr => {
          console.log('QR CODE', qr)
          localStorage.setItem(req.query.shopId + '_qr_code', qr)
        })

        client.on('ready', async () => {
          console.log('WHATSAPP WEB => Ready')
          localStorage.setItem(req.query.shopId + '_scan_ok', 'ok')
        })

        client.on('message_create', async msg => {
          // Fired on all message creations, including your own
          try {
            if (msg.fromMe) {
              const chat = await msg.getChat()
              const value = msg.body
              let queryData = {}
              // Assurez-vous que la valeur commence par '/'
              if (
                value.startsWith('/') &&
                (value == '/order' ||
                  value == '/run' ||
                  value == '/commande' ||
                  value == '/recap' ||
                  value == '/bill' ||
                  value == '/facture')
              ) {
                const allMessages = await chat.fetchMessages()
                const messages = allMessages.length > 8 ? allMessages.slice(0, 7) : allMessages
                const shopId = req.query.shopId
                const userPhone = msg?.from?.split('@')[0]
                let shop = await getShop(shopId)
                const contact = await msg.getContact()

                let userThread = await getUserThread(shop, userPhone)
                if (value !== '/bill' && value !== '/facture')
                  for (let item of messages) {
                    if (item.body)
                      await openai.beta.threads.messages.create(userThread.threadId, {
                        role: item.fromMe ? 'assistant' : 'user',
                        content: item.body
                      })
                  }

                if (value == '/order' || value == '/commande' || value == '/recap')
                  run(shop, userThread, chat, client, true)
                else if (value == '/run') run(shop, userThread, chat, client)
                else if (value == '/bill' || value == '/facture') {
                  let user = await User.findOne({ phone: contact.number || userPhone })

                  const orderData = Order.findOne({})
                }
              } else if (value.startsWith('/')) {
                // Supprime le '/' pour la recherche
                // const commandName = value.slice(1).toLowerCase();
                queryData.$or = [{ command: { $regex: value, $options: 'i' } }, { command: value }]
                // Recherche insensible à la casse
                const product = await Product.findOne(queryData)
                if (product) {
                  let media = null
                  if (!product.images) {
                    await chat.sendMessage(product.description)
                  } else if (product.images && product.images.length) {
                    media = await MessageMedia.fromUrl(product.images[0]).catch(err => {
                      media = null
                    })
                  }

                  if (media && product.images && product.images.length)
                    await chat.sendMessage(media, {
                      caption: product.description
                    })
                }
              }
            }
          } catch (error) {
            localStorage.setItem('error', error?.message)
          }
        })

        client.on('message', async message => {
          try {
            const chat = await message.getChat()
            const messages = await chat.fetchMessages()
            let botMessages = null
            const contact = await message.getContact()
            const shopId = req.query.shopId
            const userPhone = message?.from?.split('@')[0]
            let shop = await getShop(shopId)
            let messageText = message.body
            const currentTime = Date.now()
            const userNumber = message.from
            let allLastMessages = {}
            let userThread = await getUserThread(shop, userPhone)

            allLastMessages[userNumber] = {
              body: message.body,
              timestamp: currentTime
            }

            if (userThread && userThread.threadId) {
              const threadMessages = await openai.beta.threads.messages.list(userThread.threadId)
              botMessages = threadMessages?.data

              //approvisioné le bot avec les messages de la discussion
              if (botMessages.length == 0 && messages.length > 0) {
                for (let item of messages) {
                  if (item.body)
                    await openai.beta.threads.messages.create(userThread.threadId, {
                      role: item.fromMe ? 'assistant' : 'user',
                      content: item.body
                    })
                }
              }
            }

            //check all required condition to responds to user
            if (
              shop &&
              shop.isScan &&
              shop.active &&
              shop.assistantId &&
              shop.user &&
              checkMessageSimilarity(messages, botMessages) &&
              isSubscribe(shop, client) &&
              !chat.isGroup &&
              (shop.responseTo == 'all' || (shop.responseTo == 'no_contact' && !contact.isMyContact))
            ) {
              //Add product link to user message
              if (message._data && (message._data.matchedText || message._data.ctwaContext?.sourceUrl))
                messageText +=
                  '\nLien dans le fichier:' +
                  (message._data.matchedText || message._data?.ctwaContext?.sourceUrl) +
                  ' ou sert toi de ce texte pour trouvé le produit: ' +
                  (message.description || message.title)

              if (message.type == 'chat' && typeof messageText == 'string' && messageText && userThread) {
                //add message to stream
                await openai.beta.threads.messages.create(userThread.threadId, { role: 'user', content: messageText })
              }

              //Voice chat
              if (message.type == 'ptt') {
                await message.downloadMedia().then(async data => {
                  const filePath = await getFilePath(data.data)
                  const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(filePath),
                    model: 'whisper-1',
                    language: 'fr'
                  })
                  if (transcription.text)
                    await openai.beta.threads.messages.create(userThread.threadId, {
                      role: 'user',
                      content: transcription.text
                    })
                  fs.unlinkSync(filePath)
                })
              }

              //Image chat
              if (
                message.type == 'image' &&
                allLastMessages[userNumber] &&
                allLastMessages[userNumber].timestamp === currentTime
              ) {
                const media = await message.downloadMedia()
                const filePath = await getFilePath(media.data, 'image')
                const url = await uploadFileWithFormidable('image', { ...media, path: filePath })

                const response = await openai.chat.completions.create({
                  model: 'gpt-4o-mini',
                  messages: [
                    {
                      role: 'user',
                      content: [
                        { type: 'text', text: 'Que vois-tu?' },
                        {
                          type: 'image_url',
                          
                          image_url: {
                            url: url
                          }
                        }
                      ]
                    }
                  ],
                  max_tokens: 25
                })
                if (response.choices[0].message.content)
                  await openai.beta.threads.messages.create(userThread.threadId, {
                    role: 'user',
                    content: (message.body ? message.body + ':' : '') + response.choices[0].message.content
                  })
                fs.unlinkSync(filePath)
              }
              if (
                (message.type == 'ptt' || message.type == 'chat' || message.type == 'image') &&
                allLastMessages[userNumber] &&
                allLastMessages[userNumber].timestamp === currentTime &&
                userThread
              ) {
                // Attends 10 secondes pour permettre l'arrivée de messages supplémentaires
                await new Promise(resolve => setTimeout(resolve, (shop?.waitingTime || 10) * 1000))
                if (!checkMessageSimilarity(messages, botMessages)) return
                run(shop, userThread, chat, client)
              }
            } else if (shop.user && shop.user.aiAmount <= 0) {
              const setting = getNotificationSetting(shop._id)
              if (
                !setting ||
                (setting && setting.number < 5 && setting.date && moment(setting.date).diff(moment(), 'hours') >= 24)
              ) {
                sendIaAmountNotification(shop, client)
                localStorage.setItem(
                  'notification_' + shop._id,
                  shop ? JSON.stringify({ ...setting, date: moment(), number: setting ? setting.number + 1 : 1 }) : ''
                )
              }
            }
          } catch (error) {
            localStorage.setItem('error', error?.message)
          }
        })

        client.on('disconnected', reason => {
          console.log(reason)
          client.destroy()
          updateShop(req.query.shopId, { isScan: false })
        })

        client.initialize()

        res.status(200).json({ success: true })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      res.status(200).json(body)
      break
    default:
      res.status(200).json(body)
      break
  }
}

//get thread
const getUserThread = async (shop, userPhone) => {
  const threads = shop.threads || []
  let userThread = threads.find(item => item.phone == userPhone)
  //Create thread
  if (!userThread) {
    const emptyThread = await openai.beta.threads.create()
    if (emptyThread) {
      userThread = { phone: userPhone, threadId: emptyThread?.id }
      threads.push(userThread)
      updateShop(shop?._id, { threads: threads })
    }
  }

  return userThread
}
// run
const run = async (shop, userThread, chat, client, isOrder) => {
  chat.sendStateTyping()

  //Create run
  const stream = await openai.beta.threads.runs.create(userThread.threadId, {
    assistant_id: shop.assistantId,
    stream: true
    // tool_choice: { type: 'file_search' }
  })

  for await (const event of stream) {
    if (event.event == 'thread.message.completed') {
      if (event.data.content.length && event.data.content[0].type == 'text') {
        const data = getData(event.data.content[0].text.value)

        if (data.images && data.images.length) {
          const medias = []
          for (let image of data.images) {
            const media = await MessageMedia.fromUrl(image, [{ unsafeMime: true }])
            medias.push(media)
            if (data.images.length > 1) await chat.sendMessage(media)
          }
          if (medias.length > 1) await chat.sendMessage(data.texte)
          else
            await chat.sendMessage(medias[0], {
              caption: data.texte
            })
        } else {
          await chat.sendMessage(data.texte)
        }

        //capture Order
        if (data.order?.isOrder || event.data.content[0].text.value?.includes('récapitulatif') || isOrder) {
          await openai.beta.threads.messages.create(userThread.threadId, {
            role: 'user',
            content: 'Recapitule la dernière commande en JSON'
          })
          const stream1 = await openai.beta.threads.runs.create(userThread.threadId, {
            assistant_id: shop.assistantId,
            stream: true,
            tool_choice: { type: 'file_search' },
            instructions: `Recapitulez la dernière commande en JSON : {"pdts":[{"id":"(ID du produit dans le fichier)","price":(prix),"quantity":(quantité)}],"orderTotal":(total),"dev":{"address":"(adresse)","city":"(ville)","date":"(YYYY-MM-DD H:m:i)","orderId":"ID unique que tu génère(Ne doit etre different que si la commande differe)"}} avec la date courante : ${new Date().toISOString()}`
          })

          for await (const event1 of stream1) {
            if (event1.event == 'thread.message.completed') {
              const orderData = getData(event1.data.content[0].text.value)
              if (orderData.order && orderData.order.dev?.address) {
                let user = await User.findOne({ phone: contact.number || userPhone })
                const image = await contact.getProfilePicUrl()
                if (!user) {
                  user = await User.create({
                    phone: contact.number || userPhone,
                    name: contact.name || contact.pushname || contact.shortName,
                    role: 'customer',
                    image: image || '/images/avatars/1.png'
                  })
                }
                const items = orderData.order?.pdts?.map(item => ({
                  product: item.id,
                  quantity: item.quantity || 1,
                  total: item.price
                }))
                if (orderData.order?.orderId) {
                  const lastUserOrder = await Order.findOne({
                    botId: orderData.order?.orderId + '_' + user?._id
                  })
                  if (lastUserOrder) {
                    await OrderItem.deleteMany({ _id: { $in: lastUserOrder.items } })
                    await Order.deleteOne({ _id: lastUserOrder._id })
                  }
                }
                if (items && items.length) {
                  const orderItems = await OrderItem.insertMany(items)

                  const lastOrder = await Order.findOne({ shop: shop._id }, {}, { sort: { order_id: -1 } })

                  //create Order
                  const order = await Order.create({
                    shop: shop._id,
                    customer: user._id,
                    items: orderItems,
                    total: orderData.order?.orderTotal,
                    status: 'processing',
                    date: new Date(),
                    order_id: lastOrder?.order_id ? lastOrder.order_id + 1 : 1,
                    deliveryInfo: orderData.order?.dev,
                    canal: 'assistant',
                    botId: orderData.order?.orderId + '_' + user?._id
                  })
                  if (order) {
                    await orderActivity.create({
                      orderId: order?._id,
                      activityLabel: 'Creation de la commande',
                      activityContent: 'Commande creee avec success'
                    })
                    //send notification
                    sendNotification(shop, user, data, client, order)

                    //Add label to chat
                    let labels = await client.getLabels()
                    let label = labels.find(
                      item => item.name.toLowerCase() == 'nouvelle commande' || item.name.toLowerCase() == 'new order'
                    )
                    if (label) chat.changeLabels([label.id])

                    //Optimize facebook add
                    if (shop.pixelId && shop.adToken) adData(shop.pixelId, shop.adToken, user.phone, order.total)
                  }
                }
              }
            }
            if (event1.event == 'thread.run.completed')
              calculateCost(
                shop?.user?._id,
                event1.data.usage?.prompt_tokens,
                event1.data.usage?.completion_tokens,
                shop?._id
              )
          }
        }
      }
    }
    if (event.event == 'thread.run.completed')
      calculateCost(shop?.user?._id, event.data.usage?.prompt_tokens, event.data.usage?.completion_tokens, shop?._id)
  }
}
//Send notification after order
const sendNotification = async (shop, user, data, client, order) => {
  const lang = shop.language || 'fr'
  const info = formatOrderText(data.texte, lang)
  const message = `*${messages[lang].notifTitle}*\n
  *${messages[lang].shop}*: ${shop?.name}\n
  *${messages[lang].orderInfo}*:  ${info}
  - ${messages[lang].orderLink}: https://shopia-app.com/app/orders/${order._id}\n
  *${messages[lang].clientInfo}*:
  - ${messages[lang].name}: ${user.name || user.first_name}
  - ${messages[lang].whatsapp}: ${user.phone}
  - ${messages[lang].conversationLink}: https://wa.me/${user.phone}
 `

  const message1 = `
 *${messages[lang].orderInfo}*:  ${info}
 *${messages[lang].phone}:* ${user.phone}
 ${info?.includes(messages[lang].price) ? '' : '*- ' + messages[lang].price + '*:' + order.price}
`
  const mailMessage = `<h2 style='text-align:center'>${messages[lang].notifTitle}</h2><br />
 <b>${messages[lang].shop}</b>: ${shop?.name}<br />
 <b>${messages[lang].orderInfo}</b>: ${info?.replace(/\*/g, '')?.replace(/\n/g, '<br />')}<br />
 <b>${messages[lang].clientInfo}</b>:<br />
 - ${messages[lang].name}: ${user.name || user.first_name}<br />
 - ${messages[lang].whatsapp}: ${user.phone}<br />
 <div>
  <a class="mail-btn" href='https://wa.me/${user.phone}'>${messages[lang].viewConversation}</a>
  <a class="mail-btn primary" href='https://shopia-app.com/app/orders/${order._id}'>${messages[lang].viewOrder}</a>
 </div>
`

  //Internal notification
  handleCreateNotif({
    title: messages[lang].notifTitle,
    toChannel: shop?.user?._id || shop?.user,
    content: formatOrderText(data.texte, lang)?.replace(/\*/g, ''),
    redirectionLink: '/app/orders/' + order?._id,
    read: false,
    label: messages[lang].viewOrder
  })

  //notify to whatsApp
  if (shop.notifyPhone && shop.notifyPhone.length >= 5) {
    const phone = await formaterNumber(shop.notifyPhone, client)
    client.sendMessage(phone, message)
    client.sendMessage(phone, message1)
  }

  if (shop.notifyPhone1 && shop.notifyPhone1.length >= 5) {
    const phone = await formaterNumber(shop.notifyPhone1, client)

    client.sendMessage(phone, message1)
  }

  if (shop.notifyGroup) {
    const chats = await client.getChats()
    const groupChat = chats.find(item => item.isGroup && item.name?.toLowerCase() == shop.notifyGroup?.toLowerCase())
    if (groupChat) groupChat.sendMessage(message1)
  }

  //Notify to Email
  if (shop.notifyEmail) sendOrderNotification(shop.notifyEmail, mailMessage, shop?.name, messages[lang].notifTitle)
}

const sendIaAmountNotification = async (shop, client) => {
  const lang = shop.language || 'en'

  const message = `*${messages[lang].amountNotifTitle}*\n
  ${messages[lang].amountText} https://shopia-app.com/app/billing
 `
  const mailMessage = `<h2 style='text-align:center'>${messages[lang].amountNotifTitle}</h2><br />
 <p>${messages[lang].amountText1}</p>
 <div>
  <a class="mail-btn primary" href='https://shopia-app.com/app/billing'>${messages[lang].addCredit}</a>
 </div>
`

  //Internal notification
  handleCreateNotif({
    title: messages[lang].amountNotifTitle,
    toChannel: shop?.user?._id || shop?.user,
    content: message?.replace(/\*/g, ''),
    redirectionLink: '/app/billing',
    read: false,
    label: messages[lang].addCredit
  })

  //notify to whatsApp
  if (shop.notifyPhone) {
    const phone = await formaterNumber(shop.notifyPhone, client)
    client.sendMessage(phone, message)
  }

  //Notify to Email
  if (shop.notifyEmail) sendOrderNotification(shop.notifyEmail, mailMessage, shop?.name, messages[lang].notifTitle)
}

const sendSubcriptionNotification = (shop, client, days) => {
  const lang = shop.language || 'en'

  const message = `*${
    days > 0 ? messages[lang].accountNotifTitle + days + 'days' : messages[lang].accountNotifTitle1
  }*\n
  ${messages[lang].accountText} https://shopia-app.com/app/plan
 `
  const mailMessage = `<h2 style='text-align:center'>${
    days > 0 ? messages[lang].accountNotifTitle + days + 'days' : messages[lang].accountNotifTitle1
  }</h2><br />
 <p>${messages[lang].accountText}</p>
 <div>
  <a class="mail-btn primary" href='https://shopia-app.com/app/plan'>${messages[lang].renew}</a>
 </div>
`

  //Internal notification
  handleCreateNotif({
    title: days > 0 ? messages[lang].accountNotifTitle + days + 'days' : messages[lang].accountNotifTitle1,
    toChannel: shop?.user?._id || shop?.user,
    content: message?.replace(/\*/g, ''),
    redirectionLink: '/app/billing',
    read: false,
    label: messages[lang].renew
  })

  //notify to whatsApp
  if (shop.notifyPhone) client.sendMessage(formaterNumber(shop.notifyPhone), message)

  //Notify to Email
  if (shop.notifyEmail)
    sendOrderNotification(
      shop.notifyEmail,
      mailMessage,
      shop?.name,
      days > 0 ? messages[lang].accountNotifTitle + days + 'days' : messages[lang].accountNotifTitle1
    )
}

const formaterNumber = async numero => {
  // Supprimer le caractère "+"
  const numeroSansPlus = numero.replace('+', '')

  // Ajouter "@c.us" à la fin
  const numeroFormate = numeroSansPlus.replace(/\s/g, '') + '@c.us'

  // Ajouter "@c.us" à la fin
  const getNumberId = await client.getNumberId(numeroFormate)

  return getNumberId?._serialized || numeroFormate
}

function formatOrderText(texte, lang) {
  // Divise le texte en lignes
  let lignes = texte.split('\n')

  // Supprime la première et la dernière ligne
  if (lignes.length && lignes[0] == '\n') {
    lignes.shift()
    lignes.shift()
  } else {
    lignes.shift()
  }
  if (lignes.length && lignes[lignes.length - 1] == '\n') {
    lignes.pop()
    lignes.pop()
  } else {
    lignes.pop()
  }

  // Rejoindre les lignes restantes pour former le nouveau texte
  let nouveauTexte = lignes.join('\n')
  nouveauTexte = nouveauTexte?.replace(/Produit|Product/g, messages[lang].product)
  nouveauTexte = nouveauTexte?.replace(/Prix|Price/g, messages[lang].price)
  nouveauTexte = nouveauTexte?.replace(/Adresse|Address/g, messages[lang].price)
  nouveauTexte = nouveauTexte?.replace(/Date de livraison|Delivery date/g, messages[lang].date)
  nouveauTexte = nouveauTexte
    ?.split('\n')
    .filter(line => !line.startsWith('Le livreur'))
    .join('\n')

  return nouveauTexte
}

//Get shop data
const getShop = async id => {
  let shop = localStorage.getItem('shop_' + id) ? JSON.parse(localStorage.getItem('shop_' + id)) : null

  if (!shop) {
    shop = await Shop.findOne({
      _id: id
    }).populate({ path: 'user', populate: 'plan' })
    setShop(shop, id)
  }

  return shop
}

const getNotificationSetting = id => {
  return localStorage.getItem('notification_' + id) ? JSON.parse(localStorage.getItem('notification_' + id)) : null
}

//update shop
const updateShop = async (shopId, fields) => {
  if (shopId) {
    await Shop.updateOne({ _id: shopId }, { $set: fields })
    const shop = await Shop.findOne({ _id: shopId }).populate({
      path: 'user',
      populate: 'plan'
    })

    setShop(shop, shopId)
  }
}

//Update shop to localStorage
const setShop = (shop, id) => {
  localStorage.setItem('shop_' + id, shop ? JSON.stringify(shop) : '')
}

// Check if shopper get valid subscription
const isSubscribe = (shop, client) => {
  let diff = moment(shop.user?.subscription_date).diff(moment(), 'days')

  if (diff >= 0 && (diff == 7 || diff == 3 || diff == 1 || diff == 0)) {
    const setting = getNotificationSetting(shop._id)
    if (!setting || (setting && setting.days != diff)) {
      sendSubcriptionNotification(shop, client, diff)
      localStorage.setItem('notification_' + shop._id, shop ? JSON.stringify({ ...setting, days: diff }) : '')
    }
  }
  return moment(shop.user?.subscription_date)
    .add(shop.user?.plan?.duration || 0, shop.user?.plan?.unit || 'months')
    .isAfter(moment())
}

function getData(text) {
  let purifiedText = text.trim() // Texte purifié par défaut
  let images = []
  let order = null

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

    // Analyse le JSON extrait
    const jsonString = text.substring(jsonStartIndex + 8, jsonEndIndex).trim()
    order = JSON.parse(jsonString)
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
  let lignes = purifiedText.split('\n')

  // Filtre les lignes pour exclure celle contenant "Images : "
  purifiedText = lignes.filter(ligne => !ligne.includes('Image')).join('\n')

  return { texte: purifiedText.trim(), order: order, images }
}

function getFilePath(data, type = '') {
  const binaryData = Buffer.from(data, 'base64')
  const tempDir = os.tmpdir()

  // Créer un répertoire temporaire
  const filePath = path.join(tempDir, type == 'image' ? 'image.png' : 'audio.ogg') // Chemin du fichier temporaire

  // Écrire le contenu dans le fichier temporaire
  fs.writeFileSync(filePath, binaryData)

  return filePath
}

//Get setting data
const getSetting = async () => {
  let setting = localStorage.getItem('setting') ? JSON.parse(localStorage.getItem('setting')) : null

  if (!setting) {
    setting = await Setting.findOne()
    localStorage.setItem('setting', setting ? JSON.stringify(setting) : '')
  }

  return setting
}

//calculate usage cost
const calculateCost = async (userId, in_token, out_token, shopId) => {
  let setting = await getSetting()

  if (setting && userId) {
    const inVal = setting.content?.in_token_amount * in_token
    const outVal = setting.content?.out_token_amount * out_token
    const usageData = {
      user: userId,
      shop: shopId,
      amount: inVal + outVal
    }
    await Usage.create(usageData)

    await User.updateOne({ _id: userId }, { $inc: { aiAmount: -(inVal + outVal) } })
  }
}

//Fonction pour vérifier le marchant à pris la main et repond lui meme
function checkMessageSimilarity(messages, botMessages) {
  // Récupérer le dernier message où fromMe = true
  const lastUserMessage = messages.filter(msg => msg.id?.fromMe).pop()

  // Récupérer le dernier message du bot dont le rôle est 'assistant'
  const lastBotMessage =
    botMessages?.filter(msg => msg.role === 'assistant').length > 0
      ? botMessages?.filter(msg => msg.role === 'assistant')[0]
      : null

  if (!lastUserMessage || !lastBotMessage) {
    return true
  }

  // Extraire le texte des messages
  const userMessageText = lastUserMessage.body
  const data = getData(lastBotMessage.content[0]?.text?.value)
  const botMessageText = data?.texte
  if (data && data.order && data.order) {
    return true
  }
  // Vérifier la similarité (50%)
  const similarityThreshold = 0.5
  const similarityRatio = calculateSimilarity(userMessageText, botMessageText)
  return similarityRatio >= similarityThreshold || botMessageText == userMessageText
}

// Fonction pour calculer la similarité entre deux chaînes de caractères
function calculateSimilarity(str1, str2) {
  let longer = str1
  let shorter = str2

  if (str1.length < str2.length) {
    longer = str2
    shorter = str1
  }

  const longerLength = longer.length
  if (longerLength === 0) {
    return 1.0
  }

  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
}

// Fonction pour calculer la distance d'édition (Levenshtein distance)
function editDistance(str1, str2) {
  const costs = []

  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else {
        if (j > 0) {
          let newValue = costs[j - 1]
          if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
          }
          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }
    }
    if (i > 0) {
      costs[str2.length] = lastValue
    }
  }

  return costs[str2.length]
}

const adData = (pixelId, ad_token, phone, purchaseValue) => {
  // Exemple de données pour une conversion (à récupérer de votre système)
  const currency = 'USD' // Devise utilisée
  // const ad_id = "123456789";           // L'ID de la publicité spécifique

  // URL de l'API de conversions
  const url = `https://graph.facebook.com/v20.0/${pixelId}/events`

  // Créer les données à envoyer
  const data = {
    data: [
      {
        event_name: 'Purchase', // Type d'événement
        event_time: Math.floor(new Date() / 1000), // Temps de l'événement en timestamp UNIX
        user_data: {
          ph: hashData(phone) // Téléphone hashé
        },
        custom_data: {
          currency: currency, // Devise
          value: purchaseValue // Montant de l'achat
        },
        action_source: 'chat' // Indiquer que l'action provient de WhatsApp
      }
    ]
  }
  // Envoyer la requête HTTP à l'API de conversions de Facebook
  axios
    .post(url, data, {
      params: {
        access_token: ad_token // Votre token d'accès
      }
    })
    .then(response => {})
}

// Fonction pour hasher les données utilisateur (numéro de téléphone)
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}
