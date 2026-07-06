import { createNotification } from 'src/@apiCore/helpers/createNotifications'

export default async function createNotif(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  if (req.method === 'POST') {
    //Authenticate user
    const data = req.body
    if (data)
      createNotification(
        data.title,
        data.shop,
        data.company,
        data.content,
        data.redirectionLink,
        data.read,
        data.label,
        res.socket.server.io,
        data.driver,
        data.order
      )
  }
}
