//Model pour gérer le commission enregistré
import { models } from 'mongoose'
import { Schema, model } from 'mongoose'

const affiliateSchema = new Schema({
  amount: Number,
  buyAmount: Number,
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
})

export default models.Commission || model('Commission', affiliateSchema)
