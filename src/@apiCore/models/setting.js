import { Schema, model, models } from 'mongoose'

let settingSchema = new Schema(
  {
    content: Object //can content all settings like commission ex {commision: 10, commission_type: "number or percent"}
  },
  { timestamps: true }
)

export default models.Setting || model('Setting', settingSchema)
