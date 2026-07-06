import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import jwt from 'jsonwebtoken'
import Plan from './plan.js'
import shop from './shop.js'
import deliveryCompany from './deliveryCompany.js'
import Commission from './commission.js'
import zone from './zone.js'

let userSchema = new Schema(
  {
    name: String,
    first_name: String,
    last_name: String,
    referrer: String, //Pour enregistrer le code de parainage
    referrerCode: String, //Pour enregistrer le code de parainage du parrain
    email: {
      type: String,
      unique: true
    },
    phone: {
      type: String,
      unique: true
    },
    role: String, //marchand, shop-admin,dmin, admin-entreprise, gestionnaire, caissiere, livreur,
    description: String,
    sexe: String,
    image: {
      type: String,
      default: '/images/avatars/1.png'
    },
    active: {
      type: Boolean,
      default: true
    },
    viewAccess: {
      type: Boolean,
      default: false
    },
    manageExpense: {
      type: Boolean,
      default: false
    },
    isShopUser: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      select: false
    },
    resetToken: String,
    country: {
      type: Schema.Types.ObjectId,
      ref: 'Country'
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: Plan
    },
    companyName: String,
    companyDes: String,
    logo: {
      type: String,
      default: '/images/logos/service.png'
    },
    companyPhone: String,
    companyEmail: String,
    subscription_date: Date,
    expire_date: Date,
    commission: {
      type: [Schema.Types.ObjectId],
      ref: Commission
    },
    referral: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    totalAmount: Number,
    momoPhone: String,
    ibanNumber: String,
    pushToken: String,
    aiAmount: {
      type: Number,
      default: 5
    },
    settings: Object, //to configure commission setting
    shops: {
      type: [Schema.Types.ObjectId],
      ref: shop
    },
    deliveryCompanies: {
      type: [Schema.Types.ObjectId],
      ref: deliveryCompany
    },
    zones: {
      type: [Schema.Types.ObjectId],
      ref: zone
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' } // Index géospatial
    },
    orders: {
      type: [Schema.Types.ObjectId],
      ref: 'Order'
    },
    isTest: {
      //Check if user alrady try assistant
      type: Boolean,
      default: false
    },
    validate_token: String,
    earn: {
      type: Schema.Types.ObjectId,
      ref: 'Earn'
    }
  },
  { timestamps: true }
)
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $exists: true, $gt: '' }
    }
  }
)

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $exists: true, $gt: '' }
    }
  }
)

// Use this function to generate user token
userSchema.methods.generateToken = function () {
  let payload = {
    userId: this._id,
    phone: this.phone,
    email: this.email,
    role: this.role
  }

  return {
    token: jwt.sign(payload, process.env.JWT_TOKEN, {
      expiresIn: '3650 days'
    }),
    expiresIn: expiresIn(3650)
  }
}

function expiresIn(days) {
  const currentDate = new Date()
  const futureDate = new Date(currentDate)
  futureDate.setDate(currentDate.getDate() + days)

  return futureDate
}

// Use this function to generate  reset token
userSchema.methods.generateResetToken = async function () {
  let payload = {
    userId: this._id,
    phone: this.phone,
    email: this.email,
    role: this.role
  }

  let token = jwt.sign(payload, process.env.JWT_TOKEN, {
    expiresIn: 15 * 60
  })
  this.resetToken = token
  await this.save()

  return token
}

userSchema.methods.addCompany = function (val) {
  if (this.deliveryCompanies && !this.deliveryCompanies.includes(val) && this.deliveryCompanies.length)
    this.deliveryCompanies = this.deliveryCompanies.concat([val])
  else if (val && !this.deliveryCompanies.length) this.deliveryCompanies = [val]

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

userSchema.methods.addService = function (val) {
  if (this.services && !this.services.includes(val) && this.services.length) this.services = this.services.concat([val])
  else if (val && !this.services.length) this.services = [val]

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

userSchema.methods.removeService = function (val) {
  if (this.services.includes(val)) this.services = this.services.filter(item => item != val)

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

userSchema.methods.addShop = function (val) {
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

userSchema.methods.removeShop = function (val) {
  if (this.shops.includes(val)) this.shops = this.shops.filter(item => item != val)

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}

userSchema.methods.addOrder = function (val) {
  if (this.orders && !this.orders.includes(val) && this.orders.length) this.orders = this.orders.concat([val])
  else if (val && !this.orders.length) this.orders = [val]

  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}
userSchema.methods.setToken = function (val) {
  this.validate_token = val
  return this.save()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}
export default models.User || model('User', userSchema)
