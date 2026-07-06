import { resetPasswordMailTemplate, mailMessages, notifyTemplate } from './mailTemplate.js'
import Shop from '../models/shop.js'
import User from '../models/user.js'

import fs from 'fs'
import { v2 as cloudinary } from 'cloudinary'
// import { v2 as cloudinary1 } from 'cloudinary'
import Mailjet from 'node-mailjet'

import axios from 'axios'
cloudinary.config({
  cloud_name: 'dr6e5gkya',
  api_key: '778166185817824',
  api_secret: 'BYUOcRVWcoAbavF4o77Uh3tF6Zg'
})
// cloudinary1.config({
//   cloud_name: 'de64bnl2j',
//   api_key: '724141139219749',
//   api_secret: 'gChDKVtgtexgbYYFiBktbvP57xg'
// })

export const sendResetPasswordMail = async (email, language, resettoken) => {
  const mailjet = Mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE)
  const resetLink = 'https://shopia-app.com/update-password/' + resettoken
  const html = resetPasswordMailTemplate(resettoken, language)

  const request = mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: process.env.MAILER_EMAIL,
          Name: 'SHOPIA'
        },
        To: [
          {
            Email: email
          }
        ],
        Subject: mailMessages()[language].subject,
        HTMLPart: html
      }
    ]
  })

  request
    .then(result => {
      console.log(result.body)
      return result
    })
    .catch(err => {
      console.log(err.statusCode)
      sendResetPasswordMail1(email, language, resettoken)
    })
}

export const sendResetPasswordMail1 = async (email, language, resettoken) => {
  const nodemailer = await import('nodemailer')
  const resetLink = 'https://shopia-app.com/update-password/' + resettoken

  const html = resetPasswordMailTemplate(resetLink, language)

  let transporter = nodemailer.createTransport({
    port: 465,
    host: process.env.MAILER_HOST,
    auth: {
      user: process.env.MAILER_EMAIL,
      pass: process.env.MAILER_PASSWORD
    },
    secure: true
  })

  let mailOptions = {
    from: {
      name: 'SHOPIA',
      address: process.env.MAILER_EMAIL
    },
    to: email,
    subject: mailMessages()[language].subject,
    html: html
  }

  await new Promise((resolve, reject) => {
    // send mail
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        return resolve(info)
      }
    })
  })
}

export const sendOrderNotification = async (email, message, shopName, title) => {
  const html = notifyTemplate(message, shopName)
  const mailjet = Mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE)

  const request = mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: process.env.MAILER_EMAIL,
          Name: 'SHOPIA'
        },
        To: [
          {
            Email: email
          }
        ],
        Subject: title || 'Nouvelle commande',
        HTMLPart: html
      }
    ]
  })

  request
    .then(result => {
      console.log(result.body)
      return result
    })
    .catch(err => {
      console.log(err.statusCode)
      sendOrderNotification1(email, message, shopName, title)
    })
}

export const sendOrderNotification1 = async (email, message, shopName, title) => {
  const nodemailer = await import('nodemailer')

  const html = notifyTemplate(message, shopName)

  let transporter = nodemailer.createTransport({
    port: 465,
    host: process.env.MAILER_HOST,
    auth: {
      user: process.env.MAILER_EMAIL,
      pass: process.env.MAILER_PASSWORD
    },
    secure: true
  })

  let mailOptions = {
    from: {
      name: 'SHOPIA',
      address: process.env.MAILER_EMAIL
    },
    to: email,
    subject: title || 'Nouvelle commande',
    html: html
  }

  await new Promise((resolve, reject) => {
    // send mail
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        return resolve(info)
      }
    })
  })
}

export const uploadFileWithFormidable = (folder, file, filename = '') => {
  if (file) {
    const data = { resource_type: 'auto' }
    if (filename) {
      const currentDate = new Date()
      const timestamp = currentDate.getTime() // Get timestamp in milliseconds
      const uniqueId = timestamp.toString()
      data.public_id = (uniqueId + filename).replace(/ /g, "_")
    }
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(file.path, data, (error, result) => {
        if (result) {
          resolve(result.secure_url)
        } else {
          console.log('error upload', error)
          reject(error)
        }
      })
    })
  }
}

