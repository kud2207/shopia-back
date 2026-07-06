// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Select from '@mui/material/Select'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import InputLabel from '@mui/material/InputLabel'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import { usePlacesWidget } from 'react-google-autocomplete'

// ** Third Party Imports
import { registerLocale } from 'react-datepicker'

// ** Styled Components
import { Box, Card, CardHeader, CircularProgress, FormControl, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import fr from 'date-fns/locale/es'
import { createOrder, getOrderUsers, getProducts } from 'src/@apiCore/npoints'
import { toast } from 'react-toastify'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import ProductItem from 'src/views/orders/productItem'
import { MuiPhone } from 'src/@core/components/phone-tel'
import { useRouter } from 'next/router'

registerLocale('fr', fr)

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['order', 'common']))
    }
  }
}

const CreateOrder = () => {
  // ** State
  const { activeShop, user } = useGlobalContext()
  const router = useRouter()
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [devDate, setDevDate] = useState(new Date().toISOString().split('T')[0])
  const [devAddress, setDevAddress] = useState('')
  const { t } = useTranslation('order')
  const [items, setItems] = useState([{ product: '', qty: 1, cost: 0, price: 1 }])
  const [load, setLoad] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [isNewCustomer, setisNewCustomer] = useState(false)
  const country = 'cm'
  const [products, setProducts] = useState([{ price: 0, _id: '' }])
  const [customerData, setCustomerData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  })
  const { ref: materialRef } = usePlacesWidget({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY,
    onPlaceSelected: (place: any) => setDevAddress(place.formatted_address),
    inputAutocompleteValue: 'all',
    options: {
      types: [],
      componentRestrictions: { country },
      strictBounds: false
    }
  })

  const handleAddItem = () => {
    if (products.length > 0) {
      setItems(prevItems => [
        ...prevItems,
        { product: products[0]._id, qty: 1, cost: products[0].price, price: products[0].price }
      ])
    }
  }

  const handleInputChangeItem = (index: number, event: any) => {
    const { name, value } = event.target
    const newItems = [...items]
    if (name === 'qty') {
      const newValue = parseFloat(value as string)
      newItems[index] = {
        ...newItems[index],
        [name]: newValue,
        price: isNaN(newValue) ? 0 : newValue * newItems[index].cost
      }
    } else if (name === 'cost') {
      const newValue = parseFloat(value as string)
      newItems[index] = {
        ...newItems[index],
        price: newValue
      }
    } else {
      const selectedProduct = products.find((product: any) => product._id === value)
      if (selectedProduct) {
        newItems[index] = {
          product: value,
          cost: selectedProduct.price,
          qty: 1,
          price: selectedProduct.price
        }
      }
    }
    setItems(newItems)
  }

  const handleInputChange = (event: any) => {
    const { name, value } = event.target
    setCustomerData({
      ...customerData,
      [name]: value
    })
  }

  const removeItem = (index: number) => {
    if (items.length == 1) return
    setItems(prevItems => prevItems.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (activeShop?._id) {
      getProducts(activeShop._id, '')
        .then(response => {
          if (response.data.success && response.data.data.length > 0) {
            setProducts(response.data.data)
            setItems([
              {
                product: response.data.data[0]._id,
                qty: 1,
                cost: response.data.data[0].price,
                price: response.data.data[0].price
              }
            ])
          }
        })
        .catch(err => {
          console.log(err)
        })

      getOrderUsers(activeShop?._id, '')
        .then(response => {
          if (response.data.success) {
            setCustomers(response.data.data)
          }
        })
        .catch(err => {
          console.log(err)
        })
    }
  }, [activeShop])

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    setLoad(true)

    const data = {
      user: user?._id || null,
      shop: activeShop?._id || null,
      itemList: JSON.stringify(items),
      date: orderDate,
      isNewCustomer: isNewCustomer ? 'Y' : 'N',
      customer: isNewCustomer
        ? JSON.stringify({ ...customerData, name: customerData.last_name + ' ' + customerData.first_name })
        : customerId,
      deliveryInfo: { address: devAddress, date: devDate }
    }

    createOrder(data)
      .then(response => {
        if (response.status == 201) {
          toast.success(t('success'))
          router.push('/app/orders/' + response.data.data._id)
        } else toast.error(t(response.data.message))
      })
      .catch(() => toast.error(t('error')))
      .finally(() => setLoad(false))
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <CardContent sx={{ p: 0 }}>
        <form onSubmit={handleSubmit}>
          <Box>
            <Typography variant='h4'>{t('new_order')}</Typography>
            <Typography variant='body2'>{t('add_title_text')}</Typography>
          </Box>
          <Grid container spacing={7} mt={4}>
            <Grid item xs={12} sm={8}>
              <Card>
                <CardHeader title={t('section1_title')} />
                <CardContent>
                  {items.map((item, index) => (
                    <ProductItem
                      key={index}
                      index={index}
                      item={item}
                      handleInputChange={handleInputChangeItem}
                      handleRemoveItem={removeItem}
                      products={products}
                    />
                  ))}
                  <Button
                    variant='contained'
                    size='small'
                    disabled={load}
                    onClick={handleAddItem}
                    sx={{ marginLeft: 3.5, marginTop: 2 }}
                  >
                    {t('add_product')}
                  </Button>

                  <Grid item xs={12} mt={7} mb={2}>
                    <TextField
                      fullWidth
                      label={t('date')}
                      name='date'
                      type='date'
                      value={orderDate}
                      defaultValue={new Date().toISOString().split('T')[0]} // Format: YYYY-MM-DD
                      onChange={event => setOrderDate(event.target.value)}
                      required
                    />
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ mt: 0 }}>
                <CardHeader title={t('delivery_infos')} />
                <CardContent>
                  <Typography variant='body2' sx={{ mb: 3 }}>
                    {t('Shipping_adress')}
                  </Typography>

                  <TextField
                    onChange={event => setDevAddress(event.target.value)}
                    required
                    fullWidth
                    color='secondary'
                    variant='outlined'
                    inputRef={materialRef}
                    inputProps={{ value: devAddress }}
                  />

                  <Box mt={4} mb={2}>
                    <Typography variant='body2' sx={{ mb: 3 }}>
                      {t('dev_date')}
                    </Typography>
                    <TextField
                      fullWidth
                      label=''
                      placeholder={t('dev_date') + ''}
                      name='dev_date'
                      type='date'
                      value={devDate}
                      defaultValue={new Date().toISOString().split('T')[0]} // Format: YYYY-MM-DD
                      onChange={event => setDevDate(event.target.value)}
                      required
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Card>
                <CardHeader title={t('client_infos')} />
                <CardContent>
                  <Grid mt={2} mb={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isNewCustomer}
                          onChange={() => setisNewCustomer(!isNewCustomer)}
                          color='success'
                        />
                      }
                      label={t('create_new_customer')}
                    />
                  </Grid>

                  {!isNewCustomer && (
                    <Grid item xs={12} mt={5} mb={2}>
                      <FormControl fullWidth>
                        <InputLabel>{t('customer')}</InputLabel>
                        <Select
                          label={t('customer')}
                          placeholder={`${t('customer')}`}
                          value={customerId}
                          onChange={event => setCustomerId(event.target.value)}
                          name='customer'
                          required={!isNewCustomer}
                        >
                          {customers?.map((customer: any) => {
                            return (
                              <MenuItem key={customer?._id} value={customer._id}>
                                {customer?.name}
                              </MenuItem>
                            )
                          })}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  {isNewCustomer && (
                    <Grid container spacing={7}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label={t('first_name')}
                          placeholder='John'
                          name='first_name'
                          value={customerData.first_name}
                          onChange={handleInputChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label={t('last_name')}
                          placeholder='Doe'
                          name='last_name'
                          value={customerData.last_name}
                          onChange={handleInputChange}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label={t('email')}
                          placeholder='example@gmail.com'
                          name='email'
                          value={customerData.email}
                          onChange={handleInputChange}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MuiPhone
                          value={customerData.phone}
                          onChange={(phone: any) => {
                            setCustomerData({ ...customerData, phone })
                          }}
                          label={t('phone')}
                          required
                        />
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Button variant='contained' disabled={load} type='submit' sx={{ marginRight: 3.5 }}>
                {t('create')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Box>
  )
}

export default CreateOrder
