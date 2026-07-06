import { Schema, model, models } from 'mongoose'

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom du rôle est requis'],
      unique: true,
      enum: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'],
      trim: true
    },
    label: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    permissions: {
      dashboard: { type: Boolean, default: false },
      boutiques: { type: Boolean, default: false },
      finances: { type: Boolean, default: false },
      utilisateurs: { type: Boolean, default: false },
      tickets: { type: Boolean, default: false },
      rapports: { type: Boolean, default: false }
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

// Permissions par défaut par rôle
roleSchema.statics.getPermissionsByRole = function(role) {
  const permissionsMap = {
    super_admin: {
      dashboard: true,
      boutiques: true,
      finances: true,
      utilisateurs: true,
      tickets: true,
      rapports: true
    },
    admin_support: {
      dashboard: true,
      boutiques: true,
      finances: false,
      utilisateurs: false,
      tickets: true,
      rapports: true
    },
    admin_financier: {
      dashboard: true,
      boutiques: false,
      finances: true,
      utilisateurs: false,
      tickets: false,
      rapports: true
    },
    admin_commercial: {
      dashboard: true,
      boutiques: true,
      finances: false,
      utilisateurs: false,
      tickets: false,
      rapports: true
    }
  }
  return permissionsMap[role] || permissionsMap.admin_support
}

export default models.Role || model('Role', roleSchema)