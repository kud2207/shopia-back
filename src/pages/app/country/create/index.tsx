import { Box, Button, CircularProgress, Grid, InputLabel, Paper, TextField, Typography } from '@mui/material'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { ReactEventHandler, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { createCountry, getCountryById, updateCountry } from 'src/@apiCore/npoints'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['country', 'common']))
    }
  }
}

const CreateCountry = () => {
    const router = useRouter()
    const { t } = useTranslation('country')
    const [french, setFrench] = useState('')
    const [english, setEnglish] = useState('')
    const [code, setCode] = useState('')
    const [currency, setCurrency] = useState('')
    const [currencyCode, setCurrencyCode] = useState('')
    const {id} = router.query
    const [loadBtn, setLoadBtn] = useState(false)
    const [loadFetch, setLoadFetch] = useState(id !== undefined)

    useEffect(() => {
        if (id) {
        setLoadFetch(true)
        getCountryById(id)
            .then(response => {
            if (response.status == 200) {
                setCode(response?.data?.data?.code)
                setFrench(response?.data?.data?.fr)
                setEnglish(response?.data?.data?.en)
                setCurrency(response?.data?.data?.currency)
                setCurrencyCode(response?.data?.data?.currencyCode)
            }
            })
            .finally(() => setLoadFetch(false))
        }
    }, [id])

    const handleUpdateCountry = (event:any) => {
        event.preventDefault()
        if(id){
            setLoadBtn(true)
            const data = {
                fr: french,
                en: english,
                code,
                currency,
                currencyCode
            }
            updateCountry(id, data)
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
    
    const handleCreateCountry = (event:any) => {
        event.preventDefault()
        setLoadBtn(true)
        const data = {
            fr: french,
            en: english,
            code,
            currency,
            currencyCode
        }
        createCountry(data)
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
        <form onSubmit={id ? handleUpdateCountry : handleCreateCountry}>
            <Paper sx={{ width: '100%', overflow: 'hidden', padding: 15 }} elevation={2}>
                <Typography variant='h4' mb={6}>
                    {id ? t('edit_country') : t('add_country')}
                </Typography>
                <Grid container spacing={6}>
                    <Grid item xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('country_code')}</InputLabel>
                        <TextField
                            required
                            fullWidth 
                            placeholder={t('country_code_placeholder')+''}
                            type='text'
                            name='code'
                            value={code}
                            onChange={e => setCode(e.target.value)}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('french_field')}</InputLabel>
                        <TextField
                            required
                            fullWidth 
                            placeholder={t('french_placeholder')+''}
                            type='text'
                            name='french'
                            value={french}
                            onChange={e => setFrench(e.target.value)}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('english_field')}</InputLabel>
                        <TextField
                            required
                            fullWidth 
                            placeholder={t('english_placeholder')+''}
                            type='text'
                            name='english'
                            value={english}
                            onChange={e => setEnglish(e.target.value)}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('currency')}</InputLabel>
                        <TextField
                            required
                            fullWidth 
                            placeholder={t('currency_placeholder')+''}
                            type='text'
                            name='currency'
                            value={currency}
                            onChange={e => setCurrency(e.target.value)}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('currency_code')}</InputLabel>
                        <TextField
                            required
                            fullWidth 
                            placeholder={t('currency_code_placeholder')+''}
                            type='text'
                            name='currency_code'
                            value={currencyCode}
                            onChange={e => setCurrencyCode(e.target.value)}
                        />
                    </Grid>
                </Grid>
                <Box display={'flex'} justifyContent={'flex-end'} mt={6}>
                        <Button
                            type='submit'
                            size='large'
                            variant='contained'
                            disabled={(!code.trim() || 
                                        !french.trim() || 
                                        !english.trim() || 
                                        !currency?.trim() || 
                                        !currencyCode?.trim() || 
                                        loadBtn
                                    )}
                            sx={{ textTransform: 'initial' }}
                        >
                            {t('save')}
                            {loadBtn && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
                        </Button>
                    </Box>
            
        </Paper></form>
    )
}

export default CreateCountry