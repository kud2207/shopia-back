// import { Schema, model, models } from 'mongoose'
// import user from './user'
// import shop from './shop'
// import deliveryCompany from './deliveryCompany'
// import order from './order'

// let NotificationSchema = new Schema(
//   {
//     title: String,
//     content: String,
//     toChannel: {
//       type: Schema.Types.ObjectId,
//       ref: user
//     },

//     shop: {
//       type: Schema.Types.ObjectId,
//       ref: shop
//     },
//     order: {
//       type: Schema.Types.ObjectId,
//       ref: order
//     },
//     company: {
//       type: Schema.Types.ObjectId,
//       ref: deliveryCompany
//     },
//     redirectionLink: String,
//     redirectionLabel: {
//       type: String,
//       default: 'Details'
//     },
//     read: {
//       type: Boolean,
//       default: false
//     }
//   },
//   { timestamps: true }
// )
// export default models.Notification || model('Notification', NotificationSchema)

import { Schema, model, models } from 'mongoose'
import user from './user'
import shop from './shop'
import deliveryCompany from './deliveryCompany'
import order from './order'

let NotificationSchema = new Schema(
  {
    // ===== ANCIENS CHAMPS (rétrocompatibilité) =====
    title: String,
    content: String,
    toChannel: {
      type: Schema.Types.ObjectId,
      ref: user
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: shop
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: order
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: deliveryCompany
    },
    redirectionLink: String,
    redirectionLabel: {
      type: String,
      default: 'Details'
    },
    read: {
      type: Boolean,
      default: false
    },

    // ===== NOUVEAUX CHAMPS (optionnels, pour le dashboard admin) =====
    type: {
      type: String,
      enum: [
        'nouvelle_inscription',
        'stock_critique',
        'transaction_bloquee',
        'ticket_resolu',
        'abonnement_expirant',
        'boutique_inactive',
        'paiement_recu',
        'nouvelle_commande'
      ]
    },
    category: {
      type: String,
      enum: ['commandes', 'alertes', 'finance', 'support']
    },
    priority: {
      type: String,
      enum: ['critique', 'warning', 'nouveau', 'info'],
      default: 'info'
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'Admin'
    }],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
    }
  },
  { timestamps: true }
)

// Index pour optimiser les requêtes
NotificationSchema.index({ category: 1, createdAt: -1 })
NotificationSchema.index({ read: 1, createdAt: -1 })
NotificationSchema.index({ toChannel: 1, createdAt: -1 })
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default models.Notification || model('Notification', NotificationSchema)