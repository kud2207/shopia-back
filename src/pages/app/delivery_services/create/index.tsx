// ** React Imports
import { useEffect, useState } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputLabel from '@mui/material/InputLabel'
import CardContent from '@mui/material/CardContent'

// ** Third Party Imports
import { registerLocale } from 'react-datepicker'

// ** Styled Components
import {
  Box,
  Card,
  CardHeader,
  Chip,
  CircularProgress,
  FormControl,
  MenuItem,
  OutlinedInput,
  Select,
  Typography
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useGlobalContext } from 'src/@core/context/globalContext'
import fr from 'date-fns/locale/es'
import {
  createDeliveryService,
  getCurrecncies,
  getDeliveryServiceById,
  updateDeliveryService
} from 'src/@apiCore/npoints'
import { toast } from 'react-toastify'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import { usePlacesWidget } from 'react-google-autocomplete'
import CountryAndCity from 'src/views/shop-settings/CountryAndCity'

registerLocale('fr', fr)

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['delivery_service', 'common']))
    }
  }
}

const CreateService = () => {
  // ** State
  const { user } = useGlobalContext()
  const [load, setLoad] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [countryCode, setCountryCode] = useState('CM')
  const [service, setService] = useState<any>(null)
  const [currencies, setCurrencies] = useState([])
  const [currency, setCurrency] = useState('XAF')

  const { t, i18n } = useTranslation('delivery_service')
  const router = useRouter()
  const { id }: any = router.query
  const [load1, setLoad1] = useState(id !== undefined)
  const [items, setItems] = useState<string[]>([])
  const { ref: materialRef }: any = usePlacesWidget({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY,
    onPlaceSelected: (place: any) => console.log(place),
    inputAutocompleteValue: 'all',
    options: {
      componentRestrictions: { country: countryCode },
      types: [],
      strictBounds: false
    }
  })

  const handleSubmit = async (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    setLoad(true)
    data.append('user', user?._id)
    data.append('deliveryZonnes', items.toString())
    createDeliveryService(data)
      .then(response => {
        if (response.status == 201) {
          toast.success(t('success'))
          router.back()
        } else toast.error(t('error'))
      })
      .catch(() => toast.error(t('error')))
      .finally(() => setLoad(false))
  }

  const handleDelete = (val: string) => {
    setItems(items.filter(item => item != val))
  }

  const handleAdd = () => {
    const val = materialRef.current?.value || "";
    if (materialRef.current && materialRef.current && val) {
      const newItem = val.split(",")[0];
  
      if (!items.includes(newItem)) {
        setItems(items.concat([newItem]));
      }
    }
    materialRef.current.value = "";
  };

  const handleUpdate = async (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    setLoad(true)
    data.append('user', user?._id)
    data.append('deliveryZonnes', items.toString())
    updateDeliveryService(id, data)
      .then(response => {
        if (response.status == 200) {
          toast.success(t('updated'))
          router.back()
        } else toast.error(t('error_update'))
      })
      .catch(() => toast.error(t('error_update')))
      .finally(() => setLoad(false))
  }

  useEffect(() => {
    if (id) {
      setLoad1(true)
      getDeliveryServiceById(id)
        .then(response => {
          if (response.status == 200) {
            const data = response.data.data
            if (data) {
              setName(data.name)
              setDescription(data.description)
              setItems(data.deliveryZonnes || [])
              if (data.currency) setCurrency(data.currency)
              setService(data)
            }
          }
        })
        .finally(() => setLoad1(false))
    }
  }, [id])

  useEffect(() => {
    getCurrecncies().then(response => {
      if (response.data.success) {
        setCurrencies(response.data.data)
      }
    })
  }, [])

  if (load1)
    return (
      <Grid item xs={12} sx={{ mt: 20 }} display={'flex'} justifyContent={'center'}>
        <CircularProgress size={50} sx={{ ml: 5 }} color='inherit' />
      </Grid>
    )

  return (
    <CardContent>
      <form onSubmit={id ? handleUpdate : handleSubmit}>
        <Box>
          <Typography variant='h4'>{t(id ? 'update' : 'add_title')}</Typography>
          <Typography variant='body2'>{t('add_title_text')}</Typography>
        </Box>
        <Grid container spacing={7} mt={4}>
          <Grid item xs={12} sm={7}>
            <Card>
              <CardHeader title={t('section1_title')} />
              <CardContent>
                <Grid>
                  <InputLabel sx={{ mb: 3 }}>{t('name')}</InputLabel>
                  <TextField
                    required
                    fullWidth
                    type='text'
                    name='name'
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </Grid>

                <Grid mt={5}>
                  <Grid item xs={12} sx={{ mb: 3 }} display={'flex'} justifyContent={'space-between'}>
                    <InputLabel>{t('description')}</InputLabel>
                  </Grid>
                  <TextField
                    rows={3}
                    name='description'
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    fullWidth
                    multiline
                    label=''
                    placeholder={t('description_placeholder') + ''}
                    required
                  />
                </Grid>
                <Grid mt={5}>
                  <Grid sx={{ mb: 3 }} display={'flex'} justifyContent={'space-between'}>
                    <InputLabel>{t('pricing')}</InputLabel>
                  </Grid>
                  <Grid sx={{ mb: 3 }} container spacing={1}>
                    <Grid item sm={4} xs={12} mt={2}>
                      <TextField
                        label={t('min_price')}
                        fullWidth
                        defaultValue={service?.minPrice}
                        type='number'
                        name='minPrice'
                        required
                      />
                    </Grid>
                    <Grid item sm={4} xs={12} mt={2}>
                      <TextField
                        label={t('max_price')}
                        fullWidth
                        defaultValue={service?.maxPrice}
                        type='number'
                        name='maxPrice'
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4} mt={2}>
                      <FormControl fullWidth>
                        <InputLabel>{t('currency')}</InputLabel>
                        <Select
                          label={t('currency')}
                          placeholder={`${t('currency')}`}
                          value={currency}
                          name='currency'
                          fullWidth
                          id='currency'
                          onChange={e => setCurrency(e.target.value)}
                        >
                          {currencies?.map((val: any) => {
                            return (
                              <MenuItem key={val?.code} value={val.code}>
                                {val[i18n.language] || val.en} ({val.code})
                              </MenuItem>
                            )
                          })}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={5}>
            <Card>
              <CardHeader title={t('delivery_address')} />
              <CardContent>
                <CountryAndCity
                  defaultCountry={service?.country || user?.country}
                  mt={4}
                  defaultCity={service?.city}
                  setCountryCode={(val: string) => setCountryCode(val)}
                />

                <Grid mt={5}>
                  <InputLabel>{t('delivery_zones')}</InputLabel>
                  <Typography variant='body2' sx={{ mb: 3 }}>
                    {t('zone_text')}
                  </Typography>

                  {items.map(val => (
                    <Chip label={val} sx={{ m: 2 }} key={val} variant='outlined' onDelete={() => handleDelete(val)} />
                  ))}
                  <Grid mt={5}>
                    <OutlinedInput
                      fullWidth
                      type='text'
                      placeholder={`${t('zone')}`}
                      endAdornment={
                        <Button onClick={handleAdd} variant='text'>
                          {t('add_zone')}
                        </Button>
                      }
                      inputRef={materialRef}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Button variant='contained' disabled={load} type='submit' sx={{ marginRight: 3.5 }}>
              {t(id ? 'update' : 'add')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Grid>
        </Grid>
      </form>
    </CardContent>
  )
}

export default CreateService
