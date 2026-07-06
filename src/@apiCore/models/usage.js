import { Schema, model, models } from 'mongoose'
import User from './user'
import Shop from './shop'


let usageSchema = new Schema(
  {
    amount: Number, //Order total price
    user: {
      type: Schema.Types.ObjectId,
      ref: User
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: Shop
    }
  },
  { timestamps: true }
)

export default models.Usage || model('Usage', usageSchema)
