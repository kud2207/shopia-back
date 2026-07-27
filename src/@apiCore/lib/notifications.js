import Notification from '../models/notification'

/**
 * Génère une notification pour nouvelle inscription
 */
export async function createNewSubscriptionNotification(shop) {
  return await Notification.create({
    type: 'nouvelle_inscription',
    title: 'Nouvelle inscription',
    content: `Un nouvel e-commerçant ${shop.name} vient de s'inscrire et attend une validation. Action requise.`,
    category: 'commandes',
    priority: 'nouveau',
    shop: shop._id,
    redirectionLink: `/dashboard/utilisateurs/abonnes/${shop._id}`,
    redirectionLabel: 'Voir la boutique',
    metadata: {
      boutique_nom: shop.name,
      boutique_id: shop._id
    }
  })
}

/**
 * Génère une notification pour stock critique
 */
export async function createLowStockNotification(product, shop) {
  return await Notification.create({
    type: 'stock_critique',
    title: 'Stock critique',
    content: `Le stock du produit '${product.name}' est inférieur à 10% chez ${shop.name}`,
    category: 'alertes',
    priority: 'critique',
    shop: shop._id,
    redirectionLink: `/dashboard/boutiques/${shop._id}`,
    redirectionLabel: 'Voir la boutique',
    metadata: {
      produit_nom: product.name,
      livreur_nom: shop.name,
      product_id: product._id
    }
  })
}

/**
 * Génère une notification pour transaction bloquée
 */
export async function createBlockedTransactionNotification(order) {
  return await Notification.create({
    type: 'transaction_bloquee',
    title: 'Transaction bloquée',
    content: `Paiement en attente depuis plus de 48h pour la commande ${order.orderNumber || order._id}`,
    category: 'finance',
    priority: 'critique',
    order: order._id,
    redirectionLink: `/dashboard/finances/rapports/global`,
    redirectionLabel: 'Voir les transactions',
    metadata: {
      commande_id: order.orderNumber || order._id,
      montant: order.total,
      order_id: order._id
    }
  })
}

/**
 * Génère une notification pour ticket résolu
 */
export async function createTicketResolvedNotification(ticket, admin) {
  return await Notification.create({
    type: 'ticket_resolu',
    title: `${ticket.ticketId || 'Ticket'} résolu`,
    content: `Le ticket ${ticket.ticketId || ticket._id} a été marqué comme résolu par ${admin?.prenom || ''} ${admin?.nom || ''}`,
    category: 'support',
    priority: 'info',
    redirectionLink: `/dashboard/utilisateurs/tickets/${ticket._id}`,
    redirectionLabel: 'Voir le ticket',
    metadata: {
      ticket_id: ticket.ticketId || ticket._id,
      admin_nom: `${admin?.prenom || ''} ${admin?.nom || ''}`,
      ticket: ticket._id
    }
  })
}

/**
 * Génère une notification pour abonnement expirant
 */
export async function createExpiringSubscriptionNotification(shop) {
  return await Notification.create({
    type: 'abonnement_expirant',
    title: 'Abonnement expirant bientôt',
    content: `L'abonnement de ${shop.name} expire dans 3 jours`,
    category: 'alertes',
    priority: 'warning',
    shop: shop._id,
    redirectionLink: `/dashboard/finances/abonnements`,
    redirectionLabel: 'Voir les abonnements',
    metadata: {
      boutique_nom: shop.name,
      boutique_id: shop._id,
      expire_date: shop.expire_date
    }
  })
}

/**
 * Génère une notification pour boutique inactive
 */
export async function createInactiveShopNotification(shop) {
  return await Notification.create({
    type: 'boutique_inactive',
    title: 'Boutique inactive',
    content: `La boutique ${shop.name} est inactive depuis plus de 15 jours`,
    category: 'alertes',
    priority: 'warning',
    shop: shop._id,
    redirectionLink: `/dashboard/boutiques/${shop._id}`,
    redirectionLabel: 'Voir la boutique',
    metadata: {
      boutique_nom: shop.name,
      boutique_id: shop._id
    }
  })
}

/**
 * Génère une notification pour paiement reçu
 */
export async function createPaymentReceivedNotification(shop, amount) {
  return await Notification.create({
    type: 'paiement_recu',
    title: 'Paiement reçu',
    content: `Paiement de ${amount} FCFA reçu pour ${shop.name}`,
    category: 'finance',
    priority: 'info',
    shop: shop._id,
    redirectionLink: `/dashboard/finances/rapports/global`,
    redirectionLabel: 'Voir les finances',
    metadata: {
      boutique_nom: shop.name,
      montant: amount,
      boutique_id: shop._id
    }
  })
}

/**
 * Génère une notification pour nouvelle commande
 */
export async function createNewOrderNotification(order) {
  return await Notification.create({
    type: 'nouvelle_commande',
    title: 'Nouvelle commande',
    content: `Nouvelle commande ${order.orderNumber || order._id} d'un montant de ${order.total} FCFA`,
    category: 'commandes',
    priority: 'nouveau',
    order: order._id,
    redirectionLink: `/dashboard/boutiques/commandes/${order._id}`,
    redirectionLabel: 'Voir la commande',
    metadata: {
      commande_id: order.orderNumber || order._id,
      montant: order.total,
      order_id: order._id
    }
  })
}