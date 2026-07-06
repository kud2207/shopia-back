import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import OrderItem from './orderItem.js'
import Shop from './shop.js'
import User from './user.js'
import Motif from './motif.js'

let orderSchema = new Schema(
  {
    order_id: Number, //Can be autoincrement
    description: String,
    total: Number, //Order total price
    shop: {
      type: Schema.Types.ObjectId,
      ref: Shop
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: User
    },
    items: {
      type: [Schema.Types.ObjectId],
      ref: OrderItem
    },
    date: Date,
    olddate: Date,
    deliveryPrice: Number, //delivery price
    company: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryCompany'
    },
    deliveryInfo: Object, // ex: {address, city, date}
    canal: String,
    botId: String,
    type: String,
    quantity: Number,
    price: Number,
    stock: {
      type: [Schema.Types.ObjectId],
      ref: 'Stock'
    },
    livreur: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    transferedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveryDate: Date,
    olddeliveryDate: Date,
    status: {
      type: String,
      default: 'En attente'
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Order'
    },
    zone: {
      type: Schema.Types.ObjectId,
      ref: 'Zone'
    },
    phone: String,
    adress: String,
    note: String,
    total: Number,
    deliveryCost: Number,
    city: String,
    name: String,
    motif: {
      type: Schema.Types.ObjectId,
      ref: Motif
    },
    initialOrder: Object,
    stocks: Object,
    comptabilityDate: Date,
    driver: {
      type: Schema.Types.ObjectId,
      ref: User
    },
    shippingCost: {
      type: Number,
      default: 0
    }, //Shipping price
    isPrepaid: {
      type: Boolean,
      default: false
    },
    isCustomerPaidDelivery: {
      type: Boolean,
      default: false
    },
    motifDetail: String
  },
  { timestamps: true }
)

orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const result = await mongoose.connection
      .collection('counters')
      .findOneAndUpdate({ _id: 'orderId' }, { $inc: { seq: 1 } }, { returnDocument: 'after', upsert: true })
    this.order_id = result?.seq
  }
  next()
})

export default models.Order || model('Order', orderSchema)
