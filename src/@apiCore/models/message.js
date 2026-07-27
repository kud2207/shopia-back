// import { Schema, model, models } from "mongoose";

// let messageSchema = new Schema(
//   {
//     message: Object,
//     usage: Object,
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//     },
//     shop: {
//       type: Schema.Types.ObjectId,
//       ref: "Shop",
//     },
//   },
//   { timestamps: true }
// );

// export default models.Message || model("Message", messageSchema);


import { Schema, model, models } from "mongoose";

let messageSchema = new Schema(
  {
    // ===== ANCIENS CHAMPS (pour rétrocompatibilité) =====
    message: Object,  // Pour les anciens messages d'assistant IA
    usage: Object,    // Pour les tokens OpenAI, etc.
    
    // ===== NOUVEAUX CHAMPS (pour la messagerie) =====
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: function() {
        // Requis seulement pour les nouveaux messages de messagerie
        return !this.message;
      }
    },
    
    sender: {
      type: Schema.Types.ObjectId,
      refPath: "senderModel",
      required: function() {
        return !this.message;
      }
    },
    
    senderModel: {
      type: String,
      enum: ["Admin", "User"],
      required: function() {
        return !this.message;
      }
    },
    
    senderType: {
      type: String,
      enum: ["admin", "shop"],
      required: function() {
        return !this.message;
      }
    },
    
    content: {
      type: String,
      required: function() {
        return !this.message;
      }
    },
    
    type: {
      type: String,
      enum: ["texte", "fichier", "assistant"],
      default: "texte"
    },
    
    fileUrl: String,
    fileName: String,
    
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: "Admin"
    }],
    
    isDeleted: {
      type: Boolean,
      default: false
    },
    
    deletedAt: Date,
    
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin"
    }
    
    // ===== CHAMPS COMMUNS =====
  },
  { timestamps: true }
);

// Index pour optimiser les requêtes
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ shop: 1, createdAt: -1 });
messageSchema.index({ user: 1, createdAt: -1 });

export default models.Message || model("Message", messageSchema);