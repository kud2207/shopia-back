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
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'

// ** Third Party Imports
import DatePicker, { registerLocale } from 'react-datepicker'

// ** Styled Components
import DatePickerWrapper from 'src/@core/styles/libs/react-datepicker'
import { Alert, AlertTitle, Box, CircularProgress, Switch, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import fr from 'date-fns/locale/es'
import { MuiPhone } from 'src/@core/components/phone-tel'
import { updateShop } from 'src/@apiCore/npoints'
import { toast } from 'react-toastify'
import moment from 'moment'
import swal from 'sweetalert'

registerLocale('fr', fr)

const TabAd = ({ cityData }: any) => {
  // ** State
  const { activeShop, setActiveShop, shops, setShops } = useGlobalContext()

  const [load, setLoad] = useState(false)
  const { t } = useTranslation('shop')

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    setLoad(true)
    updateShop(activeShop._id, data)
      .then(response => {
        if (response.status == 200) {
          setActiveShop(response.data.shop)
          setShops(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop]))
          localStorage.setItem(
            'shops',
            JSON.stringify(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop]))
          )

          toast.success(t('success'))
        } else toast.error(t('error'))
      })
      .catch(() => toast.error(t('error')))
      .finally(() => setLoad(false))
  }

  
  return (
    <CardContent sx={{ marginX: 0 }}>
      <form onSubmit={handleSubmit}>
        <Box>
          <Typography variant='h6'>{t('ad_params_title')}</Typography>
          <Typography variant='body2'>{t('ad_text')}</Typography>
        </Box>
        <Grid container spacing={7} mt={4}>
          
        <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type='text'
              label={t('pixel')}
              placeholder={t('pixel').toString()}
              defaultValue={activeShop?.pixelId}
              name='pixelId'
              required
            />
          </Grid>
         
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type='text'
              label={t('ad_token')}
              placeholder={t('ad_token').toString()}
              defaultValue={activeShop?.adToken}
              name='adToken'
              required
            />
          </Grid>
         
          <Grid item xs={12}>
            <Button variant='contained' type='submit' sx={{ marginRight: 3.5 }}>
              {t('save')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Grid>
        </Grid>
      </form>
    </CardContent>
  )
}

export default TabAd
