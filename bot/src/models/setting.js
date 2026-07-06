import pkg from 'mongoose';
const { Schema, model, models } = pkg;

let settingSchema = new Schema(
  {
    content: Object //can content all settings like commission ex {commision: 10, commission_type: "number or percent"}
  },
  { timestamps: true }
)

export default models.Setting || model('Setting', settingSchema)
