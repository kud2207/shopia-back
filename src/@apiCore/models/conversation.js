import { Schema, model, models } from "mongoose";

const conversationSchema = new Schema(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },
    
    admin: {
      type: Schema.Types.ObjectId,
      ref: "Admin"
    },
    
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    
    unreadCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index pour optimiser le tri par dernière activité
conversationSchema.index({ shop: 1, lastMessageAt: -1 });
conversationSchema.index({ admin: 1, lastMessageAt: -1 });

export default models.Conversation || model("Conversation", conversationSchema);