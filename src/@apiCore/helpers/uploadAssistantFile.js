import fs from 'fs'
import path from 'path'
import Shop from 'src/@apiCore/models/shop'
import Zone from 'src/@apiCore/models/zone'
import Product from 'src/@apiCore/models/product'
import Setting from 'src/@apiCore/models/setting'
import OpenAI from 'openai'
import os, { type } from 'os'
import { PassThrough } from 'stream'
import axios from 'axios'
import { createFileStore } from '../lib/file-store'
import { syncShopKnowledgeToQdrant } from './qdrant-knowledge'

const openai = new OpenAI({
  organization: process.env.ORGANIZATION
})

function saveProductsToFile(products, shopId, type = 'product') {
  const tempDir = os.tmpdir()
  const file = type == 'service' ? 'company-info-' + shopId + '.txt' : 'products-and-shopinfo-' + shopId + '.json'
  // Créer un répertoire temporaire
  const filePath = path.join(tempDir, file) // Chemin du fichier temporaire

  // Convertir la liste des produits en format JSON
  const productsJSON = type == 'service' ? products?.shopInfo?.description : JSON.stringify(products, null, 2)

  // Écrire le contenu dans le fichier temporaire
  fs.writeFileSync(filePath, productsJSON)

  // Supprimer le fichier temporaire après son utilisation
  //   fs.unlinkSync(filePath)

  return filePath
}

const updateAssistant = async (shop, setting, fileData) => {
  if (shop && shop.assistantId) {
    const template = shop.type === 'service' ? setting?.content?.service_prompt : setting?.content?.commerce_prompt
    const variables = {
      shopName: shop.name || '',
      shopAddress: shop.address || '',
      shopCity: shop?.city?.name || '',
      shopFreeDelivery: shop.freeDelivery ? ', avec livraison gratuite' : '',
      shopDeliveryDelay: shop.deliveryDelay || '1',
    };

    let prompt = template?.replaceAll(
      /\{(\w+)\}/g,
      (_, key) => variables[key] ?? ''
    );

    const instructions = `${shop.prompt || prompt} 
      ${shop?.instruction ? '\n- instructions suplémentaire:\n' : ''}
      ${shop?.instruction || ''}`
    const data = { instructions: instructions }
    if(!shop.prompt) data.prompt = prompt
    updatedShop(shop._id, data)
    if (shop.assistantId != 'none') {
      const myUpdatedAssistant = await openai.beta.assistants.update(shop.assistantId, {
        instructions: instructions,
        name: shop.name,
        tools: [{ type: 'file_search' }],
      })
    }
  }
}

async function uploadFileFromCloudinary(url, shop, assistantFileId) {
  try {
    // Télécharger le fichier depuis l'URL Cloudinary
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })

    // Créer un flux à partir du fichier téléchargé
    const stream = new PassThrough()
    response.data.pipe(stream)

    // Envoyer le fichier à OpenAI
    const file = await openai.files.create({
      file: stream,
      purpose: 'assistants'
    })
    if (file && shop.assistantId && assistantFileId) {
      await openai.vectorStores.files.create(assistantFileId, {
        file_id: file.id
      })
    }

    return file?.id
  } catch (error) {
    return ''
  }
}
export const createAssistantFile = async shopId => {
  if (shopId) {
    const shop = await Shop.findOne({ _id: shopId }).populate({ path: 'city', populate: 'country' })
    if (shop && shop.isScan) {
      const setting = await Setting.findOne()
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
      await updateAssistant(shop, setting, fileData)

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


      const filePath = await saveProductsToFile({ products: formatedProduct, shopInfo: shopInfo }, shopId, shop.type)
      let fileId = shop.fileId
      let oldField = shop.fileId

      let assistantFileId = shop.assistantFileId

      if (!assistantFileId && shop.assistantId) {
        const vectorStore = await openai.vectorStores.create({
          name: shop.name
        })
        assistantFileId = vectorStore.id
        if (shop.assistantId != 'none')
          await openai.beta.assistants.update(shop.assistantId, {
            tool_resources: {
              file_search: {
                vector_store_ids: [assistantFileId]
              }
            }
          })
      }

      const file = await openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: 'assistants'
      })
      if (file && shop.assistantId && assistantFileId) {
        fileId = file.id
        await openai.vectorStores.files.create(assistantFileId, {
          file_id: fileId
        })
      }

      let cfile = ''
      if (shop.type == 'service' && file) {
        cfile = await uploadFileFromCloudinary(shop.file, shop, assistantFileId)
      }

      if (fileId || assistantFileId) {
        const data = { assistantFileId: assistantFileId, fileId: fileId }
        if (cfile) data.file = ''
        await updatedShop(shopId, data)
      }

      if (assistantFileId && shop.assistantId && oldField) {
        await openai.vectorStores.files.delete(oldField, { vector_store_id: assistantFileId }).catch(() => {})
        try {
          await openai.files.delete(oldField)
        } catch (err) {
          console.log('Delete product', err)
        }
      }
      fs.unlinkSync(filePath)
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
