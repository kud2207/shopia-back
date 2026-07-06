import { Schema, model, models } from 'mongoose'
import user from './user'
import shop from './shop'
import deliveryCompany from './deliveryCompany'
import order from './order'

let NotificationSchema = new Schema(
  {
    title: String,
    content: String,
    toChannel: {
      type: Schema.Types.ObjectId,
      ref: user
    },

    shop: {
      type: Schema.Types.ObjectId,
      ref: shop
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: order
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: deliveryCompany
    },
    redirectionLink: String,
    redirectionLabel: {
      type: String,
      default: 'Details'
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)
export default models.Notification || model('Notification', NotificationSchema)
