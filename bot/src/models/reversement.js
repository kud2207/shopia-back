import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import Shop from './shop.js'


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
