import axios from 'axios'
import mongoose from 'mongoose'
import { createFileStore } from 'src/@apiCore/lib/file-store'
import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const localStorage = require('node-persist')

export default async function preview(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  const { method } = req
  await localStorage.init({ dir: './storage' })
  switch (method) {
    case 'GET': {
      const tokenData = await getPaymentToken()

      res.status(200).json({
        success: true,
        data: tokenData
      })
      break
    }

    default:
      res.status(400).json({ success: false })
      break
  }
}

const getPaymentToken = async () => {
  // Sinon → on régénère le token
  try {
    const response = await axios({
      url: process.env.AFRIBAPAY_API_URL + '/v1/token',
      method: 'POST',
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic base64(${process.env.AFRIBAPAY_API_USER}:${process.env.AFRIBAPAY_API_KEY})` // remplace par tes credentials
      },
      data: ''
    })

    const { access_token, expires_in } = response.data.data

    // Calculer la date d’expiration (maintenant + expires_in secondes)
    const expiryDate = Date.now() + expires_in * 1000

    const newTokenData = { access_token, expiryDate }
    return newTokenData
  } catch (error) {
    console.error('Erreur génération token :', error)
    return null
  }
}
