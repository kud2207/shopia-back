import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import product from './product.js'
import user from './user.js'
import shop from './shop.js'

let campaignSchema = new Schema(
  {
    id: String,
    name: String, // Nom de la campagne
    description: String, // Description de la campagne

    // Programmation
    triggerDate: Date, // Date de déclenchement
    triggerTime: String, // Heure de déclenchement (HH:MM)
    timezone: String, // Fuseau horaire (ex: "Africa/Douala")
    nextDate: Date,
    // Statut et état
    status: {
      type: String,
      enum: ['Brouillon', 'Programmée', 'Active', 'Terminée', 'Annulée', 'En pause', 'En cours'],
      default: 'Brouillon'
    },
    sendStatus: {
      type: String,
      default: 'in_progress'
    },
    // Ciblage
    targetType: String,
    // Pour targetType: "orders"
    minOrders: Number,
    maxOrders: Number,
    orderDateRange: {
      from: Date,
      to: Date
    },

    // Pour targetType: "products"
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: product
      }
    ],

    // Références aux produits
    productCategories: [String],

    // Pour targetType: "custom"
    customFilters: {
      location: [String],
      ageRange: {
        min: Number,
        max: Number
      },
      lastActivity: Date
    },
    isGroup: Boolean,

    // Contenu de la campagne
    contentBlocks: Object,

    // Métadonnées et suivi
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: user
    }, // ID de l'utilisateur créateur

    shop: {
      type: Schema.Types.ObjectId,
      ref: shop
    }, // ID de l'utilisateur créateur

    //Montant de la campagne
    amount: {
      type: Number,
      default: 0
    },
    isPay: {
      type: Boolean,
      default: false
    },
    totalParticipant: Number,

    lastExecutedAt: Date,
    endAt: Date,

    // Liste des paricipant
    participants: Object,

    //Liste des contacts importés
    contacts: Object,
    groups: Object,
    // Statistiques
    stats: {
      totalTargets: Number, // Nombre total de destinataires ciblés
      sent: Number, // Messages envoyés
      delivered: Number, // Messages délivrés
      read: Number, // Messages lus
      replied: Number, // Réponses reçues
      errors: Number // Erreurs d'envoi
    },

    // Configuration avancée
    settings: {
      maxSendRate: Number, // Messages par minute (limite rate)
      retryFailures: Boolean,
      maxRetries: Number,
      trackReadReceipts: Boolean,
      allowReplies: Boolean
    }
  },
  { timestamps: true }
)

export default models.Campaign || model('Campaign', campaignSchema)
