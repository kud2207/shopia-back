import { Schema, model, models } from 'mongoose'
import bcrypt from 'bcrypt'
import Role from './role'

const adminSchema = new Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true
    },
    prenom: {
      type: String,
      required: [true, 'Le prénom est requis'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'L\'email est requis'],
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      select: false,
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'],
      required: [true, 'Le rôle est requis'],
      default: 'admin_support'
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    googleId: {
      type: String,
      sparse: true
    },
    avatar: {
      type: String,
      default: '/images/avatars/admin.png'
    },
    active: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    permissions: {
      dashboard: { type: Boolean, default: false },
      boutiques: { type: Boolean, default: false },
      finances: { type: Boolean, default: false },
      utilisateurs: { type: Boolean, default: false },
      tickets: { type: Boolean, default: false },
      rapports: { type: Boolean, default: false }
    },
    resetToken: String
  },
  { timestamps: true }
)

// Index unique sur email
adminSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $exists: true, $gt: '' }
    }
  }
)

// 🔐 Hash password avant sauvegarde
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.authProvider === 'google') {
    return next()
  }
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// 🔑 Comparer les mots de passe
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.authProvider === 'google') return false
  return await bcrypt.compare(candidatePassword, this.password)
}

// 🎯 Hook pour définir les permissions automatiquement
adminSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    this.permissions = Role.getPermissionsByRole(this.role)
  }
  next()
})

export default models.Admin || model('Admin', adminSchema)