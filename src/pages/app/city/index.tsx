import { Add, Delete, Edit } from '@mui/icons-material'
import { Autocomplete, Box, Button, Card, CircularProgress, Grid, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import swal from 'sweetalert'
import { useSettings } from 'src/@core/hooks/useSettings'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { deleteCity, getCitiesByCountry, getCountries } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { CityInterface, CountryInterface } from 'src/types'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['city', 'common']))
    }
  }
}

const CountryList = () => {

    const { t, i18n } = useTranslation('city')
    const router = useRouter()
    const { activeShop } = useGlobalContext()
    const { settings } = useSettings()
    const [country, setCountry] = useState<CountryInterface|null>()
    const [cities, setCities] = useState<CityInterface[]>([])
    const [forceReload, setForceReload] = useState<Boolean>(false)
    const [load, setLoad] = useState<Boolean>(false)
    const [countries, setCountries] = useState<CountryInterface[]>([])
    const [openCountry, setOpenCountry] = useState(false)
    const [isLoadingCountry, setIsLoadingCountry] = useState(false)

    useEffect(() => {
        if(activeShop?._id){
            setLoad(true)
            handleGetCities()
        }
    }, [activeShop, forceReload, country])

    const handleGetCities = () => {
        getCitiesByCountry(country?._id)
        .then(response => {
            setCities(response?.data?.data)
        })
        .finally(() => setLoad(false))
        
    }

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

    const handleDeleteCity = (city:CityInterface) => {
        if(city?._id){
            swal({
                title: '',
                text: t('delete_text')+'',
                icon: 'error',
                buttons: [t('cancel')+'', t('delete')+''],
                dangerMode: true
            }).then(willDelete => {
                if (willDelete) {
                    deleteCity(city?._id).then(response => {
                        if (response.status == 200) {
                        setForceReload(!forceReload)
                        toast.success(t('delete_success'))
                        } else toast.error(t('delete_error'))
                    })
                } 
            })
        }
    }

    return (
        <Grid container spacing={6}>
            <Grid item xs={12}>
                <Typography variant='h4'>
                    {t('city_title')}
                </Typography>
            </Grid>
            <Grid item md={6} xs={12}>
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
            <Grid item xs={12} md={6} sx={{display: 'flex', justifyContent: 'flex-end'}}>
                <Button
                    startIcon={<Add />}
                    onClick={() => router.push('city/create/')}
                    size='large'
                    variant='contained'
                    sx={{ textTransform: 'initial' }}
                >
                    {t('add_city')}
                </Button>
            </Grid>
            <Grid item xs={12}>
                <Card className={'responsiveTable-' + settings?.mode}>
                    <Paper sx={{ width: '100%', overflow: 'hidden' }} className={'responsiveTable-' + settings?.mode}>
                        <TableContainer sx={{}}>
                            <Table stickyHeader aria-label='sticky table'>
                                <TableHead>
                                    <TableRow>
                                        {!country?._id &&
                                            <TableCell>
                                                {t('country')}
                                            </TableCell>
                                        }
                                        <TableCell>
                                            {t('city')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            Action
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {load ? (
                                        <TableRow>
                                            <TableCell colSpan={country?._id ? 2 : 3} align='center'>
                                            {' '}
                                            <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                                                <CircularProgress size={40} color='inherit' />
                                            </Box>
                                            </TableCell>
                                        </TableRow>
                                    ): cities.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={country?._id ? 2 : 3} align='center'>
                                                {t('no_element_found')}
                                            </TableCell>
                                        </TableRow>
                                    ): cities.map((city:CityInterface) => (
                                        <TableRow hover key={city?._id}>
                                            {!country?._id && <TableCell> {city?.country[i18n.language || 'fr']} </TableCell>}
                                            <TableCell>
                                                {city?.name}
                                            </TableCell>
                                            <TableCell align='center'>
                                                <Box sx={{display: 'flex', justifyContent: 'center', gap: 4}}> 
                                                    <IconButton onClick={() => router.push(`city/create?id=${city?._id}`)} aria-label="update">
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton aria-label="delete" onClick={() => handleDeleteCity(city)}>
                                                        <Delete sx={{color: 'red'}} />
                                                    </IconButton>
                                            </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Card>
            </Grid>
        </Grid>
    )
}

export default CountryList