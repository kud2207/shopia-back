import pkg from 'mongoose';
const { Schema, model, models } = pkg;

let shopServiceSchema = new Schema(
  {
    deliveryService: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryService'
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop'
    },
    status: {
      type: String,
      default: 'waiting' //  validate
    }
  },
  { timestamps: true }
)

export default models.ShopService || model('ShopService', shopServiceSchema)
