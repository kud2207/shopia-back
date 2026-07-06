/**
 * ✅ Valide les données d'un admin
 */
export const validateAdminData = (data, isUpdate = false) => {
  const errors = []

  if (!isUpdate) {
    if (!data.nom || data.nom.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères')
    }
    if (!data.prenom || data.prenom.trim().length < 2) {
      errors.push('Le prénom doit contenir au moins 2 caractères')
    }
    if (!data.email || !isValidEmail(data.email)) {
      errors.push('Email invalide')
    }
    if (!data.role) {
      errors.push('Le rôle est requis')
    }
  }

  // Validation mot de passe (si fourni)
  if (data.password !== undefined) {
    if (data.authProvider === 'local' && !data.password) {
      errors.push('Le mot de passe est requis pour un compte local')
    }
    if (data.password && data.password.length < 6) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères')
    }
  }

  // Validation rôle
  const validRoles = ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial']
  if (data.role && !validRoles.includes(data.role)) {
    errors.push(`Rôle invalide. Valeurs acceptées: ${validRoles.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 📧 Validation email
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}