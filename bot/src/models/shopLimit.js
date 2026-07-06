import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import shop from './shop.js'

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
