// ** React Imports
import { ReactNode, useState } from 'react'

// ** MUI Components
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormHelperText from '@mui/material/FormHelperText'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { styled } from '@mui/material/styles'
import MuiCard, { CardProps } from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'
import { useTranslation } from 'next-i18next'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { createPaymentRequest, updatePaymentRequest } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'
import Alert from '@mui/material/Alert'
import { useRouter } from 'next/router'

//import Alert from '@mui/material/Alert'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}

// ** Styled Components
const Card = styled(MuiCard)<CardProps>(({ theme }) => ({
  [theme.breakpoints.up('sm')]: { width: '28rem' }
}))

const defaultHandler = () => {
  return
}

const PaymentRequestForm = ({
  handleActionCompleted = defaultHandler,
  action,
  data,
  paymentList,
  updatePaymentList
}: {
  handleActionCompleted: any
  action: string
  data: any
  paymentList: any
  updatePaymentList: any
}) => {
  const [loading, setLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('')

  const handleChange = (event: SelectChangeEvent) => {
    setPaymentMethod(event.target.value)
  }
  const [serverMsg, setServerMsg] = useState('')
  const { t } = useTranslation('payment_request')
  const router = useRouter()
  const { user } = useGlobalContext()

  const handleSubmitForm = (event: any) => {
    event.preventDefault()
    setIsError(false)
    setIsSuccess(false)
    setServerMsg('')
    if (action == 'CREATE') {
      handleCreate(event)
    } else {
      handleUpdate(event)
    }
  }

  const handleCreate = (event: any) => {
    try {
      const amount = event?.target?.elements['amount'].value
      if (amount < 5 || amount > parseInt(user?.totalAmount || 0)) {
        setIsError(true)
        setServerMsg('not_found')
        return
      }

      setLoading(true)
      if (user && amount && paymentMethod) {
        createPaymentRequest({ amount: amount, paymentMethod: paymentMethod, user: user?._id })
          .then(response => {
            setLoading(false)
            setIsError(response.status != 201)
            setIsSuccess(response.status == 201)
            setServerMsg(response.data.message)
            if (response.status == 201) {
              handleActionCompleted()
              updatePaymentList([...paymentList, response.data.data])
            }
          })
          .catch(err => {
            console.log('error happened during creation ', err?.message)

            setIsError(true)
            setServerMsg(err?.message)
            setLoading(false)
          })
      } else {
        setIsError(true)
        setLoading(false)
        setServerMsg('error_on_filling_field_on_client_side')
      }
      setIsError(true)
    } catch (error: any) {
      setIsError(true)
      setServerMsg(error.message)
    }
  }

  const handleUpdate = (event: any) => {
    const amount = event?.target?.elements['amount'].value
    const paymentMethod = event?.target?.elements['paymentMethod'].value
    if (amount < 5 || amount > parseInt(user?.totalAmount || 0)) {
      setIsError(true)
      setServerMsg('not_found')
      return
    }
    updatePaymentRequest(data?._id, {
      amount: amount,
      paymentMethod: paymentMethod
    })
      .then(response => {
        if (response.status == 200) {
          setIsSuccess(true)
          let newPaymentList = paymentList.map(item => (item._id == data._id ? response.data.data : item))
          updatePaymentList([...newPaymentList])
          handleActionCompleted()
        } else {
          setIsError(true)
        }
        setServerMsg(response?.message)
      })
      .catch(err => {
        console.log('error ', err)
        setIsSuccess(false)
        setIsError(true)
        setServerMsg(err?.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <Box className='content-center'>
      <Card sx={{ zIndex: 1 }}>
        <CardContent sx={{ padding: theme => `${theme.spacing(12, 9, 7)} !important` }}>
          <Box sx={{ mb: 6 }}>
            <Typography variant='body2'>{t('new_request')}</Typography>
          </Box>
          <form autoComplete='off' onSubmit={handleSubmitForm}>
            <InputLabel id='payment-method-helper-label'>{t('label_payment_method')}</InputLabel>
            <Select
              fullWidth
              labelId='payment-method-helper-label'
              id='payment-method'
              name='paymentMethod'
              value={data?.paymentMethod}
              label={t('label_payment_method')}
              onChange={handleChange}
              sx={{ marginBottom: 4 }}
            >
              <MenuItem value={'Momo'}>Momo</MenuItem>
              <MenuItem value={'OM'}>OM</MenuItem>
              <MenuItem value={'Credit card'}>Credit card</MenuItem>
            </Select>
            <FormHelperText sx={{ marginBottom: 4 }}>
              {t('help_text_payment_method')} (min: $5 max: ${user?.totalAmount || 10})
            </FormHelperText>
            <TextField
              fullWidth
              defaultValue={data?.amount}
              type='number'
              name='amount'
              label={t('label_amount')}
              sx={{ marginBottom: 4 }}
              required
            />
            <Box
              sx={{ mb: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
            ></Box>
            <Button type='submit' fullWidth size='large' variant='contained' sx={{ marginBottom: 7 }}>
              {action == 'CREATE' ? t('create') : t('update')}{' '}
              {loading && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
            <Box>
              {isError && serverMsg && (
                <Alert severity='error' sx={{ mb: 4 }}>
                  {t(serverMsg)}
                </Alert>
              )}
              {isSuccess && serverMsg && (
                <Alert severity='success' sx={{ mb: 4 }}>
                  {t(serverMsg)}
                </Alert>
              )}
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}

PaymentRequestForm.getLayout = (page: ReactNode) => <BlankLayout>{page}</BlankLayout>

export default PaymentRequestForm
