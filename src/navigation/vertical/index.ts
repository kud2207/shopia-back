// ** Icon imports
import ViewDashboardOutline from 'mdi-material-ui/ViewDashboardOutline'
import AccountCogOutline from 'mdi-material-ui/AccountCogOutline'
import StoreCogOutline from 'mdi-material-ui/StoreCogOutline'
import ViewListOutline from 'mdi-material-ui/ViewListOutline'
import CartOutline from 'mdi-material-ui/CartOutline'
import AccountGroupOutline from 'mdi-material-ui/AccountGroupOutline'
import TruckDeliveryOutline from 'mdi-material-ui/TruckDeliveryOutline'
import CurrencyEur from 'mdi-material-ui/CurrencyEur'
import CreditCardCheckOutline from 'mdi-material-ui/CreditCardCheckOutline'
import MapMarkerCheckOutline from 'mdi-material-ui/MapMarkerCheckOutline'
import CheckOutline from 'mdi-material-ui/CheckOutline'
import AccountBoxMultipleOutline from 'mdi-material-ui/AccountBoxMultipleOutline'
import TruckDelivery from 'mdi-material-ui/TruckDelivery'


// ** Type import
import { VerticalNavItemsType } from 'src/@core/layouts/types'
import { Cancel, LocationCity, MapOutlined } from '@mui/icons-material'

const navigation = (role: string): VerticalNavItemsType => {
  const marchand = [
    {
      title: 'dashboard',
      icon: ViewDashboardOutline,
      path: '/app'
    },
    {
      sectionTitle: 'order_section'
    },
    {
      title: 'products',
      icon: ViewListOutline,
      path: '/app/products'
    },
    {
      title: 'orders',
      icon: CartOutline,
      path: '/app/orders'
    },
    {
      title: 'customers',
      icon: AccountBoxMultipleOutline,
      path: '/app/customers'
    },
    {
      sectionTitle: 'settings'
    },
    {
      title: 'users',
      icon: AccountGroupOutline,
      path: '/app/users'
    },
    {
      title: 'delivery_services',
      icon: TruckDelivery,
      path: '/app/shop-services'
    },
    {
      title: 'shop_settings',
      icon: StoreCogOutline,
      path: '/app/shop-settings'
    },
    {
      title: 'billing',
      icon: CreditCardCheckOutline,
      path: '/app/billing'
    },
    {
      title: 'account_settings',
      icon: AccountCogOutline,
      path: '/app/account-settings'
    },
  ]
  const admin = [
    {
      title: 'dashboard',
      icon: ViewDashboardOutline,
      path: '/app'
    },
    {
      sectionTitle: 'order_section'
    },
    {
      title: 'products',
      icon: ViewListOutline,
      path: '/app/products'
    },
    {
      title: 'orders',
      icon: CartOutline,
      path: '/app/orders'
    },
    {
      title: 'customers',
      icon: AccountGroupOutline,
      path: '/app/customers'
    },
    {
      title: 'motifs',
      icon: Cancel,
      path: '/app/motifs'
    },
    {
      title: 'country',
      icon: MapOutlined,
      path: '/app/country'
    },
    {
      title: 'city',
      icon: LocationCity,
      path: '/app/city'
    },
    {
      sectionTitle: 'settings'
    },
    {
      title: 'shop_settings',
      icon: StoreCogOutline,
      path: '/app/shop-settings'
    },
    {
      title: 'payment',
      icon: CurrencyEur,
      path: '/app/payment'
    },
    {
      title: 'delivery_zone',
      icon: MapMarkerCheckOutline,
      path: '/app/zones'
    },
    {
      title: 'motifs',
      icon: CheckOutline,
      path: '/app/motifs'
    },
    {
      title: 'account_settings',
      icon: AccountCogOutline,
      path: '/app/account-settings'
    }
  
  ]
  const livreur = [
    {
      title: 'dashboard',
      icon: ViewDashboardOutline,
      path: '/app'
    },
    {
      title: 'delivery_services',
      icon: TruckDeliveryOutline,
      path: '/app/delivery_services'
    },
    {
      title: 'delivery_orders',
      icon: CartOutline,
      path: '/app/delivery_orders'
    },
    {
      sectionTitle: 'settings'
    },
    {
      title: 'account_settings',
      icon: AccountCogOutline,
      path: '/app/account-settings'
    }
  ]

  const partner = [
    {
      title: 'dashboard',
      icon: ViewDashboardOutline,
      path: '/app'
    },
    {
      title: 'payment',
      icon: CurrencyEur,
      path: '/app/payment'
    },
    {
      sectionTitle: 'settings'
    },
    {
      title: 'account_settings',
      icon: AccountCogOutline,
      path: '/app/account-settings'
    }
  ]

  return role == "livreur" ? livreur : role == "marchand" ? marchand : role == "partenaire" ? partner : role == "admin" ? admin : []
}

export default navigation
