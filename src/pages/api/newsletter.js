import Newsletter from 'src/@apiCore/models/newsletter'
import dbConnect from 'src/@apiCore/lib/mongodb'

export default async function newsletter(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  if (req.method === 'POST') {
    // Get data from your database
    await dbConnect()
    const data = req.body
    if (data && data.email)
      Newsletter.create(data)
        .then(async newsletter => {
          if (!newsletter)
            return res.status(400).json({
              message: 'Newsletter not found !'
            })

          return res.status(201).json({
            message: 'created',
            newsletter
          })
        })
        .catch(err => {
          res.status(400).json({ message: 'errorr', err })
        })
    else res.status(400).json({ message: 'errorr', err })
  }
}
