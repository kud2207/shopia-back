import pkg from 'mongoose';
const { Schema, model, models } = pkg;//Model pour gérer le montant à reversé
let reversementSchema = new Schema(
  {
    amount: Number,
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
)

export default models.Earn || model('Earn', reversementSchema)
