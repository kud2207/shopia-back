import { ShopManager } from 'src/@apiCore/lib/shop-manager'
import { createFileStore } from 'src/@apiCore/lib/file-store'

export default async function SocketHandler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*') // 🔥 Ajoute ceci
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

  try {
    const fileStore = await createFileStore()
    const activeShops = await fileStore.getShops()
    const shopManager = ShopManager.getInstance()
    const now = Date.now()
    for (const shop of activeShops) {
      const shopId = shop._id.toString()
      const trace: any = fileStore.getTrace(shopId)
      const diff = now - new Date(trace?.date).getTime()
      if (diff > 10 * 60 * 1000) {
        const status = shopManager.getShopStatus(shopId)

        console.log(`Vérification boutique ${shopId} - Statut : ${status}`)

        if (status === 'disconnected' || status === undefined) {
          console.log(`Redémarrage boutique ${shopId}...`)
          try {
            shopManager.cleanKey()
            await shopManager.getOrCreateClient(shopId)
            console.log(`Boutique ${shopId} reconnexion initiée.`)
          } catch (error) {
            console.error(`Échec redémarrage boutique ${shopId}:`, error)
          }
        }
      }
    }
  } catch (error) {
    console.error('Erreur pendant la vérification:', error)
  }
}
