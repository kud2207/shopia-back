import { QdrantClient } from '@qdrant/js-client-rest'
import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'

const openai = new OpenAI({
  organization: process.env.ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY
})

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
})

const COLLECTION = 'shopia_knowledge'
const VECTOR_SIZE = 1536 // text-embedding-3-small

export async function ensureQdrantCollection() {
  const collections = await qdrant.getCollections()

  const exists = collections.collections.some(
    collection => collection.name === COLLECTION
  )

  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine'
      }
    })
  }
  await ensurePayloadIndexes()
}

async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })

  return response.data[0].embedding
}

function buildDocuments({ shopId, products, shopInfo }) {
  const documents = []

  documents.push({
    type: 'shop_info',
    refId: shopId,
    title: `Informations boutique ${shopInfo.name}`,
    text: `
Nom de la boutique: ${shopInfo.name}
Description: ${shopInfo.description || ''}
Adresse: ${shopInfo.shop_location?.adresse || ''}
Ville: ${shopInfo.shop_location?.city || ''}
Pays: ${shopInfo.shop_location?.country || ''}
Type: ${shopInfo.type || ''}
Livraison disponible: ${shopInfo.canShipp ? 'Oui' : 'Non'}
Zones de livraison: ${JSON.stringify(shopInfo.deliveryZones || [])}
Zones d'expédition: ${JSON.stringify(shopInfo.shippingZones || [])}
`.trim()
  })

  for (const product of products || []) {
    documents.push({
      type: 'product',
      refId: product.product_id?.toString(),
      title: product.product_name,
      text: `
Produit: ${product.product_name}
Description: ${product.description || ''}
Catégorie: ${product.category || ''}
Prix: ${product.price || ''}
Prix réduit: ${product.reduced_price || ''}
Prix minimum négociable: ${product.min_price || ''}
Disponible: ${product.inStock ? 'Oui' : 'Non'}
Liens produit: ${JSON.stringify(product.produt_links || [])}
Images: ${JSON.stringify(product.images || [])}
`.trim()
    })
  }

  return documents
}

export async function syncShopKnowledgeToQdrant({
  shopId,
  products,
  shopInfo
}) {
  await ensureQdrantCollection()

  // Supprimer l’ancienne connaissance de cette boutique
  await qdrant.delete(COLLECTION, {
    wait: true,
    filter: {
      must: [
        {
          key: 'shopId',
          match: { value: shopId.toString() }
        }
      ]
    }
  })

  const documents = buildDocuments({
    shopId: shopId.toString(),
    products,
    shopInfo
  })

  const points = []

  for (const doc of documents) {
    const vector = await createEmbedding(doc.text)

    points.push({
      id: uuidv4(),
      vector,
      payload: {
        shopId: shopId.toString(),
        type: doc.type,
        refId: doc.refId,
        title: doc.title,
        text: doc.text,
        updatedAt: new Date().toISOString()
      }
    })
  }

  if (points.length) {
    await qdrant.upsert(COLLECTION, {
      wait: true,
      points
    })
  }

  return {
    shopId,
    indexedDocuments: points.length
  }
}

export async function searchShopKnowledge({
  shopId,
  query,
  limit = 5
}) {
  await ensureQdrantCollection()

  const vector = await createEmbedding(query)

  const results = await qdrant.search(COLLECTION, {
    vector,
    limit,
    with_payload: true,
    filter: {
      must: [
        {
          key: 'shopId',
          match: { value: shopId.toString() }
        }
      ]
    }
  })

  return results.map(result => ({
    score: result.score,
    type: result.payload.type,
    title: result.payload.title,
    text: result.payload.text,
    refId: result.payload.refId
  }))
}

async function ensurePayloadIndexes() {
  try {
    await qdrant.createPayloadIndex(COLLECTION, {
      field_name: 'shopId',
      field_schema: 'keyword'
    })
  } catch (error) {
    // Ignore si l’index existe déjà
    const message = error?.data?.status?.error || error?.message || ''

    if (!message.includes('already exists')) {
      console.log('Erreur création index shopId:', message)
      throw error
    }
  }
}