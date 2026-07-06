import { Schema, model, models } from 'mongoose'
import Shop from './shop'
import User from './user'
import DeliveryCompany from './deliveryCompany'

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
