import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import Country from "./country.js"

let citySchema = new Schema(
  {
    name: String,
    country: {
        type: Schema.Types.ObjectId,
        ref: Country,
      },
  },
  { timestamps: true }
);

export default models.City || model("City", citySchema);
