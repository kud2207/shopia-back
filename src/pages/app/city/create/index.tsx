import { Autocomplete, Box, Button, CircularProgress, Grid, InputLabel, Paper, TextField, Typography } from '@mui/material'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { createCity, getCityById, getCountries, updateCity } from 'src/@apiCore/npoints'
import { CountryInterface } from 'src/types'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['city', 'common']))
    }
  }
}


const CreateCity = () => {
    const router = useRouter()
    const { t, i18n } = useTranslation('city')
    const [city, setCity] = useState('')
    const [country, setCountry] = useState<CountryInterface | null>(null)
    const [loadBtn, setLoadBtn] = useState(false)
    const { id } = router.query
    const [countries, setCountries] = useState<CountryInterface[]>([])
    const [openCountry, setOpenCountry] = useState(false)
    const [isLoadingCountry, setIsLoadingCountry] = useState(false)
    const [loadFetch, setLoadFetch] = useState(id !== undefined)

    useEffect(() => {
        if(id) {
            setLoadFetch(true)
            getCityById(id)
            .then(response => {
            if (response.status == 200) {
                console.log(response.data)
                setCountry(response?.data?.data?.country)
                setCity(response?.data?.data?.name)
            }
            })
            .finally(() => setLoadFetch(false))
        }
    }, [id])

    const handleOpenCountry = () => {
        setOpenCountry(true)
        setIsLoadingCountry(true)
        getCountries()
        .then(response => {
            setCountries(response?.data?.data || [])
        })
        .finally(() => setIsLoadingCountry(false))
    }

    const handleCloseCoutry = () => {
        setOpenCountry(false)
        setCountries([])
    }

    const handleUpdateCity = (event:any) => {
        event.preventDefault()
        if(id){
            setLoadBtn(true)
           const data = {
                name: city,
                country: country?._id
            }
            updateCity(id, data)
            .then((response) => {
                console.log(response)
                if(response.status === 200){
                    toast.success(t('update_success'))
                    router.back()
                    } else toast.error(t('update_error'))
            })
            .catch(() => toast.error(t('update_error')))
            .finally(() => setLoadBtn(false))
        }
    }

    const handleCreateCity = (event:any) => {
        event.preventDefault()
        setLoadBtn(true)
        const data = {
            name: city,
            country
        }
        createCity(data)
        .then(response => {
            if (response.status === 201) {
                toast.success(t('create_success'))
                router.back()
            } else toast.error(t('create_error'))
      })
      .catch(() => toast.error(t('create_error')))
      .finally(() => setLoadBtn(false))
    }

    if (loadFetch)
        return (
        <Grid item xs={12} sx={{ mt: 20 }} display={'flex'} justifyContent={'center'}>
            <CircularProgress size={50} sx={{ ml: 5 }} color='inherit' />
        </Grid>
        )

    return (
        <form onSubmit={id ? handleUpdateCity : handleCreateCity}>
            <Paper sx={{ width: '100%', overflow: 'hidden', padding: 15 }} elevation={2}>
                <Typography variant='h4' mb={6}>
                    {id ? t('edit_city') : t('add_city')}
                </Typography>
                <Grid container spacing={6}>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('country')}</InputLabel>
                        <Autocomplete
                            fullWidth
                            open={openCountry}
                            onOpen={handleOpenCountry}
                            onClose={handleCloseCoutry}
                            isOptionEqualToValue={(option, value) => option[i18n.language || 'fr'] === value[i18n.language || 'fr']}
                            getOptionLabel={(option) => option[i18n.language || 'fr']}
                            options={countries}
                            loading={isLoadingCountry}
                            value={country}
                            onChange={(event, newValue) => {
                                setCountry(newValue); 
                            }}
                            renderInput={(params) => (
                                <TextField
                                {...params}
                                placeholder={t('country_placeholder')+''}
                                InputProps={{
                                    /*input: {*/
                                    ...params.InputProps,
                                    endAdornment: (
                                        <React.Fragment>
                                            {isLoadingCountry ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </React.Fragment>
                                    ),
                                    /*},*/
                                }}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('city')}</InputLabel>
                        <TextField
                            required
                            fullWidth 
                            placeholder={t('city_placeholder')+''}
                            type='text'
                            name='city_name'
                            value={city}
                            onChange={e => setCity(e.target.value)}
                        />
                    </Grid>
                </Grid>
                <Box display={'flex'} justifyContent={'flex-end'} mt={6}>
                        <Button
                            type='submit'
                            size='large'
                            variant='contained'
                            disabled={(!city.trim() || country === null || loadBtn)}
                            sx={{ textTransform: 'initial' }}
                        >
                            {t('save')}
                            {loadBtn && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
                        </Button>
                    </Box>
            
        </Paper></form>
    )
}

export default CreateCity