// export const uploadFileWithFormidableFile = (folder, file) => {
//   if (file) {
//     console.log('file', file)
//     return new Promise((resolve, reject) => {
//       cloudinary1.uploader.upload(file.path,{resource_type: "auto"}, (error, result) => {
//         if (result) {
//           resolve(result.secure_url)
//         } else {
//           console.log('error upload', error)
//           resolve('')
//         }
//       })
//     })
//   }
// }

export const uploadFileWithFormidable1 = (folder, file) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true })
  }

  const oldPath = file.path
  const currentDate = new Date()
  const timestamp = currentDate.getTime() // Get timestamp in milliseconds

  const uniqueId = timestamp.toString()

  const newPath = folder + '/' + uniqueId + '-' + file.name

  // Move the file to the desired location
  fs.rename(oldPath, newPath, err => {
    if (err) {
      console.error('Error moving file:', err)
      // res.status(500).json({ message: 'Server error', ret: false, error, type: 'server_error' })

      return ''
    }
    console.log(newPath)

    return newPath.replace(/^public\//, '/')
  })

  return newPath.replace(/^public\//, '/')
}

export const checkIfUserHasShop = async userId => {
  const shops = await Shop.find({ user: userId })
  const user = await User.findOne({ _id: userId })
  for (let shop of shops) {
    await user.addShop(shop._id)
  }
  return shops
}

export const sendNotification = async message => {
  const nodemailer = await import('nodemailer')

  let transporter = nodemailer.createTransport({
    port: 465,
    host: process.env.MAILER_HOST,
    auth: {
      user: process.env.MAILER_EMAIL,
      pass: process.env.MAILER_PASSWORD
    },
    secure: true
  })

  let mailOptions = {
    from: {
      name: 'Stock',
      address: process.env.MAILER_EMAIL
    },
    to: 'contact@shopia-app.com',
    subject: 'Alerte Stock',
    html: message
  }

  await new Promise((resolve, reject) => {
    // send mail
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        return resolve(info)
      }
    })
  })
}

export const sendPushNotification = async (expoPushToken, data, title = '', order) => {
  if (expoPushToken) {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title || 'Nouvelle Commande à livré',
      body: data,
      data: { order, data }
    }

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    }).catch(() => {})
  }
}

export const sendPushNotificationToUser = async (title, content, shop, company, livreur = '', order = '') => {
  let queryData = {}
  if (shop) {
    const shopIds = shop?.toString()?.split(',')
    queryData.shops = { $in: shopIds }
  }

  if (company) {
    const companyIds = company?.toString()?.split(',')
    queryData.deliveryCompanies = { $in: companyIds }
  }

  if (livreur) {
    const user = await User?.findOne({ _id: livreur })
    if (user && user.pushToken) {
      sendPushNotification(user.pushToken, content, title, order)
    }
  } else {
    const users = await User?.find(queryData)
    console.log(users)
    for (let user of users) {
      sendPushNotification(user.pushToken, content, title, order)
    }
  }
}

export const sendCode1 = (code, phone) => {
  return axios({
    url:
      'https://obitsms.com/api/bulksms?username=kwatahelp@aite-consulting.com&password=lUw2hNjS&sender=ShopIA&destination=' +
      (phone.split('+')?.length > 1 ? phone.split('+')[1] : phone) +
      '&message=Votre code de validation est ' +
      code,
    method: 'get'
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

export const sendSMS = (phone, message) => {
  if (phone && message) {
    return axios
      .post(
        'https://api.camoo.cm/v1/sms.json',
        {
          to: phone,
          from: 'ShopIA',
          message
        },
        {
          headers: {
            'X-Api-Key': 'fcba209fcfddb3',
            'X-Api-Secret': 'f673ea38998be067ae67f979a59b4c23374f747ca497887b571574b1f20c877c',
            'User-Agent': 'CamooSms/ApiClient'
          }
        }
      )
      .then(response => {
        return response
      })
      .catch(error => {
        console.log(error)
      })
  } else {
    return client.messages
      .create({
        body: message,
        messagingServiceSid: 'MG610f8a9a570af52a0b4d5dcdeab223d5',
        to: phone
      })
      .then(message => {
        console.log(message)
      })
      .catch(err => console.log(err))
  }
}
