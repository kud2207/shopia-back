import * as React from 'react'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useTranslation } from 'react-i18next'
import moment from 'moment'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { useCookies } from 'react-cookie'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { CircularProgress, styled } from '@mui/material'
import { toast } from 'react-toastify'

interface PaymentProps {
  open: boolean
  setOpen: (type: boolean) => void
  location: any
  taux: any
  item?: any
  refresh: boolean
  setRefresh: (type: boolean) => void
}
const DialogStyled = styled('div')(({ theme }) => ({
  fontSize: '0.875rem',
  textDecoration: 'none',
  color: theme.palette.primary.main
}))

const Payment: React.FC<PaymentProps> = ({ open, setOpen, location, taux, item, refresh, setRefresh }) => {
  const { t, i18n } = useTranslation('common')
  const { user, activeShop, setUser } = useGlobalContext()
  const [cookies, setCookie] = useCookies(['user'])
  const [load, setLoad] = React.useState(false)
  const [step, setStep] = React.useState(item ? 2 : 1)

  const [price, setPrice] = React.useState(item?.price || '')

  const handleClose = () => {
    setOpen(false)
  }

  const handlePayMomo = () => {
    // @ts-ignore
    CinetPay.setConfig({
      apikey: process.env.NEXT_PUBLIC_CINETPAY_API_KEY,
      site_id: process.env.NEXT_PUBLIC_CINETPAY_SITE_ID,
      notify_url: window.location.origin + '/api/verify/' + user?._id
    })
    // @ts-ignore
    CinetPay.getCheckout({
      transaction_id: Math.floor(Math.random() * 100000000).toString(), // YOUR TRANSACTION ID
      amount: item ? (item.price * taux).toFixed(2) : price,
      currency: 'XAF',
      channels: 'ALL',
      description: item ? item?.duration + ' ' + t('ilimite_month') : t('add_credit'),
      customer_name: user?.lastName || user?.name, //Le nom du client
      customer_surname: user?.firstname || user?.name, //Le prenom du client
      customer_email: user?.email || 'contact@shopia.com', //l'email du client
      customer_phone_number: user?.phone, //l'email du client
      customer_address: 'BP 0024', //addresse du client
      customer_city: user?.city?.name || location?.city, // La ville du client
      customer_country: user?.country?.code || location?.country_code || 'CM', // le code ISO du pays
      customer_zip_code: location?.postal || '06510', // code postal
      metadata: item?._id || user?._id + '=>' + (price / taux).toFixed(2)
    })
    // @ts-ignore
    CinetPay.waitResponse(function (data: any) {
      if (data.status == 'REFUSED') {
        setLoad(false)
      } else if (data.status == 'ACCEPTED') {
        if (item) {
          const data = { ...user, plan: item, subscription_date: moment() }
          setUser(data)
          setCookie('user', JSON.stringify(data), {
            path: '/'
          })
        }
        toast.success(t('pay_success'))
        setRefresh(!refresh)
        setOpen(false)
      }
    })
    // @ts-ignore
    CinetPay.onError(function (data: any) {
      console.log(data)
      setLoad(false)
    })
  }

  const createOrder = () => {
    setLoad(true)
    return fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // use the "body" param to optionally pass additional order information
      // like product ids and quantities
      body: JSON.stringify({
        cart: [
          {
            sku: user?._id,
            quantity: 1,
            price: item ? item.price : price / taux
          }
        ]
      })
    })
      .then(response => response.json())
      .then(order => order.id)
      .finally(() => setLoad(false))
  }

  const onApprove = data => {
    setLoad(true)
    return fetch('/api/capture-paypal-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderID: data.orderID,
        userId: user?._id,
        type: item ? 'subscription' : 'credit',
        price: (price / taux).toFixed(2),
        item_id: item?._id,
        credit: item?.credit
      })
    })
      .then(response => response.json())
      .then(orderData => {
        if (orderData && orderData.status == 'COMPLETED') {
          toast.success(t('pay_success'))
          setRefresh(!refresh)
          setOpen(false)
          if (item) {
            const data = { ...user, plan: item, subscription_date: moment() }
            setUser(data)
            setCookie('user', JSON.stringify(data), {
              path: '/'
            })
          }
        } else {
          toast.error(t('error_pay'))
        }
      })
      .finally(() => setLoad(false))
  }

  return (
    <>
      <Dialog
        maxWidth='xs'
        fullWidth
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: 'form',
          onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            setStep(2)
          }
        }}
        className='custom-modale'
      >
        <DialogTitle>{t(item ? 'payment' : 'add_credit')}</DialogTitle>
        <DialogContent>
          {step == 1 && !item ? (
            <>
              <DialogContentText>{t('credit_amount')}</DialogContentText>
              <TextField
                autoFocus
                required
                margin='dense'
                id='name'
                name='price'
                placeholder={t('credit_amount')||""}
                type='number'
                fullWidth
                size='small'
                variant='outlined'
                InputProps={{ inputProps: { min: (5 * taux).toFixed(0) } }}
                onChange={e => setPrice(e.target.value)}
                helperText={'min: ' + (5 * taux).toFixed(0) + ' ' + activeShop?.currency}
              />
            </>
          ) : (
            <>
              <DialogContentText mb={3}>{t('payment_method')}</DialogContentText>
              <Button
                type='button'
                fullWidth
                sx={{ mb: 4 }}
                color='success'
                onClick={() => handlePayMomo()}
                variant='contained'
              >
                {t('momo')}
              </Button>
              <PayPalScriptProvider
                options={{
                  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
                  disableFunding: 'paylater',
                  locale: i18n.language == 'fr' ? 'fr_FR' : 'en_GB'
                }}
              >
                <PayPalButtons
                  onCancel={() => setLoad(false)}
                  createOrder={createOrder}
                  onApprove={onApprove}
                  style={{ layout: 'vertical', color: 'blue' }}
                />
              </PayPalScriptProvider>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {step == 2 && !item ? (
            <Button type='button' disabled={load} color='inherit' onClick={() => setStep(1)} variant='contained'>
              {t('previous')}
              {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          ) : (
            !item && (
              <Button type='submit' variant='contained'>
                {t('next')}
              </Button>
            )
          )}
          <Button onClick={handleClose} color='secondary'>
            {t('cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default Payment
