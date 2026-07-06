import { Add, Delete, Edit } from '@mui/icons-material'
import { Box, Button, Card, CircularProgress, Grid, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import swal from 'sweetalert'
import { useSettings } from 'src/@core/hooks/useSettings'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { deleteCountry, getCountries } from 'src/@apiCore/npoints'
import { useGlobalContext } from 'src/@core/context/globalContext'
import { CountryInterface } from 'src/types'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['country', 'common']))
    }
  }
}

const CountryList = () => {

    const { t } = useTranslation('country')
    const router = useRouter()
    const { activeShop } = useGlobalContext()
    const { settings } = useSettings()
    const [countries, setCountries] = useState<CountryInterface[]>([])
    const [forceReload, setForceReload] = useState<Boolean>(false)
    const [load, setLoad] = useState<Boolean>(false)

    useEffect(() => {
        if(activeShop?._id){
            setLoad(true)
            handleGetCountries()
        }
    }, [activeShop, forceReload])

    const handleGetCountries = () => {
        getCountries()
        .then(response => {
            setCountries(response?.data?.data || [])
        })
        .finally(() => setLoad(false))
    }

    

  const handleDeleteCountry = (country:CountryInterface) => {
    if(country?._id){
        swal({
            title: '',
            text: t('delete_text')+'',
            icon: 'error',
            buttons: [t('cancel')+'', t('delete')+''],
            dangerMode: true
        }).then(willDelete => {
            if (willDelete) {
                deleteCountry(country?._id).then(response => {
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
                    {t('country_title')}
                </Typography>
            </Grid>
            <Grid item xs={12} sx={{display: 'flex', justifyContent: 'flex-end'}}>
                <Button
                    startIcon={<Add />}
                    onClick={() => router.push('country/create/')}
                    size='large'
                    variant='contained'
                    sx={{ textTransform: 'initial' }}
                >
                    {t('add_country')}
                </Button>
            </Grid>
            <Grid item xs={12}>
                <Card className={'responsiveTable-' + settings?.mode}>
                    <Paper sx={{ width: '100%', overflow: 'hidden' }} className={'responsiveTable-' + settings?.mode}>
                        <TableContainer sx={{}}>
                            <Table stickyHeader aria-label='sticky table'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            CODE
                                        </TableCell>
                                        <TableCell>
                                            {t('french')}
                                        </TableCell>
                                        <TableCell>
                                            {t('english')}
                                        </TableCell>
                                        <TableCell>
                                            {t('currency')}
                                        </TableCell>
                                        <TableCell>
                                            {t('currency_code')}
                                        </TableCell>
                                        <TableCell align='center'>
                                            Action
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {load ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align='center'>
                                            {' '}
                                            <Box width={'100%'} height={50} display={'flex'} justifyContent={'center'}>
                                                <CircularProgress size={40} color='inherit' />
                                            </Box>
                                            </TableCell>
                                        </TableRow>
                                    ): countries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align='center'>
                                                {t('no_element_found')}
                                            </TableCell>
                                        </TableRow>
                                    ): countries.map((country:CountryInterface) => (
                                        <TableRow hover>
                                            <TableCell>
                                                {country?.code}
                                            </TableCell>
                                            <TableCell>
                                                {country?.fr}
                                            </TableCell>
                                            <TableCell>
                                                {country?.en}
                                            </TableCell>
                                            <TableCell>
                                                {country?.currency}
                                            </TableCell>
                                            <TableCell>
                                                {country?.currency_code}
                                            </TableCell>
                                            <TableCell align='center'>
                                                <Box sx={{display: 'flex', justifyContent: 'center', gap: 4}}> 
                                                    <IconButton onClick={() => router.push(`country/create?id=${country?._id}`)} aria-label="update">
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton aria-label="delete" onClick={() => handleDeleteCountry(country)}>
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