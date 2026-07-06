import pkg from 'mongoose';
const { Schema, model, models } = pkg;
let citySchema = new Schema(
  {
    data: Object
  },
  { timestamps: true }
)

export default models.PayCountry || model('PayCountry', citySchema)
