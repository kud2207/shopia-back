import axios from 'axios'

export default async function preview(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  const { method } = req
  switch (method) {
    case 'POST': {
      try {
        const fields = req.body
        console.log(fields)
        const data = await handleDeposit(fields)

        return res.status(200).json({
          success: true,
          data: data
        })
      } catch (error) {
        console.error('Erreur génération token :', error)
        return null
      }

      break
    }

    default:
      res.status(400).json({ success: false })
      break
  }
}


const handleDeposit = async (fields) => {
    // Sinon → on régénère le token
    try {
      const response = await axios({
        url: process.env.PAWA_PAY_API_URL + 'deposits',
        method: 'POST',
        data: fields,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAWA_PAY_API_KEY}` // remplace par tes credentials
        },
      }).catch((error)=> {
        console.error('Erreur  :', error.message)
      })
  
      return response.data
    } catch (error) {
      console.error('Erreur  :', error.message)
      return null
    }
  }