import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import order from './order.js'

let orderActivitySchema = new Schema(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: order
        },
        activityLabel: String,
        activityContent: String
    },
    { timestamps: true }
)

export default models.OrderActivity || model('OrderActivity', orderActivitySchema)