import pkg from 'mongoose';
const { Schema, model, models } = pkg;
let faqSchema = new Schema(
  {
    title: Object,
    content: Object,
    type: String //marchand, livreur, partenaire
  },
  { timestamps: true }
)

export default models.Faq || model('Faq', faqSchema)
