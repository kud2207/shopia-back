import Shop from '../models/shop.js'
import Zone from '../models/zone.js'
import Product from '../models/product.js'

import { createFileStore } from '../lib/file-store.js'
import { syncShopKnowledgeToQdrant } from './qdrant-knowledge.js'

export const createAssistantFile = async shopId => {
  if (shopId) {
    const shop = await Shop.findOne({ _id: shopId }).populate({ path: 'city', populate: 'country' })
    if (shop && shop.isScan) {
      const queryData = { shop: shopId }
      queryData.$or = [{ notSell: false }, { notSell: { $exists: false } }]

      const products = await Product.find(queryData).populate('category')
      const formatedProduct = products.map(item => ({
        product_id: item._id,
        product_name: item.name,
        description: item.description,
        price: item.price + ' ' + shop.country?.currency,
        reduced_price: (item.discountPrice || 0) + ' ' + shop.country?.currency,
        min_price: (item.negotiablePrice || item.price) + ' ' + shop.country?.currency,
        images: item.images,
        produt_links: item.socialLinks,
        category: item?.category?.name,
        inStock: true
      }))
      const shopInfo = {
        name: shop.name,
        description: shop.description,
        shop_location: {
          adresse: shop.address,
          city: shop?.city?.name,
          country: shop?.city?.country?.name
        },
        type: shop.type
      }
      if (shop.shipped) {
        shopInfo.canShipp = true
        shopInfo.shippingZones = shop.shipping
      }
      if (shop?.deliveryCities && shop.deliveryCities?.length) {
        const zones = await Zone.find({ city: { $in: shop.deliveryCities } }).populate('city')
        shopInfo.deliveryZones = zones?.map(v => ({ city: v.city?.name, zone: v.title, neighborhoods: v.description }))
      }
      const fileData = JSON.stringify({ products: formatedProduct, shopInfo: shopInfo })
      // QDRANT SYNC 
      const result = await syncShopKnowledgeToQdrant({
        shopId: shop._id.toString(),
        products: formatedProduct,
        shopInfo
      })

      await updatedShop(shopId, {
        qdrantCollection: 'shopia_knowledge',
        qdrantIndexedAt: new Date(),
        qdrantDocumentsCount: result.indexedDocuments
      })

      return fileData
    }
  }
}

const updatedShop = async (shopId, data) => {
  const updatedShop = await Shop.findOneAndUpdate(
    { _id: shopId },
    { $set: data },
    { new: true, runValidators: true }
  ).populate('user')
  if (updatedShop) {
    const fileStore = await createFileStore(shopId)
    fileStore.saveShop(updatedShop)
  }
}
