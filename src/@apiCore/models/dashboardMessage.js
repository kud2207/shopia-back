import { Schema, model, models } from "mongoose";

const dashboardMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "senderModel"
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["Admin", "User"]
    },
    receiver: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "receiverModel"
    },
    receiverModel: {
      type: String,
      required: true,
      enum: ["Admin", "User"]
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    },
    text: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default models.DashboardMessage || model("DashboardMessage", dashboardMessageSchema);
