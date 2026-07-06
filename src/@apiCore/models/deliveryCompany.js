import { Schema, model, models } from 'mongoose'
import Shop from './shop'
import companyAdress from './companyAdress'
import deliveryPricing from './deliveryPricing'

let deliveryServiceSchema = new Schema(
  {
    name: String,
    description: String,
    logo: {
      type: String,
      default: '/images/logos/service.png'
    },
    currency: String,
    phone: String,
    email: String,
    type: String, //internal, partner
    pass: String,
    user: {
      type: Schema.Types.ObjectId, //Admin user
      ref: 'User'
    },

    shops: {
      type: [Schema.Types.ObjectId],
      ref: Shop
    },
    adress: {
      type: [Schema.Types.ObjectId],
      ref: companyAdress
    },
    users: {
      type: [Schema.Types.ObjectId],
      ref: 'User'
    },
    pricings: {
      type: [Schema.Types.ObjectId],
      ref: deliveryPricing
    },
    deletedAt: {
      type: Boolean,
      default: false
    },
    isVerify: {
      type: Boolean,
      default: false
    },
    isUser: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

deliveryServiceSchema.methods.addAdress = function (val) {
  if (this.adress && !this.adress.includes(val) && this.adress.length) this.adress = this.adress.concat([val])
  else if (val && !this.adress.length && Array.isArray(val)) this.adress = val
  else if (val && !this.adress.length) this.adress = [val]

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

deliveryServiceSchema.methods.addUser = function (val) {
  if (this.users && !this.users.includes(val) && this.users.length) this.users = this.users.concat([val])
  else if (val && !this.users.length) this.users = [val]

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

deliveryServiceSchema.methods.addPricingItem = function (val) {
  if (this.pricings && !this.pricings.includes(val) && this.pricings.length) this.pricings = this.pricings.concat([val])
  else if (val && !this.pricings.length) this.pricings = [val]

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

deliveryServiceSchema.methods.deletePricingItem = function (val) {
  if (this.pricings && this.pricings.includes(val) && this.pricings.length)
    this.pricings = this.pricings.filter(item => item != val)

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

deliveryServiceSchema.methods.addShop = function (val) {
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

deliveryServiceSchema.methods.removeShop = function (val) {
  if (this.shops && this.shops.includes(val) && this.shops.length) this.shops = this.shops.filter(v => v?.toString() != val)
  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

export default models.DeliveryCompany || model('DeliveryCompany', deliveryServiceSchema)
