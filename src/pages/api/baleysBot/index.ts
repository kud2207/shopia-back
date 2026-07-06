import makeWASocket, {
  AnyMessageContent,
  delay,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  useMultiFileAuthState,
  WAMessageContent,
  WAMessageKey
} from 'baileys'
import { Boom } from '@hapi/boom'
import NodeCache from 'node-cache'
import fs from 'fs'
import P from 'pino'
import readline from 'readline'

export default async function bot(req, res) {
  const { method, body } = req

  // run in main file
  connectToWhatsApp()
  res.status(200).json({ success: true })
}

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('src/bots/wa-logs.txt'))
logger.level = 'trace'

const useStore = !process.argv.includes('--no-store')
const doReplies = process.argv.includes('--do-reply')
const usePairingCode = false

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new NodeCache()

// Read line interface
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = text => new Promise<string>(resolve => rl.question(text, resolve))

// the store maintains the data of the WA connection in memory

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('src/bots/auths/shopia_auth_info')
  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

  const sock = makeWASocket({
    // can provide additional config here
    printQRInTerminal: true,

    auth: {
      creds: state.creds,
      /** caching makes the store faster to send/recv messages */
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true
    // ignore all broadcast messages -- to receive the same
    // comment the line below out
    // shouldIgnoreJid: jid => isJidBroadcast(jid),
    // implement to handle retries & poll updates
  })
  // store?.bind(sock.ev)

  // Pairing code for Web clients
  if (usePairingCode && !sock.authState.creds.registered) {
    // todo move to QR event
    const phoneNumber = '23797350756:39@s.whatsapp.net'
    const code = await sock.requestPairingCode(phoneNumber)
    console.log(`Pairing code: ${code}`)
  }

  sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect, isNewLogin, qr } = update

    if (qr) {
      // Si tu veux juste afficher la valeur brute du QR Code
      console.log('Valeur brute du QR Code:', qr)
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp()
      } else {
        //implement disconnection
      }
    } else if (connection === 'open') {
      console.log('opened connection')
    }
  })

  sock.ev.on('messages.upsert', async m => {
    console.log(JSON.stringify(m, undefined, 2))
    const { messages, type, requestId } = m
    console.log('type', type)

    if (type === 'notify') {
      for (const msg of messages) {
        console.log('replying to', msg.key.remoteJid)
        // await sock.sendMessage(m.messages[0].key.remoteJid!, { text: 'Hello there!' })
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  return sock
}
