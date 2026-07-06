import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import zone from './zone.js'

let deliveryServiceSchema = new Schema(
  {
    price: String,
    name: String,
    description: String,
    currency: String,
    zone: {
      type: Schema.Types.ObjectId,
      ref: zone
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: 'City'
    },
    index: Number,
    deliveryCompany: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryCompany'
    }
  },
  { timestamps: true }
)

export default models.DeliveryPricing || model('DeliveryPricing', deliveryServiceSchema)
