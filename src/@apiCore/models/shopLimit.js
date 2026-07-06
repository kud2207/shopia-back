import { Schema, model, models } from 'mongoose'
import shop from './shop'

const shopLimitSchema = new Schema({
  shopId: {
    type: Schema.Types.ObjectId,
    ref: shop
  },
  date: String, // YYYY-MM-DD
  count: Number,
  autoPaused: Boolean
})

export default models.ShopLimit || model('ShopLimit', shopLimitSchema)
