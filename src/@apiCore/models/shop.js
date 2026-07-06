import { Schema, model, models } from 'mongoose'
import Category from './category'
import City from './city'
import Country from './country'

let shopSchema = new Schema(
  {
    name: String,
    description: String,
    user: {
      type: Schema.Types.ObjectId, //Admin user
      ref: 'User'
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: Country
    },
    currency: String,
    categories: {
      type: [Schema.Types.ObjectId],
      ref: Category
    },
    phone: String,
    address: String,
    city: {
      type: Schema.Types.ObjectId,
      ref: 'City'
    },
    slogan: String,
    botPhone: String,
    notifyPhone: String,
    notifyPhone1: String,
    notifyEmail: String,
    active: {
      type: Boolean,
      default: true
    },
    waitingTime: {
      //waiting time before respond to customer (in secondes)
      type: Number,
      default: 10
    },
    startTime: String,
    endTime: String,
    isScan: {
      //To identify if bot is linked to shop
      type: Boolean,
      default: false
    },
    send: {
      //To identify if bot is linked to shop
      type: Boolean,
      default: true
    },
    freeDelivery: {
      //To identify if bot is linked to shop
      type: Boolean,
      default: false
    },
    shipped: {
      //To identify if bot is linked to shop
      type: Boolean,
      default: false
    },
    logo: {
      type: String,
      default: '/images/avatars/shop.png'
    },
    responseTo: {
      type: String,
      default: 'all'
    },
    isDelete: {
      type: Boolean,
      default: false
    },
    isUser: {
      type: Boolean,
      default: false
    },
    deliveryCities: {
      type: [Schema.Types.ObjectId],
      ref: City
    },
    undeliveryZones: Object,
    assistantId: String,
    assistantFileId: String,
    fileId: String,
    threads: Object,
    language: String,
    pixelId: String,
    adToken: String,
    notifyGroup: String,
    pass: String,
    shipping: String,
    prompt: String,
    model: String,
    prompt_id: String,
    verbocity: String,
    effort: String,
    instructions: String, //response instructions (promt+instruction)
    instruction: String,
    data: String,
    deliveryDelay: {
      type: Number,
      default: 1
    },
    deliveryCompanies: {
      type: [Schema.Types.ObjectId],
      ref: 'DeliveryCompany'
    },
    type: {
      type: String,
      default: 'product'
    },
    viewPrompt: {
      type: Boolean,
      default: false
    },
    file: String,
    dontSearch: {
      type: Boolean,
      default: true
    },
    freeCampaign: {
      type: Number,
      default: 1
    },
    saleWithoutStock: {
      //Defini si le stock est obligatoire pour valider une commande ou pas
      type: Boolean,
      default: false
    },
    canRelance: {
      //Determine si l'assisatant lié à la boutique peut éffectué des rélance
      type: Boolean,
      default: false
    },
    isRelance: {
      //Determine si la relance est activée pour sur la boutique
      type: Boolean,
      default: false
    },
    isRdvRelance: {
      //Determine si la rélance des rendez-vous est activée ou pas
      type: Boolean,
      default: false
    },
    isDeliveryRelance: {
      //Determine si la rélance après la livraison est activé ou pas
      type: Boolean,
      default: false
    },
    isResponseRelance: {
      //Determine si la rélance pour des questions sans réponses est activée ou pas
      type: Boolean,
      default: false
    },
    qdrantDocumentsCount: Number,
    qdrantIndexedAt: Date,
    qdrantCollection: String
  },
  { timestamps: true }
)

export default models.Shop || model('Shop', shopSchema)
