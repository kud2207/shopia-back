import axios from 'axios'

const api = axios.create({
  baseURL: '/api/'
})
const getToken = () => {
  const cookies = document.cookie
  const cookieArray = cookies.split('; ')

  for (let i = 0; i < cookieArray.length; i++) {
    const cookie = cookieArray[i]
    const [name, value] = cookie.split('=')

    if (name === 'token') {
      // Décoder la chaîne en pourcentage
      const decodedValue = decodeURIComponent(value)

      try {
        // Parser la chaîne JSON
        const tokenData = JSON.parse(decodedValue)

        // Retourner la propriété 'token' si elle existe
        return tokenData?.token
      } catch (error) {
        return null
      }
    }
  }

  return null
}

/**
 * Use this  function to send resseting password email to user.
 *
 * @function
 * @param   {string} email  email of the User
 * @param   {string} language  language of the User
 * @return  {object}            response
 */
export const forgotPassword = (email: any, language: string) => {
  return api({
    url: 'forgot',
    method: 'post',
    data: {
      email,
      language
    },
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function to check if reset password token is validate.
 *
 * @function
 * @param   {string} token  email of the User
 * @return  {object}            response
 */
export const verifyToken = (token: string | string[] | undefined) => {
  return api({
    url: 'reset-password/check-token?token=' + token,
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description use this fonction for connexion purpose
 *
 */

export const loginUser = (payload: any) => {
  const data = isNaN(payload.username)
    ? { email: payload.username, password: payload.password }
    : { phone: payload.username, password: payload.password }

  return api({
    url: 'login',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function reset user password.
 *
 * @function
 * @param   {any} data  content new password and token of the User
 * @return  {object}            response
 */
export const resetPassword = (data: any) => {
  return api({
    url: 'reset-password',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function create a user account.
 *
 * @function
 * @param   {any} data  content new user informations
 * @return  {object}            response
 */
export const registerUser = (data: any) => {
  return api({
    url: 'register',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function reset user password.
 *
 * @function
 * @param   {any} data  content current and new password of the User
 * @return  {object}            response
 */
export const updatePassword = (data: any) => {
  return api({
    url: 'update-password',
    method: 'put',
    data: data,
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function to get user shops.
 *
 * @function
 * @return  {object}            response
 */
export const userShops = (role:any) => {
  return api({
    url: 'user-shop?role='+role,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function get all countries.
 *
 * @function
 * @return  {object}            response
 */
export const getCountries = () => {
  return api({
    url: 'country',
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this to get bot qrCode.
 *
 * @function
 * @return  {object}            response
 */
export const getQrCode = (shopId: string) => {
  return api({
    url: 'bot?shopId=' + shopId,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this to check if user scan bot qrCode.
 *
 * @function
 * @return  {object}            response
 */
export const checkQrCodeScan = (shopId: string) => {
  return api({
    url: 'bot/checkqrcode?shopId=' + shopId,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this to update shop.
 *
 * @function
 * @return  {object}            response
 */
export const updateShop = (shopId: string, data: any) => {
  return api({
    url: 'shop/' + shopId,
    method: 'put',
    data: data,

    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function update user account.
 *
 * @function
 * @return  {object}            response
 */
export const updateAccount = (data: any) => {
  return api({
    url: 'update-account',
    method: 'put',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 *
 * @param data @description icii la fonction qui cree une boutique
 * @returns
 */

export const registerShop = (data: any) => {
  return api({
    url: 'shop/create',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function get all category.
 *
 * @function
 * @return  {object}            response
 */
export const getCategories = () => {
  return api({
    url: 'category',
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function get all currency.
 *
 * @function
 * @return  {object}            response
 */
export const getCurrecncies = () => {
  return api({
    url: 'currency',
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function generate description from openai.
 *
 * @function
 * @return  {object}            response
 */
export const generateDescription = async (context: any) => {
  return api({
    url: 'shop/auto-description',
    method: 'post',
    data: { context: context },
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function create product.
 *
 * @function
 * @return  {object}            response
 */
export const createProduct = (data: any) => {
  return api({
    url: 'product',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get an order based on its Id
 */
export const getOrderById = async (id: any) => {
  return api({
    url: 'order/getOneOrder-details/' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get an product based on its Id
 */
export const getProductById = async (id: any) => {
  return api({
    url: 'product/' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of customer
 */
export const getCustomers = async () => {
  return api({
    url: 'user',
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function create order.
 *
 * @function
 * @return  {object}            response
 */
export const createOrder = (data: any) => {
  return api({
    url: 'order',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of orders for a shop
 */
export const getOrders = async (shop_id: any, query: string) => {
  return api({
    url: 'order/shop/' + shop_id + query,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function update product.
 *
 * @function
 * @return  {object}            response
 */
export const updateProduct = (id: string, data: any) => {
  return api({
    url: 'product/' + id,
    method: 'put',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description post an invoice
 */
export const postInvoice = async (data: any) => {
  const payload = {
    shopId: data.shopId,
    salerPersone: data.salesPerson,
    note: data.note,
    thanksgiving: data.thanksgiving,
    userId: data.userId
  }

  return api({
    url: 'invoice/create/',
    method: 'post',
    data: payload,
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description post an invoice
 */
export const getInvoiceByIdShop = async (id: any) => {
  return api({
    url: 'invoice/getOneByShop/' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/* Use this  function update product.
 *
 * @function
 * @return  {object}            response
 */
export const deleteOrderRequest = (id: string) => {
  return api({
    url: 'order/deleteOrder/' + id,
    method: 'delete',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function update product.
 *
 * @function
 * @return  {object}            response
 */
export const updateOrder = (id: string, data: any) => {
  return api({
    url: 'order/' + id,
    method: 'put',
    data: data,
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of currency
 */
export const getCurrencies = async () => {
  return api({
    url: 'currency',
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of users according to orders
 */
export const getOrderUsers = async (shop_id: any, query: string) => {
  return api({
    url: 'order/user/' + shop_id + query,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of products
 */
export const getProducts = async (shop_id: any, query: string) => {
  return api({
    url: `product/${query ? 'shop' : 'list'}/${shop_id + query}`,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/* Use this  function delete product.
 *
 * @function
 * @return  {object}            response
 */
export const deleteProduct = (id: string) => {
  return api({
    url: 'product/delete/' + id,
    method: 'delete',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function create delivery service.
 *
 * @function
 * @param   {FormData} data  data
 * @return  {object}            response
 */
export const createDeliveryService = (data: any) => {
  return api({
    url: 'delivery-service',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get an delivery service based on its Id
 */
export const getDeliveryServiceById = async (id: any) => {
  return api({
    url: 'delivery-service/' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function update delivery service.
 *
 * @function
 * @param   {FormData} data  data
 * @return  {object}            response
 */
export const updateDeliveryService = (id: string, data: any) => {
  return api({
    url: 'delivery-service/' + id,
    method: 'put',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get all cities of country
 */
export const getCitiesByCountry = async (id?: any) => {
  return api({
    url: id ? 'city?country=' + id : 'city',
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get all drivers
 */
export const getDrivers = async (shopId: string, city: string, country: string, type: string, page = 0, limit = 5) => {
  return api({
    url: `driver?shopId=${shopId}&city=${city}&country=${country}&type=${type}&page=${page}&limit=${limit}`,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function add delivery  service to shops.
 *
 * @function
 * @param   {FormData} data  data
 * @return  {object}            response
 */
export const addDeliveryServiceToShop = (data: any) => {
  return api({
    url: 'delivery-service/link',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function add delivery  service to shops.
 *
 * @function
 * @param   {string} shopId  shopId
 * @return  {object}            response
 */
export const getShopServices = (shopId: string) => {
  return api({
    url: 'delivery-service/link?shopId=' + shopId,
    method: 'get',
    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function update delivery service.
 *
 * @function
 * @param   {FormData} data  data
 * @return  {object}            response
 */
export const updateShopDeliveryService = (id: string, data: any) => {
  return api({
    url: 'delivery-service/link/' + id,
    method: 'put',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get all delivies
 */
export const getDelivraryServices = async (id: string, query: any) => {
  return api({
    url: `delivery-service?userId=${id}&query=${query}`,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

export const getShopClientsRequest = async (id: any, query: string) => {
  return api({
    url: 'shop/getShopClients/' + id + query,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get all delivered services
 */
export const getDeliveredServices = async (id: string) => {
  return api({
    url: 'delivery-service/getAllServices?userId=' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of delivered orders
 */
export const getDeliveredOrders = async (query: string) => {
  return api({
    url: 'delivery-service/get_orders/' + query,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of delivered orders
 */
export const getAllStats = async (query: string) => {
  return api({
    url: 'get-all-statistic/' + query,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of delivered orders
 */
export const getAllStatsDelivery = async (query: string) => {
  return api({
    url: 'get-all-statistic/delivery-person/' + query,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of subcription plan
 */
export const getPlans = async (isFree = '') => {
  return api({
    url: 'plan?isFree=' + isFree,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get list of payment request of a pathner
 */
export const getPaymentRequest = async (userId: any, query: string) => {
  return api({
    url: 'payment-request/all/' + userId + query,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get an Payment Request based on it Id
 */
export const getPaymentRequestById = async (id: any) => {
  return api({
    url: 'payment-request/' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/* Use this  function delete product.
 *
 * @function
 * @return  {object}            response
 */
export const deletePaymentRequest = (id: string) => {
  return api({
    url: 'payment-request/delete/' + id,
    method: 'delete',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function create payment request.
 *
 * @function
 * @return  {object}            response
 */
export const createPaymentRequest = (data: any) => {
  return api({
    url: 'payment-request',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function update payment request.
 *
 * @function
 * @return  {object}            response
 */
export const updatePaymentRequest = (id: any, data: any) => {
  return api({
    url: 'payment-request/' + id,
    method: 'put',
    data: data,
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description currency convert
 */
export const currencyConvert1 = async (from: string, to: string, amount: string) => {
  return api({
    url: `currency/convert?from=${from}&to=${to}&amount=${amount}`,
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description currency convert
 */
export const currencyConvert = async (from: string, to: string, amount: string) => {
  return axios
    .get(
      `https://api.currencybeacon.com/v1/convert?from=${from}&to=${to}&amount=${amount}&api_key=tHbtO77QcJ9p2bGgOXh8wuXsExNoSWEt`
    )
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

export const getGeoInfo = () => {
  return axios
    .get('https://ipapi.co/json/')
    .then(response => {
      return response
    })
    .catch(error => {
      console.log(error)
      return error.response
    })
}

/**
 *
 * @param @description get list of notifications by user
 * @returns
 */
export const getUserNotifications = async (userId: any) => {
  return api({
    url: 'notifications/' + userId,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 *
 * @param param @description update notification
 * @returns
 */
export const updateNotification = async ({ idNotif, data }: any) => {
  return api({
    url: 'notifications/updateNotification/' + idNotif,
    method: 'put',
    data: data,
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      console.log(error)
    })
}

/**
 * @description get city by id
 */
export const getCityById = async (id: any) => {
  return api({
    url: 'city/' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @param @description get
 * @returns
 */
export const getPartnerStats = async (userId: any) => {
  return api({
    url: 'get-all-statistic/partner?userId=' + userId,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 *
 * @param param @description update notification
 * @returns
 */
export const handleCreateNotif = async (data: any) => {
  return axios({
    url: 'https://api.shopia-app.com/api/socket/create-notification/',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      console.log(error)
    })
}

/**
 * Use this  function update product.
 *
 * @function
 * @return  {object}            response
 */
export const getOrderActivities = async (id: any): Promise<any> => {
  return api({
    url: 'order/activity/' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      console.log(error)
    })
}

/**
 * @description count order by status orders
 */
export const countOrderStatus = async (shopId: string) => {
  return api({
    url: 'get-all-statistic/countOrder?shopId=' + shopId,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get setting
 */
export const getSetting = async () => {
  return api({
    url: 'setting',
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

export const convertCurrency = (from, to) => {
  const options = { method: 'GET', headers: { accept: 'application/json' } }

  return fetch(`https://api.currencybeacon.com/v1/latest?base=${from}&symbols=${to}&api_key=tHbtO77QcJ9p2bGgOXh8wuXsExNoSWEt`, options)
    .then(response => response.json())
    .then(response => {
      return response?.rates[to]
    })
    .catch(err => console.error(err))
}

export const convertCurrency1 = (from, to) => {
  const options = { method: 'GET', headers: { accept: 'application/json' } }

  return fetch(`https://api.fastforex.io/fetch-one?from=${from}&to=${to}&api_key=423e03f7ac-e925161f01-scgjuk`, options)
    .then(response => response.json())
    .then(response => {
      console.log(response)
      return response?.result[to]
    })
    .catch(err => console.error(err))
}

/**
 * @description get an user based on its Id
 */
export const getUserById = async (id: any) => {
  return api({
    url: 'user?userId=' + id,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description count order by status orders
 */
export const getUsageData = async (userId: string, date: any) => {
  return api({
    url: 'get-all-statistic/usage?userId=' + userId + '&date=' + date,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${getToken()}`
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * @description get faq by type
 */
export const getFaqs = async (type: string) => {
  return api({
    url: 'faq?type=' + type,
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}

/**
 * Use this  function to save user email for newslatter.
 *
 * @function
 * @param   {object} data  email of the User
 * @return  {object}            response
 */
export const saveNewsletter = (data: any) => {
  return api({
    url: 'newsletter',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      return response
    })
    .catch(error => {
      return error.response
    })
}



// Manage Motif

/**
 * Use this  function to create motif.
 *
 * @function
 * @return  {object}            response
 */
export const createMotif = (data: any) => {
  return api({
    url: "motif",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * Use this  function update motif.
 *
 * @function
 * @return  {object}            response
 */
export const updateMotif = (id: any, data: any) => {
  return api({
    url: "motif/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get list of motif
 */
export const getMotifs = async (query = "") => {
  return api({
    url: `motif?${query}`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/* Use this  function delete motif.
 *
 * @function
 * @return  {object}            response
 */
export const deleteMotif = (id: string) => {
  return api({
    url: "motif/" + id,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get an motif based on its Id
 */
export const getMotifById = async (id: any) => {
  return api({
    url: "motif/" + id,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get list of zone
 */
export const getAllMotifs = async () => {
  return api({
    url: `motif/all`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};


/**
 * Use this  function to get user user .
 *
 * @function
 * @return  {object}            response
 */
export const getUserStock = (query: string) => {
  return api({
    url: "stock?" + query,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};



/**
 * Use this  function create user.
 *
 * @function
 * @return  {object}            response
 */
export const createUserStock = (data: any) => {
  return api({
    url: "stock",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.log("error", error);
      return error.response;
    });
};

/**
 * Use this  function update product.
 *
 * @function
 * @return  {object}            response
 */
export const updateUserStock = (id: any, data: any) => {
  return api({
    url: "stock/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};


/**
 * @description get an product based on its Id
 */
export const updateMagazinStock = async (
  id: any,
  userId: string,
  day: string,
) => {
  return api({
    url: "stock/magazin?id=" + id + "&userId=" + userId + "&day=" + day,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};


/**
 * Use this  function to create Zone.
 *
 * @function
 * @return  {object}            response
 */
export const createZone = (data: any) => {
  return api({
    url: "zone",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * Use this  function update zone.
 *
 * @function
 * @return  {object}            response
 */
export const updateZone = (id: any, data: any) => {
  return api({
    url: "zone/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get list of zone
 */
export const getZones = async (query = "") => {
  return api({
    url: `zone?${query}`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/* Use this  function delete zone.
 *
 * @function
 * @return  {object}            response
 */
export const deleteZone = (id: string) => {
  return api({
    url: "zone/" + id,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get an product based on its Id
 */
export const getZoneById = async (id: any) => {
  return api({
    url: "zone/" + id,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get list of zone
 */
export const getAllZones = async () => {
  return api({
    url: `zone/all`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};



/**
 * Use this  function to create User.
 *
 * @function
 * @return  {object}            response
 */
export const createUser = (data: any) => {
  return api({
    url: "users",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

export const createCountry = async (data: any) => {
  return api({
    url: "country",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};
/**
 * Use this  function to delete City
 *
 * @function
 */
export const deleteCity = (id: string) => {
  return api({
    url: "city/" + id,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description Use this  function delete a country.
 *
 */
export const deleteCountry = (id: any) => {
  return api({
    url: "country/" + id,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
}

/**
 * Use this  function get a country.
 *
 * @function
 * @return  {object}            response
 */
export const updateUser = (id: any, data: any) => {
  return api({
    url: "users/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};
export const getCountryById = async (id: any) => {
  return api({
    url: "country/" + id,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * Use this  function update country.
 *
 * @function
 * @return  {object}            response
 */
export const updateCountry = (id: any, data: any) => {
  return api({
    url: "country/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};
/**
 * @description get list of user
 */
export const getUsers = async (query = "") => {
  return api({
    url: `users${query}`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/* Use this  function delete user.
 *
 * @function
 * @return  {object}            response
 */
export const deleteUser = (id: string) => {
  return api({
    url: "users/" + id,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

export const updateCity = (id: any, data: any) => {
  return api({
    url: "city/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/* Use this  function create new country.
 *
 * @function
 * @return  {object}            response
 */
export const createCity = async (data: any) => {
  return api({
    url: "city",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};
/**
 * @description get an user based on its Id
 */
export const getUsersById = async (id: any) => {
  return api({
    url: "users/" + id,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};




// Manage FAQ

/**
 * Use this  function to create motif.
 *
 * @function
 * @return  {object}            response
 */
export const createFaq = (data: any) => {
  return api({
    url: "faqs",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * Use this  function update faq.
 *
 * @function
 * @return  {object}            response
 */
export const updateFaq = (id: any, data: any) => {
  return api({
    url: "faqs/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get list of motif
 */
export const getAllFaqs = async (query = "") => {
  return api({
    url: `faqs?${query}`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/* Use this  function delete motif.
 *
 * @function
 * @return  {object}            response
 */
export const deleteFaq = (id: string) => {
  return api({
    url: "faqs/" + id,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get an motif based on its Id
 */
export const getFaqById = async (id: any) => {
  return api({
    url: "faqs/" + id,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};




// Manage Company adress

/**
 * Use this  function to create motif.
 *
 * @function
 * @return  {object}            response
 */
export const createCompanyService= (data: any) => {
  return api({
    url: "deliveryCompany",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * Use this  function update faq.
 *
 * @function
 * @return  {object}            response
 */
export const updateCompanyService = (id: any, data: any) => {
  return api({
    url: "deliveryCompany/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get list of company Service
 */
export const getCompanyService = async (query = "") => {
  return api({
    url: `deliveryCompany?${query}`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

export const getAllCompanyService = async () => {
  return api({
    url: `deliveryCompany/all`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};


/**
 * @description get an motif based on its Id
 */
export const getCompanyServiceById = async (id: any) => {
  return api({
    url: "deliveryCompany/" + id,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};



/**
 * Use this  function to create motif.
 *
 * @function
 * @return  {object}            response
 */
export const createAddress = (data: any) => {
  return api({
    url: "companyAdress",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * Use this  function update faq.
 *
 * @function
 * @return  {object}            response
 */
export const updateAdress = (id: any, data: any) => {
  return api({
    url: "companyAdress/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get list of motif
 */
export const getAllAdress = async (query = "") => {
  return api({
    url: `companyAdress?${query}`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/* Use this  function delete address.
 *
 * @function
 * @return  {object}            response
 */
export const deleteAdress = (id: string) => {
  return api({
    url: "companyAdress/" + id,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get an motif based on its Id
 */
export const getAddressById = async (id: any) => {
  return api({
    url: "companyAdress/" + id,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};





/**
 * Use this  function to create motif.
 *
 * @function
 * @return  {object}            response
 */
export const createAPricing = (data: any) => {
  return api({
    url: "companyPricing",
    method: "post",
    data: data,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * Use this  function update faq.
 *
 * @function
 * @return  {object}            response
 */
export const updatePricing = (id: any, data: any) => {
  return api({
    url: "companyPricing/" + id,
    method: "put",
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get list of motif
 */
export const getAllPricing = async (query = "") => {
  return api({
    url: `companyPricing?${query}`,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/* Use this  function delete address.
 *
 * @function
 * @return  {object}            response
 */
export const deletePricing = (id: string) => {
  return api({
    url: "companyPricing/" + id,
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};

/**
 * @description get an motif based on its Id
 */
export const getPricingById = async (id: any) => {
  return api({
    url: "companyPricing/" + id,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
  })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      return error.response;
    });
};


