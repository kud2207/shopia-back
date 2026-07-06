import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import User from './user.js'
import Shop from './shop.js'


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
