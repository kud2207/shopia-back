import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import Shop from './shop.js'
import User from './user.js'

let productSchema = new Schema(
  {
    name: String,
    description: String,
    command: String,
    socialLinks: Object, //all social media product links
    price: Number,
    discountPrice: Number,
    negotiablePrice: Number,
    purchasePrice: Number,
    images: Object,
    quantity: {
      type: Number,
      default: 0
    },
    quantityDispacth: {
      type: Number,
      default: 0
    },
    quantityChange: {
      type: Number,
      default: 0
    },
    quantitySale: {
      type: Number,
      default: 0
    },
    total: Number,
    stock: {
      type: Number,
      default: 0
    },
    in_stock: {
      type: Boolean,
      default: true
    },
    isNegotiable: {
      type: Boolean,
      default: false
    },
    notSell: {
      type: Boolean,
      default: false
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: Shop
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: User
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: Shop
    },
    isDelete: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)
productSchema.index({ description: 'text' })
productSchema.index({ name: 'text' })

export default models.Product || model('Product', productSchema)
