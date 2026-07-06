import dbConnect from '../lib/mongodb'
import notifications from '../models/notifications'

const createNotification = async (
  title,
  shopId,
  companyId,
  content,
  redirectionLink,
  read,
  label,
  io,
  driver = '',
  order = ''
) => {
  await dbConnect()

  return new Promise((acc, rej) => {
    if (title && (shopId || companyId || driver)) {
      if (shopId) {
        const data2 = {
          title,
          content,
          shop: shopId,
          redirectionLink: redirectionLink || 'orders',
          redirectionLabel: label,
          read
        }
        if (order) data2.order = order
        const notifcation = new notifications(data2)
        notifcation
          .save()
          .then(data => {
            if (io) io.to(shopId).emit('new_notification', data)
            acc(data)
          })
          .catch(err => {
            rej(err)
          })
      }

      if (title && companyId) {
        const data1 = {
          title,
          content,
          company: companyId,
          redirectionLink: redirectionLink || 'orders',
          redirectionLabel: label,
          read
        }
        if (order) data1.order = order

        const notifcation = new notifications(data1)
        notifcation
          .save()
          .then(data => {
            if (io) io.to(companyId).emit('new_notification', data)
            acc(data)
          })
          .catch(err => {
            rej(err)
          })
      }
      if (title && driver) {
        const data3 = {
          title,
          content,
          toChanel: driver,
          redirectionLink: redirectionLink || 'orders',
          redirectionLabel: label,
          read
        }
        const notifcation = new notifications(data3)
        notifcation
          .save()
          .then(data => {
            if (io) io.to(companyId).emit('new_notification', data)
            acc(data)
          })
          .catch(err => {
            rej(err)
          })
      }
    } else {
      rej(new Error('Veillez entrer tous les parametres svp'))
    }
  })
}

module.exports = { createNotification }
