import pkg from 'mongoose';
const { Schema, model, models } = pkg;
let motifSchema = new Schema(
  {
    title: String,
    description: String,
  },
  { timestamps: true },
);
export default models.Motif || model("Motif", motifSchema);
