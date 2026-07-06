// pages/api/socket.ts
import { Server } from 'socket.io'

export const config = {
  api: {
    bodyParser: false
  }
}

export default function SocketHandler(req: any, res: any) {
  if (res.socket.server.io) {
    res.end()

    return
  }
  const io = new Server(res.socket.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true
    }
  })

  res.socket.server.io = io

  io.on('connect', socket => {
    const { shopId, companyId } = socket.handshake.auth

    if (shopId && (!io.sockets.adapter.rooms.has(shopId) || io.sockets.adapter.rooms.get(shopId) == undefined))
      socket.join(shopId)
    if (companyId && (!io.sockets.adapter.rooms.has(companyId) || io.sockets.adapter.rooms.get(companyId) == undefined))
      socket.join(companyId)

    socket.on('disconnect', async () => {
      console.log('socket disconnect')
    })
  })

  res.end()
}
