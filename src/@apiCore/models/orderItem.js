import { Schema, model, models } from 'mongoose'
import product from './product'

let orderItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: product
    },
    quantity: Number,
    total: Number //OrderItem total price
  },
  { timestamps: true }
)
export default models.OrderItem || model('OrderItem', orderItemSchema)
