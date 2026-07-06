import dbConnect from 'src/@apiCore/lib/mongodb'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const localStorage = require('node-persist');
import WebSocket from "ws";

let ws = null;

function getWsClient() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ws = new WebSocket("ws://localhost:4000");
  }
  return ws;
}
export default async function bot(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const { method, body } = req
  await dbConnect()
  await localStorage.init({ dir: './storage' });
  const wsClient = getWsClient();

  switch (method) {
    case 'GET':
      try {
        localStorage.setItem(req.query.shopId + '_scan_ok', '')
        localStorage.setItem(req.query.shopId + '_qr_code', '')
        const shopId =req.query.shopId
        if (req.query.shopId) {
            wsClient.on("open", () => {
              wsClient.send(JSON.stringify({ action: "getShopStatus", data: { shopId } }));
            });

            wsClient.on("message", (message) => {
              const response = JSON.parse(message.toString());
              console.log("response", response)
              if (response.action === "getShopStatus") {
                if(response.status != "connected") {
                  wsClient.send(JSON.stringify({ action: "restartShop", data: { shopId, phone: req.query.phone, checkCode: true } }));
                }else {
                  localStorage.setItem(req.query.shopId + '_scan_ok', 'ok')
                }
              }
              if (response.action === "status") {
                const client = response.client
                if(client && client.status=="connected") {
                  localStorage.setItem(req.query.shopId + '_scan_ok', 'ok')
                }
              }
            });
   
        }
        res.status(200).json({ success: true })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      res.status(200).json(body)
      break
    default:
      res.status(200).json(body)
      break
  }
}
