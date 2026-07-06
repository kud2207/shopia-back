import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import Product from './product.js'
import user from './user.js'

let stockSchema = new Schema(
  {
    jour: Date,
    stockDisponible: Number,
    stockEnAjout: Number,
    stockVendu: Number,
    produitEchanger: Number,
    ajoutJourSuivant: Number,
    nombreLivraison: Number,
    stockTransferer: {
      type: Number,
      default: 0
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: Product,
      required: true
    },
    livreur: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryCompany'
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    delivery: {
      type: [Schema.Types.ObjectId],
      ref: 'Order'
    },

    codelivery: {
      type: [Schema.Types.ObjectId],
      ref: 'Order'
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Stock'
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: user
    },
    isDelete: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

stockSchema.methods.addToDelivery = async function (id) {
  if (!this.delivery.includes(id)) this.delivery.push(id)

  await this.save()

  return this.delivery
}

stockSchema.methods.addToCoDelivery = async function (id) {
  if (!this.codelivery.includes(id)) this.codelivery.push(id)

  await this.save()

  return this.codelivery
}

export default models.Stock || model('Stock', stockSchema)
