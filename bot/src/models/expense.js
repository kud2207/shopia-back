import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import Shop from './shop.js'
import User from './user.js'
import DeliveryCompany from './deliveryCompany.js'

let motifSchema = new Schema(
  {
    title: String,
    amount: Number,
    date: Date,
    shop: {
      type: Schema.Types.ObjectId,
      ref: Shop
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: DeliveryCompany
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: User
    }
  },
  { timestamps: true }
)
export default models.Expense || model('Expense', motifSchema)
