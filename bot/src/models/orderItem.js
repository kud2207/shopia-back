import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import product from './product.js'

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
