/**
 * @swagger
 * /api/dashboard/utilisateurs/audit-log/{id}:
 *   get:
 *     summary: Détails complets d'un événement d'audit
 *     description: |
 *       Retourne tous les détails d'un événement du journal d'audit.
 *     tags:
 *       - Utilisateurs - Journal d'activité
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'événement d'audit
 *
 *     responses:
 *       200:
 *         description: Détails de l'événement récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     type_evenement:
 *                       type: string
 *                     titre:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date
 *                     heure:
 *                       type: string
 *                     administrateur:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         nom_complet:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                     ip_address:
 *                       type: string
 *                     user_agent:
 *                       type: string
 *                     details:
 *                       type: object
 *                     metadata:
 *                       type: object
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import AuditLog from 'src/@apiCore/models/auditLog'
import Admin from 'src/@apiCore/models/admin'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      })
    }

    // Trouver le log
    const log = await AuditLog.findById(id)
      .populate('userId', 'name email role prenom nom')
      .populate('targetId')

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      })
    }

    const admin = await Admin.findById(log.userId)

    // Formater les détails complets
    const formattedDetails = {
      type_evenement: getEventTypeLabel(log.action),
      titre: getEventTitle(log.action),
      date: log.createdAt?.toISOString().split('T')[0] || '-',
      heure: log.createdAt?.toISOString().split('T')[1]?.substring(0, 8) || '-',
      administrateur: {
        id: admin?._id,
        nom_complet: admin ? `${admin.prenom} ${admin.nom}` : 'Inconnu',
        email: admin?.email || '',
        role: getRoleLabel(admin?.role)
      },
      ip_address: log.ip || '-',
      user_agent: log.userAgent || '-',
      details: formatFullDetails(log.action, log.details),
      metadata: {
        created_at: log.createdAt?.toISOString(),
        action_code: log.action,
        target_type: log.targetId?.constructor.modelName || 'unknown'
      }
    }

    return res.status(200).json({
      success: true,
      data: formattedDetails
    })

  } catch (error) {
    console.error('❌ Audit Log Details API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// Helpers
function getEventTypeLabel(action) {
  const labels = {
    'LOGIN': 'connexion',
    'LOGOUT': 'deconnexion_admin',
    'UPDATE_ADMIN': 'modification_compte_admin',
    'MODIFY_ACCOUNT': 'modification_compte_abonne',
    'UPDATE_PERMISSIONS': 'changement_permissions',
    'CHANGE_SUBSCRIPTION': 'changement_abonnement',
    'REACTIVATE_SHOP': 'reactivation_boutique',
    'CREATE_SUBSCRIPTION': 'creation_abonnement',
    'SUSPEND_ACCOUNT': 'suspension_compte',
    'DEACTIVATE_ADMIN': 'desactivation_admin',
    'DEACTIVATE_COLLABORATOR': 'desactivation_collaborateur',
    'RESOLVE_TICKET': 'resolution_ticket',
    'CLOSE_TICKET': 'fermeture_ticket',
    'ASSIGN_TICKET': 'assignation_ticket',
    'CREATE_ADMIN': 'creation_admin',
    'DELETE_ADMIN': 'suppression_admin'
  }
  return labels[action] || action.toLowerCase()
}

function getEventTitle(action) {
  const titles = {
    'LOGIN': 'Connexion admin',
    'LOGOUT': 'Déconnexion admin',
    'UPDATE_ADMIN': 'Modification admin',
    'MODIFY_ACCOUNT': 'Modification compte abonné',
    'UPDATE_PERMISSIONS': 'Changement de permissions',
    'CHANGE_SUBSCRIPTION': 'Changement d\'abonnement',
    'REACTIVATE_SHOP': 'Réactivation boutique',
    'CREATE_SUBSCRIPTION': 'Création d\'abonnement',
    'SUSPEND_ACCOUNT': 'Suspension de compte',
    'DEACTIVATE_ADMIN': 'Désactivation admin',
    'DEACTIVATE_COLLABORATOR': 'Désactivation collaborateur',
    'RESOLVE_TICKET': 'Résolution ticket',
    'CLOSE_TICKET': 'Fermeture ticket',
    'ASSIGN_TICKET': 'Assignation ticket',
    'CREATE_ADMIN': 'Création admin',
    'DELETE_ADMIN': 'Suppression admin'
  }
  return titles[action] || action
}

function getRoleLabel(role) {
  const labels = {
    'super_admin': 'Super Admin',
    'admin_support': 'Admin Support',
    'admin_financier': 'Admin Financier',
    'admin_commercial': 'Admin Commercial'
  }
  return labels[role] || role
}

function formatFullDetails(action, details) {
  const formatted = { ...details }
  
  // Formatage spécifique selon le type d'action
  switch (action) {
    case 'LOGOUT':
      if (details.sessionDuration) {
        formatted.duree_session = formatDuration(details.sessionDuration)
      }
      if (details.reason) {
        formatted.raison = details.reason
      }
      break
      
    case 'RESOLVE_TICKET':
    case 'CLOSE_TICKET':
      if (details.ticketId) {
        formatted.ticket_id = details.ticketId
      }
      if (details.shopName) {
        formatted.abonne = details.shopName
      }
      if (details.reason) {
        formatted.raison = details.reason
      }
      if (details.resolutionTime) {
        formatted.temps_traitement = formatDuration(details.resolutionTime)
      }
      break
      
    case 'REACTIVATE_SHOP':
      if (details.shopName) {
        formatted.boutique = details.shopName
      }
      if (details.reason) {
        formatted.raison = details.reason
      }
      if (details.oldStatus && details.newStatus) {
        formatted.changement_statut = {
          avant: details.oldStatus,
          apres: details.newStatus
        }
      }
      break
      
    case 'CHANGE_SUBSCRIPTION':
      if (details.shopName) {
        formatted.boutique = details.shopName
      }
      if (details.oldPlan && details.newPlan) {
        formatted.evolution_formule = {
          avant: details.oldPlan,
          apres: details.newPlan
        }
      }
      break
      
    case 'MODIFY_ACCOUNT':
      if (details.shopName) {
        formatted.boutique = details.shopName
      }
      if (details.changes) {
        formatted.changements = details.changes
      }
      break
      
    case 'SUSPEND_ACCOUNT':
    case 'DEACTIVATE_ADMIN':
      if (details.reason) {
        formatted.motif = details.reason
      }
      break
      
    default:
      break
  }
  
  return formatted
}

function formatDuration(milliseconds) {
  if (!milliseconds) return '-'
  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours} heure${hours > 1 ? 's' : ''}`
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}