// pages/api/socket.ts 
import { Server } from 'socket.io'
import WebSocket from "ws";
require("events").EventEmitter.defaultMaxListeners = 150;

// Stockage des connexions WebSocket par shopId
const wsConnections = new Map();

function getWsClient(shopId: string) {
  if (!wsConnections.has(shopId)) {
    const ws = new WebSocket("ws://localhost:4000");
    
    ws.on('open', () => {
      console.log(`WebSocket connected for shop: ${shopId}`);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error for shop ${shopId}:`, error);
    });
    
    ws.on('close', () => {
      console.log(`WebSocket closed for shop: ${shopId}`);
      wsConnections.delete(shopId);
    });
    
    wsConnections.set(shopId, ws);
  }
  
  return wsConnections.get(shopId);
}

export default function SocketHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  
  // Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  const io = res.socket.server.io || new Server(res.socket.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true
    }
  });

  if (!res.socket.server.io) {
    res.socket.server.io = io;
  }
  const idShop = req.query.shopId

  const wsClient = getWsClient(idShop);
  if (idShop && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(JSON.stringify({ 
      action: "initUpdate", 
      data: {} 
    }));

  } 

    // Gestionnaire pour les messages du WebSocket
    const messageHandler = (message: WebSocket.Data) => {
      try {
        const response = JSON.parse(message.toString());
          const client = response.client;
        if (response.action === "status" && response.shopId==idShop) { 
            if(client) {
              io.emit('status', {
                qr: client.qr,
                code: client.code,
                status: client.status,
                shopId: response.shopId || idShop
              });
            }
          
        }
        
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
      // Ajouter le gestionnaire pour ce socket
    wsClient.on('message', messageHandler);
  
  io.on('connection', async (socket) => {
    
    const { shopId, phone, checkCode, type } = socket.handshake.auth;
    if (!shopId) {
      socket.emit('error', 'shopId is required');
      socket.disconnect(true);
      return;
    }

    try {
      // Vérifier l'état initial
      socket.on("getQr", async (data) => {
        const { shopId, phone, checkCode, type } = data?.auth;
        wsClient.send(JSON.stringify({ action: "restartShop", data: { shopId, phone, checkCode } })); 
      })
      // Nettoyer à la déconnexion
      socket.on('disconnect', () => {
        wsClient.off('message', messageHandler);
        
        // Fermer le WebSocket si plus aucun socket n'est connecté pour ce shop
        const hasOtherConnections = Array.from(io.sockets.sockets.values())
          .some((s:any) => s.handshake?.auth?.shopId === shopId && s.id !== socket.id);
        
        if (!hasOtherConnections) {
          wsClient.close();
          wsConnections.delete(shopId);
        }
      });

    } catch (error) {
      console.error(`Connection error [shop:${shopId}]`, error);
      socket.emit('error', 'Failed to initialize connection');
      socket.disconnect(true);
    }
  });


  res.end();
}