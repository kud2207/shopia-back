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

const BotConfig = ({ cityData }: any) => {
  // ** State
  const { activeShop, setActiveShop, shops, setShops } = useGlobalContext()
  const [startTime, setStartTime] = useState<Date | null | undefined>(
    activeShop?.startTime ? new Date('01/12/2024 ' + activeShop?.startTime) : null
  )
  const [endTime, setEndTime] = useState<Date | null | undefined>(
    activeShop?.endTime ? new Date('01/12/2024 ' + activeShop?.endTime) : null
  )
  const [notifyPhone, setNotifyPhone] = useState(activeShop?.notifyPhone)
  const [notifyPhone1, setNotifyPhone1] = useState(activeShop?.notifyPhone1)

  const [load, setLoad] = useState(false)
  const [status, setStaus] = useState(activeShop?.active)
  const { t, i18n } = useTranslation('shop')

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    setLoad(true)
    data.append('startTime', startTime ? moment(startTime).format('HH:mm') : '')
    data.append('endTime', endTime ? moment(endTime).format('HH:mm') : '')
    data.append('active', status ? '1' : '0')
    data.append('assistantId', activeShop?.assistantId || '')
    if (activeShop?.isScan) data.append('isScan', '1')
    data.append('name', activeShop?.name)
    data.append(
      'addressFormat',
      `${activeShop?.address}${cityData?.name ? ', ' + cityData?.name : ''}${
        cityData?.ountry?.name ? ', ' + cityData?.country?.name : ''
      }`
    )
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

  const handleDelete = () => {
    swal({
      title: '',
      text: t('delete_bot_text') + '',
      icon: 'error',
      buttons: [t('cancel') + '', t('delete') + ''],
      dangerMode: true
    }).then(willDelete => {
      if (willDelete) {
        const data = new FormData()
        data.append('isScan', '0')
        updateShop(activeShop._id, data)
          .then(response => {
            if (response.status == 200) {
              setActiveShop(response.data.shop)
              setShops(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop]))
              localStorage.setItem(
                'shops',
                JSON.stringify(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop]))
              )

              swal('', t('delete_success') + '', 'success')
            }
          })
          .catch(error => {
            console.log(error)
          })
      }
    })
  }
  useEffect(() => {
    setStartTime(activeShop?.startTime ? new Date('01/12/2024 ' + activeShop?.startTime) : null)
    setEndTime(activeShop?.endTime ? new Date('01/12/2024 ' + activeShop?.endTime) : null)
    setNotifyPhone(activeShop?.notifyPhone)
    setNotifyPhone1(activeShop?.notifyPhone1)

    setStaus(activeShop?.active)
  }, [activeShop])
  
  return (
    <CardContent sx={{ marginX: 0 }}>
      <form onSubmit={handleSubmit}>
        <Box>
          <Typography variant='h6'>{t('bot_params_title')}</Typography>
          <Typography variant='body2'>{t('scan_success')}</Typography>
        </Box>
        <Grid container spacing={7} mt={4}>
          <Grid item xs={12} sm={2}>
            <InputLabel>{t('status')}</InputLabel>
            <FormControlLabel
              control={<Switch defaultChecked={status} color='success' />}
              label={t(status ? 'actif' : 'inactif')}
              onChange={() => setStaus(!status)}
            />
          </Grid>
          <Grid item xs={12} sm={4} mt={3}>
            <FormControl fullWidth>
              <InputLabel>{t('language')}</InputLabel>
              <Select label={t('language')} name='language' defaultValue={activeShop?.language || i18n.language}>
                <MenuItem value='fr'>{t('french')}</MenuItem>
                <MenuItem value='en'>{t('english')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <InputLabel sx={{ mb: 3 }}>{t('time_interval')}</InputLabel>
            <Grid container spacing={7}>
              <Grid item xs={12} sm={6}>
                <DatePickerWrapper>
                  <DatePicker
                    selected={startTime}
                    showFullMonthYearPicker={false}
                    showMonthYearPicker={false}
                    showTimeSelectOnly
                    showTimeSelect
                    locale={i18n?.language}
                    dateFormat='HH:mm'
                    id='account-settings-date'
                    placeholderText='HH:MM'
                    customInput={
                      <TextField required={endTime !== null} name='startTime' fullWidth label={t('between')} />
                    }
                    onChange={(date: Date) => setStartTime(date)}
                    required={endTime !== null}
                  />
                </DatePickerWrapper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePickerWrapper>
                  <DatePicker
                    selected={endTime}
                    showFullMonthYearPicker={false}
                    showMonthYearPicker={false}
                    showTimeSelectOnly
                    showTimeSelect
                    locale={i18n?.language}
                    dateFormat='HH:mm'
                    id='account-settings-date_end'
                    placeholderText='HH:MM'
                    customInput={<TextField required={startTime !== null} fullWidth name='endTime' label={t('and')} />}
                    onChange={(date: Date) => setEndTime(date)}
                    required={startTime !== null}
                  />
                </DatePickerWrapper>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type='number'
              label={t('waiting_time')}
              placeholder='5'
              defaultValue={activeShop?.waitingTime || 5}
              name='waitingTime'
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('response_to')}</InputLabel>
              <Select label={t('response_to')} name='responseTo' defaultValue={activeShop?.responseTo}>
                <MenuItem value='no_contact'>{t('no_contact')}</MenuItem>
                <MenuItem value='all'>{t('all')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <MuiPhone
              value={notifyPhone}
              name='notifyPhone'
              onChange={(phone: any) => setNotifyPhone(phone)}
              label={t('notify_phone')}
              forceDialCode={false}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <MuiPhone
              value={notifyPhone1}
              name='notifyPhone1'
              onChange={(phone: any) => setNotifyPhone1(phone)}
              label={t('notify_phone1')}
              forceDialCode={false}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type='text'
              name='notifyGroup'
              label={t('notify_group')}
              placeholder=''
              defaultValue={activeShop?.notifyGroup}
            />
          </Grid>
         
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type='email'
              name='notifyEmail'
              label={t('notify_email')}
              placeholder=''
              defaultValue={activeShop?.notifyEmail}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant='contained' type='submit' sx={{ marginRight: 3.5 }}>
              {t('save')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Grid>
        </Grid>
      </form>
      <Box mt={10}>
        <Alert severity='error' variant='outlined' sx={{ '& a': { fontWeight: 400 } }}>
          <AlertTitle>{t('delete_bot_title')}</AlertTitle>
          {t('delete_bot_text')}<br />
          <Button color='error' onClick={handleDelete} variant='contained' sx={{ marginRight: 3.5, mt: 10 }}>
            {t('delete')}
          </Button>
        </Alert>
      </Box>
    </CardContent>
  )
}

export default BotConfig
