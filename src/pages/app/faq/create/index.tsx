import { Autocomplete, Box, Button, CircularProgress, Grid, InputLabel, Paper, TextField, Typography } from '@mui/material'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { createFaq, getFaqById, updateFaq } from 'src/@apiCore/npoints'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['faq']))
    }
  }
}

const CreateFaq = () => {
    const router = useRouter()
    const { t } = useTranslation('faq')
    const [titleFr, setTitleFr] = useState('')
    const [titleEn, setTitleEn] = useState('')
    const [contentFr, setContentFr] = useState('')
    const [contentEn, setContentEn] = useState('')
    const [type, setType] = useState<null|string>('')
    const {id} = router.query
    const [loadBtn, setLoadBtn] = useState(false)
    const [loadFetch, setLoadFetch] = useState(id !== undefined)
    const typeList = ['marchand', 'livreur', 'partenaire']

    useEffect(() => {
        if (id) {
            setLoadFetch(true)
            getFaqById(id)
                .then(response => {
                    console.log(response)
                if (response.status == 200) {
                    setTitleFr(response?.data?.data?.title?.fr || '')
                    setTitleEn(response?.data?.data?.title?.en || '')
                    setContentFr(response?.data?.data?.content?.fr || '')
                    setContentEn(response?.data?.data?.content?.en || '')
                    setType(response?.data?.data?.type || '')
                }
                })
                .finally(() => setLoadFetch(false))
        }
    }, [id])

    const handleUpdateFaq = (event:any) => {
        event.preventDefault()
        if(id){
            setLoadBtn(true)
            const data = {
                title: {fr: titleFr, en: titleEn},
                content: {fr: contentFr, en: contentEn},
                type
            }
            const formData = new FormData()
            formData.append('title', JSON.stringify(data.title))
            formData.append('content', JSON.stringify(data.content))
            formData.append('type', type || '')

            updateFaq(id, formData)
            .then((response) => {
                if(response.status === 200){
                    toast.success(t('update_success'))
                    router.back()
                    } else toast.error(t('update_error'))
            })
            .catch(() => toast.error(t('update_error')))
            .finally(() => setLoadBtn(false))
        }
    }
    
    const handleCreateFaq = (event:any) => {
        event.preventDefault()
        setLoadBtn(true)
        const data = {
            title: {fr: titleFr, en: titleEn},
            content: {fr: contentFr, en: contentEn},
            type
        }
        const formData = new FormData()
        formData.append('title', JSON.stringify(data.title))
        formData.append('content', JSON.stringify(data.content))
        formData.append('type', type || '')
        createFaq(formData)
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
        <form onSubmit={id ? handleUpdateFaq : handleCreateFaq}>
            <Paper sx={{ width: '100%', overflow: 'hidden', padding: 15 }} elevation={2}>
                <Typography variant='h4' mb={6}>
                    {id ? t('edit_faq') : t('add_faq')}
                </Typography>
                <Grid container spacing={6}>
                    <Grid item xs={12} md={6}>
                        <InputLabel sx={{ mb: 3 }}>{t('title_french')}</InputLabel>
                        <TextField
                            required
                            fullWidth 
                            placeholder={t('title_fr_placeholder')+''}
                            type='text'
                            name='title_fr'
                            value={titleFr}
                            onChange={e => setTitleFr(e.target.value)}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('title_english')}</InputLabel>
                        <TextField
                            required
                            fullWidth 
                            placeholder={t('title_en_placeholder')+''}
                            type='text'
                            name='title_en'
                            value={titleEn}
                            onChange={e => setTitleEn(e.target.value)}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('content_french')}</InputLabel>
                        <TextField
                            required
                            fullWidth
                            multiline
                            rows={5}
                            placeholder={t('content_fr_placeholder')+''}
                            type='text'
                            name='content_fr'
                            value={contentFr}
                            onChange={e => setContentFr(e.target.value)}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('content_english')}</InputLabel>
                        <TextField
                            required
                            fullWidth
                            multiline
                            rows={5}
                            placeholder={t('content_en_placeholder')+''}
                            type='text'
                            name='content_en'
                            value={contentEn}
                            onChange={e => setContentEn(e.target.value)}
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <InputLabel sx={{ mb: 3 }}>{t('type')}</InputLabel>
                        <Autocomplete
                            disablePortal
                            value={type}
                            onChange={(event: any, newValue: null|string) => setType(newValue)}
                            options={typeList}
                            sx={{ width: 300 }}
                            renderInput={(params) => <TextField {...params} placeholder={t('type_placeholder')+''} />}
                        />
                    </Grid>
                </Grid>
                <Box display={'flex'} justifyContent={'flex-end'} mt={6}>
                        <Button
                            type='submit'
                            size='large'
                            variant='contained'
                            disabled={(!titleEn.trim() || 
                                        !titleFr.trim() || 
                                        !contentEn.trim() || 
                                        !contentFr?.trim() || 
                                        !type?.trim() || 
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

export default CreateFaq