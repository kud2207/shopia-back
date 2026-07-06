import pkg from 'mongoose';
const { Schema, model, models } = pkg;

let zoneSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    zone: {
      type: Schema.Types.ObjectId,
      ref: 'Zone'
    },
    deliveryPrice: Number
  },
  { timestamps: true },
);

export default models.ServiceZone || model("ServiceZone", zoneSchema);
