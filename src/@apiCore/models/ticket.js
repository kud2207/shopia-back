import { Schema, model, models } from 'mongoose'

const messageSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'authorModel'
    },
    authorModel: {
      type: String,
      enum: ['User', 'Admin'],
      required: true
    },
    content: {
      type: String,
      required: [true, 'Le contenu du message est requis'],
      minlength: [1, 'Le message ne peut pas être vide']
    },
    attachments: [{
      url: String,
      filename: String,
      mimetype: String
    }]
  },
  { timestamps: true }
)

const ticketSchema = new Schema(
  {
    subject: {
      type: String,
      required: [true, 'Le sujet est requis'],
      trim: true,
      maxlength: [200, 'Le sujet ne peut pas dépasser 200 caractères']
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      minlength: [10, 'La description doit contenir au moins 10 caractères']
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'utilisateur est requis']
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      default: null
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['technical', 'billing', 'account', 'order', 'delivery', 'other'],
      default: 'other'
    },
    messages: [messageSchema],
    resolvedAt: {
      type: Date,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    },
    lastResponseAt: {
      type: Date,
      default: null
    },
    attachments: [{
      url: String,
      filename: String,
      mimetype: String
    }],
    tags: [{
      type: String,
      trim: true
    }],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      maxlength: [500, 'Le feedback ne peut pas dépasser 500 caractères'],
      default: null
    },
    ticketNumber: {
      type: String,
      // ❌ SUPPRIMÉ : unique: true (géré par schema.index en bas)
      sparse: true
    },
    responseTime: {
      type: Number,
      default: null
    },
    isDelete: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

// Générer automatiquement le numéro de ticket
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await this.constructor.countDocuments({})
    this.ticketNumber = `TK-${String(count + 1).padStart(6, '0')}`
  }
  next()
})

// Mettre à jour les dates automatiquement
ticketSchema.pre('save', function(next) {
  if (this.isModified('messages') && this.messages.length > 0) {
    this.lastResponseAt = this.messages[this.messages.length - 1].createdAt
  }
  
  if (this.isModified('status')) {
    if (this.status === 'resolved' && !this.resolvedAt) {
      this.resolvedAt = new Date()
    }
    if (this.status === 'closed' && !this.closedAt) {
      this.closedAt = new Date()
    }
  }
  next()
})

// ✅ Index définis UNE SEULE FOIS ici
ticketSchema.index({ status: 1, createdAt: -1 })
ticketSchema.index({ user: 1, status: 1 })
ticketSchema.index({ assignedTo: 1, status: 1 })
ticketSchema.index({ ticketNumber: 1 }, { unique: true })

export default models.Ticket || model('Ticket', ticketSchema)