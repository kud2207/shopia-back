import Campaign from 'src/@apiCore/models/campaign'
import dbConnect from 'src/@apiCore/lib/mongodb'
import axios from 'axios'

function calculerGainMensuel(montant) {
  if (montant < 5000) {
    return 500
  } else if (montant >= 5000 && montant <= 9000) {
    return 1000
  } else if (montant >= 10000 && montant <= 15000) {
    return 1500
  } else if (montant >= 16000 && montant <= 30000) {
    return 2500
  } else {
    return 0 // Si aucun cas ne correspond, par exemple au-delà de 30 000 F
  }
}
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  const {
    query: { id, response, returnContext, hashcode, countryCurrencyCode, amount, referenceNumber },
    method
  } = req
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        if (response == 0 || response == '0') {
          await Campaign.updateOne({ _id: id }, { $set: { status: 'Programmée', isPay: true } })

          return res.status(200).json({ message: 'Paiement effectué avec succès.' })
        } else {
          return res.status(400).json({ message: 'Le paiement a échoué. Veuillez réessayer s’il vous plaît.' })
        }
      } catch (error) {
        console.log('error', error)
        res.status(400).json({ success: false })
      }
      break

    case 'POST':
      try {
        const fields = req.body
        if (fields.response == 0 || fields.response == '0') {
          await Campaign.updateOne({ _id: id }, { $set: { status: 'Programmée', isPay: true } })
          return res.status(200).json({ success: true })
        } else if (fields.cpm_site_id && fields.cpm_trans_id) {
          axios
            .post('https://api-checkout.cinetpay.com/v2/payment/check', {
              apikey: process.env.CINETPAY_API_KEY,
              site_id: fields.cpm_site_id,
              transaction_id: fields.cpm_trans_id
            })
            .then(async responses => {
              const responseData = responses.data?.data

              if (responseData && responseData.status === 'ACCEPTED') {
                await Campaign.updateOne({ _id: id }, { $set: { status: 'Programmée', isPay: true } })
              }
              return res.status(200).json({ success: true })
            })
            .catch(error => {
              console.error('Erreur lors de la requête Cinetpay :', error)
            })
        } else {
          return res.status(400).json({ success: false })
        }
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
