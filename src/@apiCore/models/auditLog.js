import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'UPDATE_ADMIN',
      'MODIFY_ACCOUNT',
      'UPDATE_PERMISSIONS',
      'CHANGE_SUBSCRIPTION',
      'REACTIVATE_SHOP',
      'CREATE_SUBSCRIPTION',
      'SUSPEND_ACCOUNT',
      'DEACTIVATE_ADMIN',
      'DEACTIVATE_COLLABORATOR',
      'RESOLVE_TICKET',
      'CLOSE_TICKET',
      'ASSIGN_TICKET',
      'CREATE_ADMIN',
      'DELETE_ADMIN'
    ]
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['Admin', 'User', 'Shop', 'Ticket']
  },
  details: {
    type: Object,
    default: {}
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Index pour optimiser les requêtes
auditLogSchema.index({ userId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema)

export default AuditLog