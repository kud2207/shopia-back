// eslint-disable-next-line @typescript-eslint/no-var-requires
const localStorage = require('node-persist')

export default async function checkqrcode(req, res) {
  const { method } = req
  await localStorage.init({ dir: './storage' })

  if (method == 'GET') {
    let qrCode = await localStorage.getItem(req.query.shopId + '_qr_code')
    let scanOk = await localStorage.getItem(req.query.shopId + '_scan_ok')
    let sessionSave = await localStorage.getItem(req.query.shopId + '_session_save')

    res.status(200).json({ success: true, qrCode, scanOk, sessionSave })
  }
}
