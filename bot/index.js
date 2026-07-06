import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createFileStore } from './src/lib/file-store.js'
import { delay } from 'baileys'
import { ShopManager } from './src/lib/shop-manager.js'
import processCampaign from './src/lib/campaign-manage.js'

import { WebSocketServer } from 'ws'
import dbConnect from './src/lib/mongodb.js'
import Shop from './src/models/shop.js'

const fileStore = await createFileStore()
let activeShops = await fileStore.getShops()
const shopManager = await ShopManager.getInstance()
let isSave = false
await dbConnect()

try {
  if (activeShops.length == 0) {
    isSave = true
    activeShops = await Shop.find({ isScan: true })
  }

  for (const shop of activeShops) {
    const shopId = shop._id.toString()
    const status = shopManager.getShopStatus(shopId)
    console.log(`Vérification boutique ${shopId} - Statut : ${status}`)
    try {
      await delay(200)
      await shopManager.getOrCreateClient(shopId)
      console.log(`Boutique ${shopId} reconnexion initiée.`)
      if (isSave) fileStore.saveShop(shop)
    } catch (error) {
      console.error(`Échec redémarrage boutique ${shopId}:`, error)
    }
  }
  // Créer le serveur WebSocket

  const wss = new WebSocketServer({ port: 4000 })

  console.log('Bot WebSocket en écoute sur ws://localhost:4000')
  wss.on('connection', ws => {
    shopManager.on('shopClientUpdate', (shopId, shopClient) => {
      ws.send(JSON.stringify({ action: 'status', shopId, client: { ...shopClient, socket: null } }))
    })
    console.log('Nouvelle connexion API ↔ bot')
    ws.on('message', async msg => {
      try {
        const { action, data } = JSON.parse(msg)

        if (action === 'getShopStatus') {
          const status = shopManager.getShopStatus(data.shopId)
          ws.send(JSON.stringify({ action, status }))
        }

        if (action === 'restartShop') {
          await shopManager.getOrCreateClient(data.shopId, data.phone, data.checkCode)
          // ws.send(JSON.stringify({ action: "status", shopId: data.shopId, client: {...client, socket:null} }));
        }
        if (action === 'getClient') {
          const client = await shopManager.getClient(data.shopId)
          if (client) {
            delete client.socket
          }
          ws.send(JSON.stringify({ action, client }))
        }
        if (action === 'getClients') {
          const clients = await shopManager.getClients()
          ws.emit('getClients', { clients })
        }
        if (action === 'startCampaign') {
          let client = await shopManager.getClient(data?.campaign?.shop.toString())
          if (!client || client?.status != 'connected')
            client = await shopManager.getOrCreateClient(data?.campaign?.shop.toString())
          setTimeout(async () => {
            client = await shopManager.getClient(data?.campaign?.shop.toString())
            console.log('client', client)
            if (client) processCampaign(client.socket, data.campaign)
          }, 5000)
        }
      } catch (err) {
        console.error('Erreur WebSocket:', err)
        ws.send(JSON.stringify({ error: err.message }))
      }
    })
  })
} catch (error) {
  console.error('Erreur pendant la vérification:', error)
}

console.log('Monitoring des boutiques démarré. Vérification horaire activée.')
process.on('uncaughtException', err => {
  console.error('Erreur fatale non gérée:', err)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejet non géré:', reason)
})
