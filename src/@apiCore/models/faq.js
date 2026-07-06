import { Schema, model, models } from 'mongoose'

let faqSchema = new Schema(
  {
    title: Object,
    content: Object,
    type: String //marchand, livreur, partenaire
  },
  { timestamps: true }
)

export default models.Faq || model('Faq', faqSchema)
