// ** React Imports
import { createContext, useState, ReactNode, useContext, useEffect } from 'react'
import { useCookies } from 'react-cookie'
import { getUserNotifications, userShops } from 'src/@apiCore/npoints'

export type GlobalContextValue = {
  user: any
  setUser: (updatedUser: any) => void
  shops: any
  setShops: (shops: any) => void
  activeShop: any
  setActiveShop: (shop: any) => void
  notifications: any
  setNotifications: (notifs: any) => void
}

// ** Create Context
export const GlobalContext = createContext<GlobalContextValue>({
  setUser: () => null,
  user: null,
  setShops: () => [],
  shops: [],
  setActiveShop: () => null,
  activeShop: null,
  notifications: [],
  setNotifications: () => []
})

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  // ** State
  const [user, setUser] = useState(null)
  const [shops, setShops] = useState([])
  const [activeShop, setActiveShop] = useState(null)
  const [cookies] = useCookies(['user'])
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (cookies.user) {
      setUser(cookies.user)
      const shopData = localStorage.getItem('shops')
      if (shops.length == 0 && !shopData) {
        userShops(cookies.user?.role).then(response => {
          if (response.status == 200) {
            const shopsData = response.data.data
            setShops(shopsData)
            // localStorage.setItem('shops', JSON.stringify(shopsData))
            if (shopsData.length > 0) {
              const activeShopData = localStorage.getItem('activeShop')
                ? shopsData.find((item: any) => item?._id == localStorage.getItem('activeShop'))
                : shopsData[0]
              setActiveShop(activeShopData)
              localStorage.setItem('activeShop', activeShopData?._id)
            }
          }
        })
      } else if (shopData) {
        const shopsData = JSON.parse(shopData)
        setShops(shopsData)
        localStorage.setItem('shops', JSON.stringify(shopsData))
        if (shopsData.length > 0) {
          const activeShopData = localStorage.getItem('activeShop')
            ? shopsData.find((item: any) => item?._id == localStorage.getItem('activeShop'))
            : shopsData[0]
          setActiveShop(activeShopData || shopsData[0])
          localStorage.setItem('activeShop', activeShopData?._id || shopsData[0]?._id)
        }
      }
      if (notifications.length == 0)
        getUserNotifications(cookies.user?._id)
          .then(response => {
            if (response.data.success) setNotifications(response.data.data)
          })
          .catch((err: any) => {
            console.log(err)
          })
    }
  }, [shops.length])

  return (
    <GlobalContext.Provider
      value={{ user, setUser, shops, setShops, activeShop, setActiveShop, notifications, setNotifications }}
    >
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobalContext = () => useContext(GlobalContext)
