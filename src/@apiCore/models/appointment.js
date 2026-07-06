import { Schema, model, models } from 'mongoose'
import Shop from '@models/shop'
import User from '@models/user'

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
