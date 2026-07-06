import { Box, Button, CircularProgress, Grid, InputLabel, Paper, TextField, Typography } from '@mui/material'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { createMotif, getMotifById, updateMotif } from 'src/@apiCore/npoints'
import { useSettings } from 'src/@core/hooks/useSettings'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['motif', 'common']))
    }
  }
}

const CreateMotif = () => {
    const router = useRouter()
    const { t } = useTranslation('motif')
    const { id } = router.query
    const [motif, setMotif] = useState('')
    const {settings} = useSettings()
    const [loadBtn, setLoadBtn] = useState(false)
    const [loadFetch, setLoadFetch] = useState(id !== undefined)

    useEffect(() => {
    if (id) {
      setLoadFetch(true)
      getMotifById(id)
        .then(response => {
          if (response.status == 200) {
            setMotif(response?.data?.data?.title)
          }
        })
        .finally(() => setLoadFetch(false))
    }
  }, [id])

    const handleCreateMotif = (event:any) => {
        event.preventDefault()
        setLoadBtn(true)
        createMotif({title: motif})
        .then(response => {
            if (response.status === 201) {
                toast.success(t('create_success'))
                router.back()
            } else toast.error(t('create_error'))
      })
      .catch(() => toast.error(t('create_error')))
      .finally(() => setLoadBtn(false))
    }

    const handleModifyMotif = (event:any) => {
        event.preventDefault()
        if(id && motif.trim()){
            setLoadBtn(true)
            const formData = new FormData()
            formData.append('title', motif)
            updateMotif(id, formData)
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

    if (loadFetch)
        return (
        <Grid item xs={12} sx={{ mt: 20 }} display={'flex'} justifyContent={'center'}>
            <CircularProgress size={50} sx={{ ml: 5 }} color='inherit' />
        </Grid>
        )

    return (
            <form onSubmit={id ? handleModifyMotif : handleCreateMotif}>
                <Typography variant='h4' mb={6}>
                    {id ? t('edit_reason') : t('add_reason')}
                </Typography>
                 <Paper sx={{ width: '100%', overflow: 'hidden', padding: 15 }} elevation={2}>
                    <InputLabel sx={{ mb: 3 }}>{t('motif')}</InputLabel>
                    <TextField
                        required
                        fullWidth 
                        placeholder={t('reason_placeholder')+''}
                        type='text'
                        name='motif'
                        value={motif}
                        onChange={e => setMotif(e.target.value)}
                    />
                    <Box display={'flex'} justifyContent={'flex-end'} mt={6}>
                        <Button
                            type='submit'
                            size='large'
                            variant='contained'
                            disabled={(!motif.trim() || loadBtn)}
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

export default CreateMotif