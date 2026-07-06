import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import user from './user.js'
import shop from './shop.js'
import deliveryCompany from './deliveryCompany.js'
import order from './order.js'

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
