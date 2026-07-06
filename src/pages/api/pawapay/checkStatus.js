import axios from 'axios'

export default async function preview(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  const { method } = req
  switch (method) {
    case 'GET': {
      try {
        const data = await handleCheck(req.query.depositId)
        return res.status(200).json({
          success: true,
          data: data?.data
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


const handleCheck = async (depositId) => {
    // Sinon → on régénère le token
    try {
        console.log(process.env.PAWA_PAY_API_URL + 'deposits/'+depositId)
      const response = await axios({
        url: process.env.PAWA_PAY_API_URL + 'deposits/'+depositId,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAWA_PAY_API_KEY}` // remplace par tes credentials
        },
      })
  
      return response.data
    } catch (error) {
      console.error('Erreur  :', error)
      return null
    }
  }