/**
 * 📧 Module de gestion des emails (Version Mock pour développement)
 * Remplace les console.log par un vrai service d'envoi (ex: Nodemailer, SendGrid, Resend) en production.
 */

/**
 * Génère un mot de passe aléatoire temporaire
 * @param {number} length - Longueur du mot de passe
 * @returns {string} Mot de passe généré
 */
export function generatePassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

/**
 * Génère un token de réinitialisation de mot de passe
 * @returns {string} Token aléatoire
 */
export function generateResetToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Envoie un email de bienvenue (Mock)
 */
export async function sendWelcomeEmail({ email, name, password, plan, shopName }) {
  console.log(`[📧 EMAIL MOCK] Envoi email de bienvenue à ${email}`);
  console.log(`👤 Nom: ${name} | 🔑 Mot de passe: ${password} | 📦 Plan: ${plan} | 🏪 Boutique: ${shopName}`);
  return true;
}

/**
 * Envoie un email d'invitation pour un nouvel admin (Mock)
 */
export async function sendInvitationEmail({ email, name, role, password, invitedBy }) {
  console.log(`[📧 EMAIL MOCK] Envoi email d'invitation admin à ${email}`);
  console.log(`👤 Nom: ${name} | 🎭 Rôle: ${role} | 🔑 Mot de passe: ${password} | 👑 Invité par: ${invitedBy}`);
  return true;
}

/**
 * Envoie un email de réinitialisation de mot de passe (Mock)
 */
export async function sendPasswordResetEmail({ email, name, token, expiresIn }) {
  console.log(`[📧 EMAIL MOCK] Envoi email de reset password à ${email}`);
  console.log(`👤 Nom: ${name} | 🔗 Token: ${token} | ⏳ Valide: ${expiresIn}`);
  return true;
}

/**
 * Envoie un email de changement de statut de ticket (Mock)
 */
export async function sendTicketStatusEmail({ email, ticketId, subject, newStatus, adminName }) {
  console.log(`[📧 EMAIL MOCK] Envoi email statut ticket à ${email}`);
  console.log(`🎫 Ticket: ${ticketId} | 📝 Sujet: ${subject} | 🔄 Nouveau statut: ${newStatus} | 👨‍💼 Admin: ${adminName}`);
  return true;
}

/**
 * Envoie un email d'assignation de ticket (Mock)
 */
export async function sendTicketAssignmentEmail({ email, ticketId, subject, priority, assignedBy }) {
  console.log(`[📧 EMAIL MOCK] Envoi email assignation ticket à ${email}`);
  console.log(`🎫 Ticket: ${ticketId} | 📝 Sujet: ${subject} | ⚠️ Priorité: ${priority} | 👨‍💼 Assigné par: ${assignedBy}`);
  return true;
}

/**
 * Envoie un email de réponse à un ticket (Mock)
 */
export async function sendTicketReplyEmail({ email, ticketId, subject, replyContent, adminName }) {
  console.log(`[📧 EMAIL MOCK] Envoi email réponse ticket à ${email}`);
  console.log(`🎫 Ticket: ${ticketId} | 📝 Sujet: ${subject} | 👨‍💼 Admin: ${adminName} | 💬 Réponse: ${replyContent.substring(0, 50)}...`);
  return true;
}

/**
 * Envoie un email de fermeture de ticket (Mock)
 */
export async function sendTicketClosedEmail({ email, ticketId, subject, closureReason, adminName }) {
  console.log(`[📧 EMAIL MOCK] Envoi email fermeture ticket à ${email}`);
  console.log(`🎫 Ticket: ${ticketId} | 📝 Sujet: ${subject} | 🚪 Raison: ${closureReason} | 👨‍💼 Admin: ${adminName}`);
  return true;
}