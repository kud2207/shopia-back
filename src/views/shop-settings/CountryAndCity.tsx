// ** React Imports
import { useState, useEffect } from 'react'

// ** MUI Imports
import Grid from '@mui/material/Grid'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'

// ** Icons Imports
import { useTranslation } from 'react-i18next'
import { getCitiesByCountry, getCountries } from 'src/@apiCore/npoints'
import { MenuItem } from '@mui/material'
import MultipleSelectChip from 'src/@core/components/multi-select'

const CountryAndCity = (props: any) => {
  const { t, i18n } = useTranslation('common')
  const [countries, setCountries] = useState([])
  const [country, setCountry] = useState<any>(null)
  const [city, setCity] = useState(props.defaultCity)
  const [cities, setCities] = useState([])

  useEffect(() => {
    if (country || props.defaultCountry)
      getCitiesByCountry(country?._id || props.defaultCountry)
        .then(response => {
          if (response.data.success) {
            setCities(response.data.data)
            if (response.data.data.length > 0) setCity(props.defaultCity || response.data.data[0]._id)
          }
        })
        .catch(err => {
          console.log(err)
        })
  }, [country, props.defaultCity, props.defaultCountry])

  useEffect(() => {
    getCountries()
      .then(response => {
        if (response.data.success) {
          setCountries(response.data.data)
          if (!props.defaultCountry) {
            setCountry(response.data.data[0])
            if (props.setCountryCode) props.setCountryCode(response.data.data[0].code)
            if(props.setCountry)props.setCountry(response.data.data[0])
          }
        }
      })
      .catch(err => {
        console.log(err)
      })
  }, [props, props.defaultCountry])

  // Handle input change
  const handleInputChange = (event: any) => {
    const val: any = countries.find((val: any) => val._id == event.target.value)
    setCountry(val)
    if (props.setCountryCode) props.setCountryCode(val?.code)
    if(props.setCountry)props.setCountry(val?._id)
  }

  return (
    <>
      <Grid item xs={12} sm={props.sm || 12} mt={props.mt || 0}>
        <FormControl fullWidth>
          <InputLabel>{t('country')}</InputLabel>
          <Select
            label={t('country')}
            required
            value={country?._id || props.defaultCountry}
            placeholder={`${t('country')}`}
            onChange={handleInputChange}
            name='country'
            disabled={props.disableCountry}
          >
            {countries?.map((country: any) => {
              return (
                <MenuItem key={country?._id} value={country._id}>
                  {country[i18n.language] || country.en}
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
      </Grid>
      {props.isMultipleCity ? (
        <Grid item xs={12} sm={props.sm || 12} mt={props.mt || 0}>
          <FormControl fullWidth>
            <MultipleSelectChip
              name='deliveryCities'
              isCity={true}
              list={cities}
              values={props.values}
              setValues={props.setValues}
            />
          </FormControl>
        </Grid>
      ) : (
        <Grid item xs={12} sm={props.sm || 12} mt={props.mt || 0}>
          <FormControl fullWidth>
            <InputLabel>{t('city')}</InputLabel>
            <Select
              required
              label={t('city')}
              onChange={e => {
                if (props.setValues) props.setValues(e.target.value)
                setCity(e.target.value)
              }}
              value={city}
              placeholder={`${t('city')}`}
              name='city'
            >
              {props.showAll && <MenuItem value=''>{t('all_city')}</MenuItem>}
              {cities?.map((city: any) => {
                return (
                  <MenuItem key={city?._id} value={city._id}>
                    {city.name}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </Grid>
      )}
    </>
  )
}

export default CountryAndCity
