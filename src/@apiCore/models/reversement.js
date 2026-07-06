import { Schema, model, models } from 'mongoose'
import Shop from './shop'


let reversementSchema = new Schema(
  {
    amount: Number, 
    shop: {
      type: Schema.Types.ObjectId,
      ref: Shop
    },
    date: Date,
    startDate: Date,
    company: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryCompany'
    }
  
  },
  { timestamps: true }
)

export default models.Reversement || model('Reversement', reversementSchema)
