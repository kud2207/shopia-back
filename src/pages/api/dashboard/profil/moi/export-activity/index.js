/**
 * @swagger
 * /api/dashboard/profil/moi/export-activity:
 *   post:
 *     summary: Exporter mon activité
 *     description: |
 *       Génère un fichier CSV/PDF de l'historique d'activité de l'admin.
 *     tags:
 *       - Profil Admin
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [csv, pdf]
 *                 default: csv
 *               date_debut:
 *                 type: string
 *                 format: date
 *               date_fin:
 *                 type: string
 *                 format: date
 *
 *     responses:
 *       200:
 *         description: Fichier généré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 download_url:
 *                   type: string
 *                   description: URL de téléchargement du fichier
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Parser } from 'json2csv'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { format = 'csv', date_debut, date_fin } = req.body

    // Construire les filtres
    const filter = { userId: auth.admin._id }
    if (date_debut || date_fin) {
      filter.createdAt = {}
      if (date_debut) filter.createdAt.$gte = new Date(date_debut)
      if (date_fin) filter.createdAt.$lte = new Date(date_fin + 'T23:59:59.999Z')
    }

    // Récupérer toutes les activités
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')

    if (format === 'csv') {
      return await exportToCSV(res, logs)
    } else if (format === 'pdf') {
      return await exportToPDF(res, logs)
    }

    return res.status(400).json({ success: false, message: 'Format non supporté' })

  } catch (error) {
    console.error('❌ Export Activity API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}

async function exportToCSV(res, logs) {
  const fields = ['Date', 'Action', 'Description', 'IP']
  
  const data = logs.map(log => ({
    Date: log.createdAt?.toISOString() || '',
    Action: log.action,
    Description: log.details?.changes || log.details?.action || '',
    IP: log.ip || ''
  }))

  const parser = new Parser({ fields })
  const csv = parser.parse(data)

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="activite_admin_${new Date().toISOString().split('T')[0]}.csv"`)
  
  return res.status(200).send(csv)
}

async function exportToPDF(res, logs) {
  // TODO: Implémenter l'export PDF avec une librairie comme pdfkit ou puppeteer
  // Pour l'instant, on retourne un message
  return res.status(200).json({
    success: true,
    message: 'Export PDF en cours de développement',
    download_url: null,
    expires_at: null
  })
}