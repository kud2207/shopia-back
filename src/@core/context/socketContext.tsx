// ** React Imports
import { createContext, ReactNode, useContext, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { GlobalContext } from './globalContext'
import axios from 'axios'
import { getUserNotifications } from 'src/@apiCore/npoints'

export type SocketContextValue = {
  socket: any
}

// ** Create Context
export const SocketContext = createContext<SocketContextValue>({
  socket: null
})
export const SocketContextProvider = ({ children }: { children: ReactNode }) => {
  // ** State
  const { user, setNotifications, notifications } = useContext(GlobalContext)
  let socket:any = null
  const audioRef = useRef<HTMLAudioElement>(null)

  const socketInitializer = async () => {
    // We just call it because we don't need anything else out of it
    await axios.get('/api/socket?userId=' + user?._id)

    socket = io()

    socket.on('connect', () => {
      console.log('connected')
    })

    socket.on('new_notification', (newNotif: any) => {
      audioRef?.current?.play()
      getUserNotifications(user?._id)
        .then(response => {
          if (response.data.success) setNotifications(response.data.data)
        })
        .catch((err: any) => {
          console.log(err)
        })
    })

    socket.on('updated_notification', (notif: any) => {
      const notifSet: any[] = []
      notifications.forEach((el: any) => {
        if (el._id == notif._id) {
          el.read = notif.read
        }
        notifSet.push(el)
      })
      setNotifications(notifSet)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected')
    })

    socket.on('connect_error', async (err:any) => {
      await fetch('/api/socket?userId=' + user?._id)
    })
  }

  useEffect(() => {
    if (user) socketInitializer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, notifications])

  return (
    <SocketContext.Provider value={{ socket }}>
      <audio ref={audioRef} src={'/audio/notification.wav'} />
      {children}
    </SocketContext.Provider>
  )
}

export const useGlobalContext = () => useContext(SocketContext)
