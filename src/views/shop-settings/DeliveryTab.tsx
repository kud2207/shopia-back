// ** React Imports
import { useState, useEffect } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'

// ** Icons Imports
import { useTranslation } from 'react-i18next'
import swal from 'sweetalert'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { updateShop } from 'src/@apiCore/npoints'
import { Chip, CircularProgress, InputLabel, OutlinedInput } from '@mui/material'
import CountryAndCity from './CountryAndCity'
import { usePlacesWidget } from 'react-google-autocomplete'

const DeliveryTab = () => {
  const { t } = useTranslation('shop')
  const { activeShop, setActiveShop, shops, setShops } = useGlobalContext()!
  const [load, setLoad] = useState(false)
  const [cities, setCities] = useState([])
  const [items, setItems] = useState<string[]>([])
  const [countryCode, setCountryCode] = useState('CM')
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

  const handleDelete = (val: string) => {
    setItems(items.filter(item => item != val))
  }

  const handleAdd = () => {
    const val = materialRef.current?.value || ''
    if (materialRef.current && materialRef.current && val) {
      const newItem = val.split(',')[0]

      // Vérifier si newItem n'est pas déjà dans le tableau items
      if (!items.includes(newItem)) {
        setItems(items.concat([newItem]))
      }
    }
    materialRef.current.value = ''
  }

  useEffect(() => {
    setCities(activeShop?.deliveryCities || [])
    setItems(activeShop?.undeliveryZones || [])
  }, [activeShop])

  const handleSubmit = (event: any) => {
    event.preventDefault()
    setLoad(true)
    const formValues = new FormData()
    formValues.append('deliveryCities', cities.map((item: any) => item._id).toString())
    if (items.length) formValues.append('undeliveryZones', items.toString())

    updateShop(activeShop._id, formValues)
      .then(response => {
        setLoad(false)
        if (response.data.ret) {
          setActiveShop(response.data.shop)
          setShops(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop]))
          localStorage.setItem('shops', JSON.stringify(shops.filter((val: any) => val._id != activeShop._id).concat([response.data.shop])))

          swal('', t('shop_updated') + '', 'success')
        }
      })
      .catch(error => {
        setLoad(false)
        console.log(error)
      })
  }

  return (
    <CardContent>
      <Box>
        <Typography variant='body1'>{t('delivery_configs_text')}</Typography>
      </Box>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={7} mt={1}>
          <CountryAndCity
            sm={6}
            isMultipleCity
            disableCountry
            defaultCountry={activeShop?.country}
            defaultCity={activeShop?.deliveryCities}
            values={cities}
            setValues={setCities}
            setCountryCode={(val: string) => setCountryCode(val)}
          />
          <Grid mt={1} item sm={12} xs={12}>
            <InputLabel>{t('undelivery_zones')}</InputLabel>
            <Typography variant='body2'>{t('undelivery_zones_text')}</Typography>

            {items.map(val => (
              <Chip label={val} sx={{ m: 2 }} key={val} variant='outlined' onDelete={() => handleDelete(val)} />
            ))}
            <Grid mt={5}>
              <OutlinedInput
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

          <Grid item xs={12}>
            <Button type='submit' disabled={!cities.length} variant='contained' sx={{ marginRight: 3.5 }}>
              {t('save')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
            </Button>
          </Grid>
        </Grid>
      </form>
    </CardContent>
  )
}

export default DeliveryTab
