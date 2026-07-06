import { Schema, model, models } from 'mongoose'
import ShopService from './shopService'

let deliveryServiceSchema = new Schema(
  {
    name: String,
    description: String,
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: 'City'
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: 'Country'
    },
    minPrice: Number,
    maxPrice: Number,
    deliveryZonnes: Object,
    currency: String,
    shops: {
      type: [Schema.Types.ObjectId],
      ref: ShopService
    },
    deleted: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
)

deliveryServiceSchema.methods.addService = function (val) {
  if (this.shops && !this.shops.includes(val) && this.shops.length) this.shops = this.shops.concat([val])
  else if (val && !this.shops.length) this.shops = [val]

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

deliveryServiceSchema.methods.removeService = function (val) {
  if (this.shops.includes(val)) this.shops = this.shops.filter(item => item != val)

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

export default models.DeliveryService || model('DeliveryService', deliveryServiceSchema)
