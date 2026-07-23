/**
 * @swagger
 * /api/dashboard/utilisateurs/audit-log:
 *   get:
 *     summary: Journal d'audit des actions administrateurs
 *     description: |
 *       Retourne la liste paginée de toutes les actions effectuées par les admins.
 *       
 *       **Filtres disponibles** :
 *       - `search` : Recherche par nom d'admin
 *       - `type_evenement` : tous, connexion, modification, abonnement, suspension, ticket
 *       - `admin_id` : ID de l'admin
 *       - `date_debut` et `date_fin` : Période personnalisée
 *     tags:
 *       - Utilisateurs - Journal d'activité
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom d'admin
 *
 *       - in: query
 *         name: type_evenement
 *         schema:
 *           type: string
 *           enum: [tous, connexion, modification, abonnement, suspension, ticket]
 *           default: tous
 *
 *       - in: query
 *         name: admin_id
 *         schema:
 *           type: string
 *         description: ID de l'admin
 *
 *       - in: query
 *         name: date_debut
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *
 *       - in: query
 *         name: date_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *
 *     responses:
 *       200:
 *         description: Journal d'audit récupéré avec succès
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
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type_evenement:
 *                             type: string
 *                           titre:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date
 *                           heure:
 *                             type: string
 *                           administrateur:
 *                             type: object
 *                           ip_address:
 *                             type: string
 *                           details:
 *                             type: object
 *                     pagination:
 *                       type: object
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import AuditLog from 'src/@apiCore/models/auditLog'
import Admin from 'src/@apiCore/models/admin'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { 
      search = '', 
      type_evenement = 'tous',
      admin_id = '',
      date_debut = '',
      date_fin = '',
      page = 1, 
      limit = 20 
    } = req.query

    // 🔧 Construire les filtres
    const baseFilter = {}

    // Filtre par admin
    if (admin_id) {
      baseFilter.userId = admin_id
    }

    // Filtre par période
    if (date_debut || date_fin) {
      baseFilter.createdAt = {}
      if (date_debut) baseFilter.createdAt.$gte = new Date(date_debut)
      if (date_fin) baseFilter.createdAt.$lte = new Date(date_fin + 'T23:59:59.999Z')
    }

    // Filtre par type d'événement
    if (type_evenement !== 'tous') {
      const actionMap = {
        'connexion': ['LOGIN', 'LOGOUT'],
        'modification': ['UPDATE_ADMIN', 'MODIFY_ACCOUNT', 'UPDATE_PERMISSIONS'],
        'abonnement': ['CHANGE_SUBSCRIPTION', 'REACTIVATE_SHOP', 'CREATE_SUBSCRIPTION'],
        'suspension': ['SUSPEND_ACCOUNT', 'DEACTIVATE_ADMIN', 'DEACTIVATE_COLLABORATOR'],
        'ticket': ['RESOLVE_TICKET', 'CLOSE_TICKET', 'ASSIGN_TICKET']
      }
      
      const actions = actionMap[type_evenement]
      if (actions) {
        baseFilter.action = { $in: actions }
      }
    }

    // Récupérer les logs avec pagination
    const logs = await AuditLog.find(baseFilter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    // Compter le total
    const total = await AuditLog.countDocuments(baseFilter)

    // Formater les résultats
    const formattedLogs = await Promise.all(
      logs.map(async (log) => {
        const admin = await Admin.findById(log.userId)
        
        return {
          id: log._id,
          type_evenement: getEventTypeLabel(log.action),
          titre: getEventTitle(log.action),
          date: log.createdAt?.toISOString().split('T')[0] || '-',
          heure: log.createdAt?.toISOString().split('T')[1]?.substring(0, 5) || '-',
          administrateur: {
            id: admin?._id,
            nom_complet: admin ? `${admin.prenom} ${admin.nom}` : 'Inconnu',
            email: admin?.email || ''
          },
          ip_address: log.ip || '-',
          details: formatDetails(log.action, log.details)
        }
      })
    )

    return res.status(200).json({
      success: true,
      message: 'Journal d\'audit récupéré avec succès',
      data: {
        data: formattedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Audit Log API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// Helpers pour formater les données
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

function formatDetails(action, details) {
  // Formater les détails selon le type d'action
  const formattedDetails = { ...details }
  
  // Exemples de formatage spécifique
  if (action === 'LOGOUT' && details.sessionDuration) {
    formattedDetails.duree_session = formatDuration(details.sessionDuration)
  }
  
  if (action === 'RESOLVE_TICKET' && details.resolutionTime) {
    formattedDetails.temps_traitement = formatDuration(details.resolutionTime)
  }
  
  if (action === 'CHANGE_SUBSCRIPTION' && details.oldPlan && details.newPlan) {
    formattedDetails.evolution_formule = {
      avant: details.oldPlan,
      apres: details.newPlan
    }
  }
  
  if (action === 'REACTIVATE_SHOP' && details.oldStatus && details.newStatus) {
    formattedDetails.changement_statut = {
      avant: details.oldStatus,
      apres: details.newStatus
    }
  }
  
  return formattedDetails
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