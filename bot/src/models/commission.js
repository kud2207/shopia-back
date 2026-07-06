//Model pour gérer le commission enregistré
import pkg from 'mongoose';
const { Schema, model, models } = pkg;

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
