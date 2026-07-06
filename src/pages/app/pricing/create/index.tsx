import { Delete } from '@mui/icons-material'
import { Autocomplete, Box, Button, Checkbox, CircularProgress, Grid, IconButton, InputLabel, MenuItem, Paper, TextField, Typography } from '@mui/material'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { createFaq, getCountries, getFaqById, updateFaq } from 'src/@apiCore/npoints'
import { CountryInterface } from 'src/types'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['pricing']))
    }
  }
}

const CreatePricing = () => {
    interface AdvantageInterface {
        fr: string,
        en: string
    }

    const router = useRouter()
    const { t, i18n } = useTranslation('pricing')
    const {id} = router.query
    const [loadBtn, setLoadBtn] = useState(false)
    const [loadFetch, setLoadFetch] = useState(id !== undefined)
    const typeList = ['marchand', 'livreur', 'partenaire']
    const [countries, setCountries] = useState<CountryInterface[]>([])
    const [advantages, setAdvantages] = useState<AdvantageInterface[]>([{fr: '', en: ''}])
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        duration: 0,
        shops: 0,
        type: '',
        country: '',
        isBot: false
    })

    const [error, setError] = useState({
        name: '',
        price: '',
        duration: '',
        shops: '',
        country: '',
        type: ''
    })

    useEffect(() => {
        getCountries()
        .then(response => {
            setCountries(response?.data?.data || [])
        })
    }, [])

    useEffect(() => {
        if (id) {
            setLoadFetch(true)
            // getPricingById(id)
            // .then(response => {   
            //     if (response.status == 200) {
                    
            //     }
            // })
            // .finally(() => setLoadFetch(false))
            setLoadFetch(false)
        }
    }, [id])

    const handleSubmit = (event:any) => {
        event.preventDefault()
        validateForm()
        if(id){
            handleUpdatePricing()
        }else{
            handleCreatePricing()
        }
    }

    const handleInputChange = (event: any) => {
        const { name, value } = event.target
        setFormData({
            ...formData,
            [name]: value
        })
    }

    const verifyNum = (event: any) => {
        const numberRegex = /^[0-9]+$/
        const { name, value } = event.target
        setError({
            ...error,
            [name]: !numberRegex.test(value+'')  ?
             t('number_error') : '' 
        })
    }

    const validateForm = () => {
        const valError:any = {}

        if(!formData.name.trim()){
            valError.name = t('required')
        }
        if(!formData.country.trim()){
            valError.country = t('required')
        }
        if(!formData.type.trim()){
            valError.type = t('required')
        }
        if(!formData.price && formData.price !== 0){
            valError.price = t('required')
        }
        if(!formData.duration && formData.duration !== 0){
            valError.duration = t('required')
        }
        if(!formData.shops && formData.shops !== 0){
            valError.duration = t('required')
        }
    }

    const handleUpdatePricing = () => {
        if(id){
            // setLoadBtn(true)
            // const data = {
                
            // }
            // updatePricing(id, data)
            // .then((response) => {
            //     if(response.status === 200){
            //         toast.success(t('update_success'))
            //         router.back()
            //         } else toast.error(t('update_error'))
            // })
            // .catch(() => toast.error(t('update_error')))
            // .finally(() => setLoadBtn(false))
            setLoadBtn(false)
        }
    }
    
    const handleCreatePricing = () => {
        setLoadBtn(true)
    //     const data = {

    //     }
    //     createPricing(data)
    //     .then(response => {
    //         if (response.status === 201) {
    //             toast.success(t('create_success'))
    //             router.back()
    //         } else toast.error(t('create_error'))
    //   })
    //   .catch(() => toast.error(t('create_error')))
    //   .finally(() => setLoadBtn(false))
      setLoadBtn(false)
    }

    const removeAdvantage = (ind:number) => {
        if(advantages.length > 1) {
            let newAdvantages = advantages.filter((a, i) => i !== ind)
            setAdvantages(newAdvantages)
        }
    }

    const addAdvantage = () => {
        setAdvantages([
            ...advantages,
            {fr: '', en: ''}
        ])
    }

    if (loadFetch)
        return (
        <Grid item xs={12} sx={{ mt: 20 }} display={'flex'} justifyContent={'center'}>
            <CircularProgress size={50} sx={{ ml: 5 }} color='inherit' />
        </Grid>
        )


    return (
        <form onSubmit={handleSubmit}>
            <Paper sx={{ width: '100%', overflow: 'hidden', padding: 15 }} elevation={2}>
                <Typography variant='h4' mb={6}>
                    {id ? t('edit_pricing') : t('add_pricing')}
                </Typography>
                <Grid container spacing={6}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            required
                            fullWidth 
                            label={t('name')}
                            placeholder={t('name_placeholder')+''}
                            name='name'
                            value={formData.name}
                            onChange={handleInputChange}
                            error={Boolean(error.name)}
                            helperText={error.name}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            required
                            fullWidth 
                            label={t('price')}
                            placeholder={t('price_placeholder')+''}
                            name='price'
                            type="number"
                            inputProps={{
                                min: 0,
                                pattern: "[0-9]*"
                            }}
                            value={formData.price}
                            onChange={(e) => {
                                handleInputChange(e)
                                verifyNum(e)
                            }}
                            error={Boolean(error.price)}
                            helperText={error.price}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            required
                            fullWidth 
                            label={t('duration')}
                            placeholder={t('duration_placeholder')+''}
                            name='duration'
                            type="number"
                            inputProps={{
                                min: 0,
                                pattern: "[0-9]*"
                            }}
                            value={formData.duration}
                            onChange={(e) => {
                                handleInputChange(e)
                                verifyNum(e)
                            }}
                            error={Boolean(error.duration)}
                            helperText={error.duration}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            required
                            fullWidth 
                            label={t('shop_num')}
                            name='shops'
                            type="number"
                            inputProps={{
                                min: 0,
                                pattern: "[0-9]*"
                            }}
                            value={formData.shops}
                            onChange={(e) => {
                                handleInputChange(e)
                                verifyNum(e)
                            }}
                            error={Boolean(error.shops)}
                            helperText={error.shops}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            required
                            select
                            fullWidth
                            label={t('country')}
                            placeholder={t('country_placeholder')+''}
                            // value={formData.country}
                            onChange={handleInputChange}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F8FAFC'
                                }
                            }}
                            error={Boolean(error.country)}
                            helperText={error.country}
                        >
                        {countries.map(country => (
                            <MenuItem key={country?._id} value={country?._id}>
                            {country[i18n.language || 'fr']}
                            </MenuItem>
                        ))}
                        </TextField>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Autocomplete
                            disablePortal
                            fullWidth
                            value={formData.type}
                            onChange={(event: any, newValue: null|string) => setFormData({...formData, type: newValue || ''})}
                            options={typeList}
                            renderInput={(params) => 
                                <TextField 
                                    {...params} 
                                    label={t('type')}
                                    required
                                    placeholder={t('type_placeholder')+''} 
                                    error={Boolean(error.type)}
                                    helperText={error.type}
                                />
                            }
                        />
                    </Grid>
                    <Grid item xs={12}>
                      <Grid container spacing={6} style={{padding: 10}}>
                        <Grid item xs={12}>
                          <Typography
                            variant='h4'
                          >
                            {t('advantages')}
                          </Typography>
                        </Grid>
                        {advantages.map(((advantage, i) => (
                            <>
                                <Grid item xs={12} md={5}>
                                    <TextField
                                        required
                                        fullWidth 
                                        label={t('french')}
                                        placeholder={t('french_placeholder')+''}
                                        value={advantage.fr}
                                        onChange={(e) => 
                                            setAdvantages(
                                                advantages.map((a, ind) => 
                                                    ind === i ? 
                                                        {...a , fr: e.target.value} :
                                                        a
                                            ))}
                                    />
                                </Grid>
                                <Grid item xs={12} md={5}>
                                    <TextField
                                        required
                                        fullWidth 
                                        label={t('english')}
                                        placeholder={t('english_placeholder')+''}
                                        value={advantage.en}
                                        onChange={(e) => 
                                            setAdvantages(
                                                advantages.map((a, ind) => 
                                                    ind === i ? 
                                                        {...a , en: e.target.value} :
                                                        a
                                            ))}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={2}>
                                    <IconButton onClick={() => removeAdvantage(i)}>
                                        <Delete sx={{color: 'red'}} />
                                    </IconButton>
                                </Grid>
                            </>
                        )))}
                        <Grid item xs={12}>
                          <Button
                            onClick={() => addAdvantage()}
                            variant='contained'
                          >
                            {t('add_advantage')}
                          </Button>
                        </Grid>
                    </Grid>
                    </Grid>
                    <Grid xs={12} md={12}>
                        <InputLabel>
                            <Checkbox 
                                checked={formData.isBot}
                                onChange={(e) => setFormData({...formData, isBot: e.target.checked})}
                            />
                            {t('include_bot')}?
                        </InputLabel>
                    </Grid>
                </Grid>


                <Box display={'flex'} justifyContent={'flex-end'} mt={6}>
                        <Button
                            type='submit'
                            size='large'
                            variant='contained'
                            disabled={loadBtn}
                            sx={{ textTransform: 'initial' }}
                        >
                            {t('save')}
                            {loadBtn && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
                        </Button>
                    </Box>
            
            </Paper>
        </form>
    )
}

export default CreatePricing