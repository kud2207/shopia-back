import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import Shop from './shop.js'
import User from './user.js'

let productSchema = new Schema(
  {
    name: String,
    phone: String,
    nom: String,
    motif: String,
    time: String,
    description: String,
    date: Date,
    phone: String,
    adresse: String,
    quantity: {
      type: Number,
      default: 0
    },
    total: Number,
    status: {
      type: String,
      default: 'En attente'
    },
    type: String,
    shop: {
      type: Schema.Types.ObjectId,
      ref: Shop
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: User
    }
  },
  { timestamps: true }
)

export default models.Appointment || model('Appointment', productSchema)
