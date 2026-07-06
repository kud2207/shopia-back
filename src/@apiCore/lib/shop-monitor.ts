import { ShopManager } from './shop-manager'
import { createFileStore } from './file-store'
import { delay } from 'baileys'

async function checkAndRestartShops() {
  try {
    const fileStore = await createFileStore()
    const activeShops = await fileStore.getShops()
    const shopManager = ShopManager.getInstance()
    for (const shop of activeShops) {
      const shopId = shop._id.toString()
      const status = shopManager.getShopStatus(shopId)

      console.log(`Vérification boutique ${shopId} - Statut : ${status}`)

      try {
        await delay(500)
        shopManager.cleanKey()
        // await shopManager.getOrCreateClient(shopId)
        console.log(`Boutique ${shopId} reconnexion initiée.`)
      } catch (error) {
        console.error(`Échec redémarrage boutique ${shopId}:`, error)
      }
    }
  } catch (error) {
    console.error('Erreur pendant la vérification:', error)
  }
}
checkAndRestartShops()
console.log('Monitoring des boutiques démarré. Vérification horaire activée.')
process.on('uncaughtException', err => {
  console.error('Erreur fatale non gérée:', err)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('Rejet non géré:', reason)
})
