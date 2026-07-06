import { Schema, model, models } from 'mongoose'

let citySchema = new Schema(
  {
    data: Object
  },
  { timestamps: true }
)

export default models.PayCountry || model('PayCountry', citySchema)
